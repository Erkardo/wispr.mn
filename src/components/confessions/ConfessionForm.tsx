'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitConfessionAction } from '@/app/confessions/actions';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"


const FormSchema = z.object({
  text: z.string().min(10, { message: 'Хамгийн багадаа 10 тэмдэгт оруулна уу.' }).max(1000, { message: 'Хамгийн ихдээ 1000 тэмдэгт оруулна уу.' }),
});

export function ConfessionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { text: '' },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSubmitting(true);
    try {
        await submitConfessionAction(data.text);
        toast({
            title: 'Амжилттай!',
            description: "Таны сэтгэлийн үг нийтлэгдлээ.",
        });
        form.reset();
        setOpen(false);
    } catch (e) {
        const error = e as Error;
        toast({
            title: 'Алдаа',
            description: error.message || 'Алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-24 right-6 sm:bottom-6 h-16 w-16 rounded-full soft-shadow bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-transform transform-gpu animate-in fade-in zoom-in-95 will-change-transform">
            <Plus className="h-8 w-8" />
            <span className="sr-only">Шинэ зүйл бичих</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Сэтгэлийн үгээ бичээрэй</DialogTitle>
              <DialogDescription>
                Хэн болохыг тань хэн ч мэдэхгүй. Сэтгэлээ нээгээрэй.
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Нууцхан бодлоо энд бичээрэй..."
                      className="resize-none h-40 bg-secondary/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                 <DialogClose asChild>
                    <Button variant="ghost">Цуцлах</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Нийтлэх
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
