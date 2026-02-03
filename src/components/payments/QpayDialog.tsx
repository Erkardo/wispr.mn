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

interface QPayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  qrImage: string;
  deeplinks: {
    name: string;
    link: string;
    logo: string;
  }[];
}

export function QPayDialog({ isOpen, onClose, qrImage, deeplinks }: QPayDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Төлбөр төлөх</DialogTitle>
          <DialogDescription className="text-center">
            Доорх QR кодыг уншуулах эсвэл өөрийн банкны аппликейшныг сонгож төлбөрөө гүйцэтгэнэ үү.
          </DialogDescription>
        </DialogHeader>

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
          <div className="grid grid-cols-2 gap-2">
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

        <DialogFooter className='!mt-6'>
          <p className="text-xs text-muted-foreground text-center w-full">
            Төлбөр амжилттай хийгдсэний дараа таны hint-ийн эрх автоматаар нэмэгдэх болно.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
