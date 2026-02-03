'use client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  FormLabel
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { submitFeedbackAction } from './actions';

const FormSchema = z.object({
  feedback: z.string().min(10, { message: 'Хамгийн багадаа 10 тэмдэгт оруулна уу.' }).max(1000, { message: 'Хамгийн ихдээ 1000 тэмдэгт оруулна уу.' }),
});

export default function FeedbackPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { feedback: '' },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSubmitting(true);
    try {
      const result = await submitFeedbackAction(data.feedback);
       toast({
        title: 'Амжилттай!',
        description: result.message,
      });
      form.reset();
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
    <>
      <Header title="Санал хүсэлт" />
      <div className="container mx-auto max-w-2xl p-4 py-8">
        <Card>
            <CardHeader>
                <CardTitle>Санал хүсэлт илгээх</CardTitle>
                <CardDescription>Аппликейшнийг сайжруулахад таны санал бидэнд үнэ цэнэтэй. Шинэ санаа, алдааны мэдээлэл, эсвэл зүгээр л сэтгэгдлээ хуваалцаарай.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="feedback"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea
                                    placeholder="Санал хүсэлтээ энд бичнэ үү..."
                                    className="resize-none h-40"
                                    {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Илгээх
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
