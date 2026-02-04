'use server';

import { db } from '@/lib/db';
import { collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Invoice } from '@/types';
import { randomUUID } from 'crypto';

type QPayTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  refresh_expires_in: number;
};

type QPayInvoiceResponse = {
  invoice_id: string; // This is the QPay-generated ID
  qr_text: string;
  qr_image: string; // base64 encoded image
  urls: {
    name: string;
    description: string;
    link: string;
    logo: string;
  }[];
};

type HintPackage = {
  name: string;
  amount: number;
  numHints: number;
};

// In-memory cache for the QPay token
let cachedToken: {
  accessToken: string;
  expiresAt: number; // Expiry time in milliseconds
} | null = null;


async function getQPayToken(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;

  if (!username || !password) {
    console.error('QPay credentials are not set in environment variables. Check your .env file.');
    return null;
  }

  try {
    const res = await fetch('https://merchant.qpay.mn/v2/auth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to get QPay token. Status: ${res.status}, Body: ${errorText}`);
      cachedToken = null; // Clear cache on failure
      return null;
    }

    const data: QPayTokenResponse = await res.json();

    // Cache the new token. We'll refresh it 60 seconds before it actually expires.
    // Handle both duration (seconds) and timestamp (seconds since epoch)
    let expiresAt: number;
    if (data.expires_in > Date.now() / 1000) {
      // It's a timestamp
      expiresAt = (data.expires_in - 60) * 1000;
    } else {
      // It's a duration
      expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    }

    cachedToken = {
      accessToken: data.access_token,
      expiresAt: expiresAt,
    };


    return data.access_token;
  } catch (error) {
    console.error('Error fetching QPay token:', error);
    cachedToken = null; // Clear cache on failure
    return null;
  }
}

export async function createQpayInvoiceAction(
  hintPackage: HintPackage,
  ownerId: string
): Promise<{ qrImage: string; deeplinks: QPayInvoiceResponse['urls']; invoiceId: string; error?: string }> {
  if (!ownerId) {
    return { error: 'Хэрэглэгч нэвтрээгүй байна.', qrImage: '', deeplinks: [], invoiceId: '' };
  }

  const qpayToken = await getQPayToken();
  if (!qpayToken) {
    return { error: 'Төлбөрийн системтэй холбогдож чадсангүй.', qrImage: '', deeplinks: [], invoiceId: '' };
  }

  try {
    const localInvoiceId = randomUUID();

    // 1. Create a "PENDING" invoice in our own database first
    const invoiceRef = await addDoc(collection(db, 'invoices'), {
      ownerId: ownerId,
      status: 'PENDING',
      amount: hintPackage.amount,
      numHints: hintPackage.numHints,
      createdAt: serverTimestamp(),
      localInvoiceId: localInvoiceId,
    } as Omit<Invoice, 'id'>);

    // 2. Define callback URL with the localId to ensure it's returned back to us
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    if (!baseUrl && process.env.NODE_ENV === 'production') {
      console.warn("CRITICAL: APP_URL is not set in production. Webhooks might fail as they will default to localhost.");
    }
    const finalBaseUrl = baseUrl || 'http://localhost:9002';
    const callbackUrl = `${finalBaseUrl}/api/payments/qpay-webhook?localId=${localInvoiceId}`;


    // 3. Create the invoice on QPay's side
    const invoicePayload = {
      invoice_code: process.env.QPAY_INVOICE_CODE,
      sender_invoice_no: localInvoiceId,
      invoice_receiver_code: ownerId,
      invoice_description: `${hintPackage.name} (${hintPackage.numHints} hints)`,
      amount: hintPackage.amount,
      callback_url: callbackUrl,
    };

    const res = await fetch('https://merchant.qpay.mn/v2/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${qpayToken}`,
      },
      body: JSON.stringify(invoicePayload),
    });


    if (!res.ok) {
      const errorBody = await res.json();
      console.error('QPay invoice creation failed:', errorBody);
      // Optionally mark our local invoice as FAILED
      await updateDoc(invoiceRef, { status: 'FAILED' });
      return { error: `Нэхэмжлэл үүсгэхэд алдаа гарлаа: ${errorBody.error_description || res.statusText}`, qrImage: '', deeplinks: [], invoiceId: '' };
    }

    const data: QPayInvoiceResponse = await res.json();

    // 3. Update our local invoice with the QPay-generated ID
    await updateDoc(invoiceRef, { qpayInvoiceId: String(data.invoice_id) });


    return {
      qrImage: data.qr_image,
      deeplinks: data.urls,
      invoiceId: invoiceRef.id,
    };
  } catch (error: any) {
    console.error('Error in createQpayInvoiceAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Тодорхойгүй алдаа гарлаа.';
    return { error: `Дотоод алдаа гарлаа: ${errorMessage}`, qrImage: '', deeplinks: [], invoiceId: '' };
  }
}

