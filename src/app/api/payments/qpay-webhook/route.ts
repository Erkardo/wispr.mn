import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/admin-db';
import { FieldValue } from 'firebase-admin/firestore';
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

  try {
    // USE ADMIN DB
    const db = getAdminDb();
    const invoicesRef = db.collection('invoices');
    let invoiceDocToProcess: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;
    let invoiceIdToProcess: string | null = null;

    // 1. Try to find by QPay ID (qId) 
    if (qId) {
      console.log(`Searching by qpayInvoiceId: ${qId}`);
      // Admin SDK uses .where() chaining
      let snap = await invoicesRef.where('qpayInvoiceId', '==', qId).where('status', '==', 'PENDING').get();

      if (snap.empty && !isNaN(Number(qId))) {
        console.log(`Trying qpayInvoiceId as number: ${Number(qId)}`);
        snap = await invoicesRef.where('qpayInvoiceId', '==', Number(qId)).where('status', '==', 'PENDING').get();
      }

      if (!snap.empty) {
        invoiceDocToProcess = snap.docs[0];
        invoiceIdToProcess = invoiceDocToProcess.id;
        console.log(`Found invoice by qpayInvoiceId: ${invoiceIdToProcess}`);
      }
    }

    // 2. If not found, try finding by Local ID (lId)
    if (!invoiceDocToProcess && lId) {
      console.log(`Searching by localInvoiceId: ${lId}`);
      let snap = await invoicesRef.where('localInvoiceId', '==', lId).where('status', '==', 'PENDING').get();

      if (snap.empty && !isNaN(Number(lId))) {
        console.log(`Trying localInvoiceId as number: ${Number(lId)}`);
        snap = await invoicesRef.where('localInvoiceId', '==', Number(lId)).where('status', '==', 'PENDING').get();
      }

      if (!snap.empty) {
        invoiceDocToProcess = snap.docs[0];
        invoiceIdToProcess = invoiceDocToProcess.id;
        console.log(`Found invoice by localInvoiceId: ${invoiceIdToProcess}`);
      }
    }

    // 3. Last resort: match raw qId against localInvoiceId
    if (!invoiceDocToProcess && qId) {
      console.log(`Searching by localInvoiceId using qId: ${qId}`);
      const snap = await invoicesRef.where('localInvoiceId', '==', qId).where('status', '==', 'PENDING').get();
      if (!snap.empty) {
        invoiceDocToProcess = snap.docs[0];
        invoiceIdToProcess = invoiceDocToProcess.id;
        console.log(`Found invoice by localInvoiceId (using qId match): ${invoiceIdToProcess}`);
      }
    }

    if (!invoiceDocToProcess || !invoiceIdToProcess) {
      console.log(`Invoice NOT FOUND in DB for qId: ${qId}, lId: ${lId}`);
      return { status: 404, error: 'Invoice not found' };
    }

    const batch = db.batch();
    const invoiceData = invoiceDocToProcess.data();

    // Safety check just in case
    if (!invoiceData) return { status: 404, error: 'Invoice data is empty' };

    const invoiceRef = invoicesRef.doc(invoiceIdToProcess);
    const ownerRef = db.collection('complimentOwners').doc(invoiceData.ownerId);

    // Update Invoice
    batch.update(invoiceRef, {
      status: 'PAID',
      paidAt: FieldValue.serverTimestamp(), // Use Admin SDK FieldValue
      qpayPaymentId: qId || null
    });

    // Update Owner Hints
    batch.set(ownerRef, {
      ownerId: invoiceData.ownerId,
      bonusHints: FieldValue.increment(invoiceData.numHints || 0) // Use Admin SDK FieldValue
    }, { merge: true });

    await batch.commit();
    console.log(`SUCCESS: Credited ${invoiceData.numHints} hints to ${invoiceData.ownerId}`);

    return { status: 200, success: true };
  } catch (error: any) {
    console.error("FATAL WEBHOOK ERROR (ADMIN):", error);
    return { status: 500, error: error.message };
  }
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

