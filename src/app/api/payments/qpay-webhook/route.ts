import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collection, query, where, getDocs, writeBatch, increment, doc, serverTimestamp } from 'firebase/firestore';
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
  const qId = payload.invoice_id || payload.qpay_payment_id;
  // QPay sends sender_invoice_no (our local UUID)
  const lId = payload.sender_invoice_no;
  const paymentStatus = payload.payment_status || 'PAID';

  console.log(`Processing - QPayID: ${qId}, LocalID: ${lId}, Status: ${paymentStatus}`);

  if (!qId && !lId) {
    return { status: 400, error: 'Missing identifiers' };
  }

  const invoicesRef = collection(db, 'invoices');
  let invoiceDocToProcess = null;

  // 1. Try to find by QPay ID (qId) first
  if (qId) {
    const q = query(invoicesRef, where('qpayInvoiceId', '==', qId), where('status', '==', 'PENDING'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      invoiceDocToProcess = snap.docs[0];
    }
  }

  // 2. If not found, and we have a Local ID (lId), try finding by that
  if (!invoiceDocToProcess && lId) {
    const q = query(invoicesRef, where('localInvoiceId', '==', lId), where('status', '==', 'PENDING'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      invoiceDocToProcess = snap.docs[0];
    }
  }

  // 3. Fallback: If QPay sent qpay_payment_id but it's not in qpayInvoiceId, 
  // maybe it's actually our localInvoiceId (less likely, but for safety)
  if (!invoiceDocToProcess && qId) {
    const q = query(invoicesRef, where('localInvoiceId', '==', qId), where('status', '==', 'PENDING'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      invoiceDocToProcess = snap.docs[0];
    }
  }

  if (!invoiceDocToProcess) {
    console.log(`Invoice STILL not found: ${qId || lId}`);
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
  console.log(`Successfully credited ${invoiceData.numHints} hints to user ${invoiceData.ownerId}`);

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

