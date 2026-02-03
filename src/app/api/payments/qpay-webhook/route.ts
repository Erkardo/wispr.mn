import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collection, query, where, getDocs, writeBatch, increment, doc, serverTimestamp, limit } from 'firebase/firestore';
import { createHmac } from 'crypto';

/**
 * !!! SECURITY WARNING !!!
 * This is a public endpoint. It is CRITICAL to verify that incoming requests
 * are genuinely from QPay. This is done by verifying the 'qpay-signature' header.
 * 
 * The logic checks for a `QPAY_WEBHOOK_SECRET` in your environment variables.
 * - If the secret IS a Falsy value, it assumes a TESTING environment and bypasses the check.
 * - If the secret IS a Truthy value, it ENFORCES the signature check for production security.
 */
async function verifyQpayRequest(request: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.QPAY_WEBHOOK_SECRET;

  // If the secret is not set, we are in testing/development mode.
  // We'll allow the request but log a strong warning.
  if (!secret) {
    console.warn("QPAY_WEBHOOK_SECRET is not set. Skipping signature verification. FOR TESTING ONLY.");
    return true;
  }

  // In production, a signature must be present.
  const signature = request.headers.get('qpay-signature');
  if (!signature) {
    console.error("QPay webhook signature is missing from the request header.");
    return false;
  }

  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(rawBody);
    const calculatedSignature = hmac.digest('hex');

    if (calculatedSignature !== signature) {
      console.error("Invalid QPay webhook signature.");
      return false;
    }
  } catch (error) {
    console.error("Error during webhook signature verification:", error);
    return false;
  }

  return true;
}


async function processWebhook(payload: any) {
  // QPay might send invoice_id or qpay_payment_id
  const qIdRaw = payload.invoice_id || payload.qpay_payment_id;
  const qId = qIdRaw ? String(qIdRaw) : undefined;

  // QPay sends sender_invoice_no, or we might have it as localId in the URL
  const lIdRaw = payload.sender_invoice_no || payload.localId;
  const lId = lIdRaw ? String(lIdRaw) : undefined;
  const paymentStatus = payload.payment_status || 'PAID';

  console.log(`Processing Webhook - qId: ${qId}, lId: ${lId}, Status: ${paymentStatus}`);

  if (!qId && !lId) {
    return { status: 400, error: 'Missing identifiers' };
  }

  const invoicesRef = collection(db, 'invoices');
  let invoiceDocToProcess = null;

  // DEBUG: List all pending invoices to help identify ID mismatches
  try {
    const debugQuery = query(invoicesRef, where('status', '==', 'PENDING'), limit(10));
    const debugSnap = await getDocs(debugQuery);
    console.log(`Found ${debugSnap.size} pending invoices for debugging:`);
    debugSnap.forEach(d => {
      console.log(` - Doc: ${d.id}, qpayInvoiceId: ${d.data().qpayInvoiceId} (type: ${typeof d.data().qpayInvoiceId}), localInvoiceId: ${d.data().localInvoiceId}`);
    });
  } catch (e) {
    console.error("Debug log failed:", e);
  }

  // 1. Try to find by QPay ID (qId) 
  if (qId) {
    // Try as String
    let q = query(invoicesRef, where('qpayInvoiceId', '==', qId), where('status', '==', 'PENDING'));
    let snap = await getDocs(q);

    // If not found and it looks like a number, try as Number
    if (snap.empty && !isNaN(Number(qId))) {
      console.log(`Trying qpayInvoiceId as number: ${Number(qId)}`);
      q = query(invoicesRef, where('qpayInvoiceId', '==', Number(qId)), where('status', '==', 'PENDING'));
      snap = await getDocs(q);
    }

    if (!snap.empty) {
      invoiceDocToProcess = snap.docs[0];
    }
  }

  // 2. If not found, try finding by Local ID (lId)
  if (!invoiceDocToProcess && lId) {
    let q = query(invoicesRef, where('localInvoiceId', '==', lId), where('status', '==', 'PENDING'));
    let snap = await getDocs(q);

    if (snap.empty && !isNaN(Number(lId))) {
      q = query(invoicesRef, where('localInvoiceId', '==', Number(lId)), where('status', '==', 'PENDING'));
      snap = await getDocs(q);
    }

    if (!snap.empty) {
      invoiceDocToProcess = snap.docs[0];
    }
  }

  // 3. Last resort: match raw qId against localInvoiceId
  if (!invoiceDocToProcess && qId) {
    let q = query(invoicesRef, where('localInvoiceId', '==', qId), where('status', '==', 'PENDING'));
    let snap = await getDocs(q);
    if (!snap.empty) {
      invoiceDocToProcess = snap.docs[0];
    }
  }

  if (!invoiceDocToProcess) {
    console.log(`Invoice NOT FOUND in DB for qId: ${qId}, lId: ${lId}`);
    return { status: 404, error: 'Invoice not found' };
  }

  const batch = writeBatch(db);
  const invoiceData = invoiceDocToProcess.data();
  const invoiceRef = doc(db, 'invoices', invoiceDocToProcess.id);
  const ownerRef = doc(db, 'complimentOwners', invoiceData.ownerId);

  // Update Invoice
  batch.update(invoiceRef, { status: 'PAID', paidAt: serverTimestamp() });

  // Update Owner Hints
  batch.set(ownerRef, {
    ownerId: invoiceData.ownerId,
    bonusHints: increment(invoiceData.numHints)
  }, { merge: true });

  await batch.commit();
  console.log(`SUCCESS: Credited ${invoiceData.numHints} hints to ${invoiceData.ownerId}`);

  return { status: 200, success: true };
}



export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());
  console.log('--- QPay Webhook GET Received ---', params);

  const result = await processWebhook(params);
  return NextResponse.json(result, { status: result.status });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  console.log('--- QPay Webhook POST Received ---');
  console.log('Body:', rawBody);

  try {
    const isVerified = await verifyQpayRequest(req, rawBody);
    if (!isVerified) return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });

    const payload = JSON.parse(rawBody);
    const result = await processWebhook(payload);
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

