'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { doc, onSnapshot } from 'firebase/firestore';
import { CheckCircle2 } from 'lucide-react';

interface QPayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  qrImage: string;
  invoiceId: string;
  onSuccess?: () => void;
  deeplinks: {
    name: string;
    link: string;
    logo: string;
  }[];
}

export function QPayDialog({ isOpen, onClose, qrImage, deeplinks, invoiceId, onSuccess }: QPayDialogProps) {
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');

  useEffect(() => {
    if (!isOpen || !invoiceId || paymentStatus === 'PAID') return;

    const invoiceRef = doc(db, 'invoices', invoiceId);
    const unsubscribe = onSnapshot(invoiceRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().status === 'PAID') {
        setPaymentStatus('PAID');
        // Success feedback remains for 3 seconds, then closes
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 3000);
      }
    });

    return () => unsubscribe();
  }, [isOpen, invoiceId, paymentStatus, onClose, onSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            {paymentStatus === 'PAID' ? 'Төлбөр амжилттай' : 'Төлбөр төлөх'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {paymentStatus === 'PAID'
              ? 'Таны төлбөр амжилттай хийгдлээ. Hint-ийн эрх нэмэгдэж байна...'
              : 'Доорх QR кодыг уншуулах эсвэл өөрийн банкны аппликейшныг сонгож төлбөрөө гүйцэтгэнэ үү.'}
          </DialogDescription>
        </DialogHeader>

        {paymentStatus === 'PAID' ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle2 className="h-16 w-16 text-green-600 animate-bounce" />
            </div>
            <p className="text-lg font-bold text-green-700">Амжилттай!</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center items-center py-4">
              <Image
                src={`data:image/png;base64,${qrImage}`}
                alt="QPay QR Code"
                width={250}
                height={250}
                className="rounded-lg border p-2"
              />
            </div>

            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">Эсвэл эдгээр апп-аар төлөх:</p>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {deeplinks.map((bank, index) => (
                  <Button asChild key={index} variant="outline" className="h-14 flex items-center justify-start gap-3 px-3">
                    <a href={bank.link}>
                      <Image
                        src={bank.logo}
                        alt={bank.name}
                        width={32}
                        height={32}
                        className="rounded-md object-contain"
                        unoptimized
                      />
                      <span className="text-xs font-medium line-clamp-2">{bank.name}</span>
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        <DialogFooter className='!mt-6'>
          <p className="text-xs text-muted-foreground text-center w-full">
            {paymentStatus === 'PAID'
              ? 'Бүх зүйл бэлэн боллоо.'
              : 'Төлбөр амжилттай хийгдсэний дараа таны hint-ийн эрх автоматаар нэмэгдэх болно.'}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

