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


export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // Read the raw body ONCE.
  console.log('--- QPay Webhook Received ---');
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
  console.log('Body:', rawBody);

  try {
    const isVerified = await verifyQpayRequest(req, rawBody);
    console.log('Verification result:', isVerified);

    if (!isVerified) {
      console.error('Webhook verification failed');
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 403 });
    }

    const payload = JSON.parse(rawBody); // Use the raw body for the payload.
    const qpayInvoiceId = payload.invoice_id;
    const senderInvoiceNo = payload.sender_invoice_no;
    const paymentStatus = payload.payment_status; // Should be 'PAID'

    console.log(`Payload QPay ID: ${qpayInvoiceId}, Local ID: ${senderInvoiceNo}, Status: ${paymentStatus}`);

    if ((!qpayInvoiceId && !senderInvoiceNo) || paymentStatus !== 'PAID') {
      console.log('Skipping: Missing IDs or status not PAID');
      return NextResponse.json({ message: 'Awaiting payment or invalid payload' }, { status: 200 });
    }

    // Find the invoice in our database. We try to match either the QPay ID or our local ID.
    const invoicesRef = collection(db, 'invoices');
    let q;

    if (qpayInvoiceId) {
      q = query(invoicesRef, where('qpayInvoiceId', '==', qpayInvoiceId), where('status', '==', 'PENDING'));
    } else {
      q = query(invoicesRef, where('localInvoiceId', '==', senderInvoiceNo), where('status', '==', 'PENDING'));
    }

    const querySnapshot = await getDocs(q);


    if (querySnapshot.empty) {
      console.log(`Webhook received for already processed or non-existent invoice: ${qpayInvoiceId}`);
      return NextResponse.json({ error: 'Invoice not found or already processed' }, { status: 404 });
    }

    const batch = writeBatch(db);
    let successfulUpdate = false;

    querySnapshot.forEach(invoiceDoc => {
      const invoiceData = invoiceDoc.data();
      console.log(`Processing payment for invoice ${invoiceDoc.id}, user ${invoiceData.ownerId}`);

      const invoiceRef = doc(db, 'invoices', invoiceDoc.id);
      const ownerRef = doc(db, 'complimentOwners', invoiceData.ownerId);

      // Update the invoice status to PAID
      batch.update(invoiceRef, { status: 'PAID' });

      // Add the purchased hints to the user's bonus hints
      batch.update(ownerRef, { bonusHints: increment(invoiceData.numHints) });

      successfulUpdate = true;
    });

    if (successfulUpdate) {
      await batch.commit();
      console.log(`Successfully processed payment for QPay invoice: ${qpayInvoiceId}`);
      return NextResponse.json({ success: true, message: 'Payment processed successfully' });
    } else {
      // This case should ideally not be reached if querySnapshot is not empty.
      return NextResponse.json({ error: 'Failed to find a matching pending invoice' }, { status: 500 });
    }

  } catch (error) {
    console.error('QPay Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}
