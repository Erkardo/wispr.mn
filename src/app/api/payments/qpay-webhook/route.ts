import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collection, query, where, getDocs, writeBatch, increment, doc } from 'firebase/firestore';
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
  const qpayInvoiceId = payload.invoice_id;
  const senderInvoiceNo = payload.sender_invoice_no || payload.qpay_payment_id; // QPay might send as qpay_payment_id in GET
  const paymentStatus = payload.payment_status || 'PAID'; // If it's a callback, assume PAID if we got here

  console.log(`Processing - QPay ID: ${qpayInvoiceId}, Local ID: ${senderInvoiceNo}, Status: ${paymentStatus}`);

  if ((!qpayInvoiceId && !senderInvoiceNo) || (paymentStatus !== 'PAID' && paymentStatus !== 'SUCCESS')) {
    return { status: 200, message: 'Awaiting payment or invalid payload' };
  }

  const invoicesRef = collection(db, 'invoices');
  let q;

  if (qpayInvoiceId) {
    q = query(invoicesRef, where('qpayInvoiceId', '==', qpayInvoiceId), where('status', '==', 'PENDING'));
  } else {
    q = query(invoicesRef, where('localInvoiceId', '==', senderInvoiceNo), where('status', '==', 'PENDING'));
  }

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log(`Invoice not found or already processed: ${qpayInvoiceId || senderInvoiceNo}`);
    return { status: 404, error: 'Invoice not found' };
  }

  const batch = writeBatch(db);
  let successfulUpdate = false;

  querySnapshot.forEach(invoiceDoc => {
    const invoiceData = invoiceDoc.data();
    const invoiceRef = doc(db, 'invoices', invoiceDoc.id);
    const ownerRef = doc(db, 'complimentOwners', invoiceData.ownerId);

    batch.update(invoiceRef, { status: 'PAID' });
    batch.set(ownerRef, {
      ownerId: invoiceData.ownerId,
      bonusHints: increment(invoiceData.numHints)
    }, { merge: true });

    successfulUpdate = true;
  });

  if (successfulUpdate) {
    await batch.commit();
    return { status: 200, success: true };
  }
  return { status: 500, error: 'Update failed' };
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

