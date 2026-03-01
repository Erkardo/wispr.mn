import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight, Lock, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitComplimentAction, notifyNewWisprAction } from '@/app/compliments/actions';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import type { HintContext } from '@/types';
import { ComplimentSentSuccess } from './ComplimentSentSuccess';
import { AudioRecorder } from './AudioRecorder';
import { AISuggestionsDialog } from './AISuggestionsDialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';

const getSenderOS = () => {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Win/.test(ua)) return 'Windows';
  return 'Web';
};

const complimentSchema = z.object({
  text: z.string().min(2, "Хамгийн багадаа 2 тэмдэгт бичнэ үү.").max(500, "500 тэмдэгтээс хэтрэхгүй байх хэрэгтэй."),
  frequency: z.string().optional(),
  location: z.string().optional(),
  createOwnLink: z.boolean().default(false),
});

type ComplimentFormValues = z.infer<typeof complimentSchema>;

const frequencyOptions = ["Огт үгүй", "Ховорхон", "Хааяа", "Байнга"];
const locationOptions = ["Сургууль", "Ажил", "Гадаа", "Сошиал", "Онлайн", "Бусад"];

export function ComplimentForm({ ownerId }: { ownerId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<ComplimentFormValues>({
    resolver: zodResolver(complimentSchema),
    defaultValues: {
      text: "",
      frequency: "",
      location: "",
      createOwnLink: false,
    },
  });

  const handleOpenDrawer = async () => {
    const isValid = await form.trigger("text");
    if (isValid) {
      setIsDrawerOpen(true);
    }
  };

  async function onSubmit(data: ComplimentFormValues) {
    if (!ownerId) {
      toast({ title: "Алдаа гарлаа", description: "Хүлээн авагчийн ID олдсонгүй.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitComplimentAction(data.text, audioUrl || undefined, audioDuration);

      if (result.success && (result.filteredText || audioUrl) && firestore) {
        const hintContext: HintContext = {
          frequency: (data.frequency as any) || '',
          location: (data.location as any) || '',
        };
        const complimentsRef = collection(firestore, 'complimentOwners', ownerId, 'compliments');
        const complimentData = {
          ownerId: ownerId,
          text: result.filteredText || '',
          hintContext: hintContext,
          createdAt: serverTimestamp(),
          isRead: false,
          reactions: { '💛': 0, '😄': 0, '✨': 0 },
          senderId: user && !user.isAnonymous ? user.uid : null,
          senderOS: getSenderOS(),
        };

        if (audioUrl) {
          Object.assign(complimentData, { audioUrl, audioDuration });
        }

        const docRef = await addDoc(complimentsRef, complimentData);

        try {
          const ownerDocRef = doc(firestore, 'complimentOwners', ownerId);
          const batchPromises = [
            updateDoc(ownerDocRef, {
              xp: increment(10),
              totalCompliments: increment(1),
            })
          ];

          if (user && !user.isAnonymous) {
            const sentRef = doc(firestore, 'complimentOwners', user.uid, 'sentWisprs', docRef.id);
            batchPromises.push(setDoc(sentRef, {
              receiverId: ownerId,
              complimentId: docRef.id,
              sentAt: serverTimestamp()
            }));
          }

          await Promise.all(batchPromises);
          notifyNewWisprAction(ownerId, complimentData.senderOS, docRef.id).catch(console.error);
        } catch (e) {
          console.error("Follow up updates failed:", e);
        }

        setIsSubmitted(true);
      } else {
        toast({
          title: "Илгээхэд алдаа гарлаа",
          description: result.message || "Дахин оролдоно уу.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Серверийн алдаа",
        description: "Ямар нэг зүйл буруу хуурайшлаа.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return <ComplimentSentSuccess />;
  }

  return (
    <Form {...form}>
      <form id="compliment-form" onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">

        {/* --- Minimal Clean Textarea Block --- */}
        <div className="flex flex-col relative w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="space-y-0 w-full relative">
                <FormControl>
                  <Textarea
                    placeholder="Хэлмээр байсан үгээ энд үлдээгээрэй..."
                    className="resize-none min-h-[160px] max-h-[300px] bg-transparent border-0 focus-visible:ring-0 px-6 py-6 text-[17px] font-medium placeholder-zinc-400 dark:placeholder-zinc-600 overflow-y-auto leading-relaxed shadow-none caret-black dark:caret-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="px-6 pb-2 text-xs font-medium text-red-500" />
              </FormItem>
            )}
          />

          {/* Action Row - Minimalist */}
          <div className="px-4 pb-4 pt-2 w-full flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800/50 bg-[#FAFAFA] dark:bg-[#0A0A0A]">
            <div className="flex items-center justify-between gap-3 w-full px-2">
              <div className="flex-1 max-w-[50%]">
                <AudioRecorder
                  ownerId={ownerId}
                  onAudioReady={(url, duration) => {
                    setAudioUrl(url);
                    setAudioDuration(duration);
                  }}
                  onAudioRemoved={() => {
                    setAudioUrl(null);
                    setAudioDuration(0);
                  }}
                />
              </div>
              <div className="flex-shrink-0">
                <AISuggestionsDialog onSelect={(text) => form.setValue('text', text, { shouldValidate: true })} />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleOpenDrawer}
              className="w-full h-[52px] rounded-[18px] font-semibold text-[15px] bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-md active:scale-[0.98] transition-all group mt-1"
            >
              Үргэлжлүүлэх <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* --- STEP 2: Minimal Drawer (Hints) --- */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 sm:max-w-md mx-auto h-[90vh] md:h-auto rounded-t-[2.5rem]">
            <div className="overflow-y-auto w-full px-5 pt-3 pb-8 h-full">
              <DrawerHeader className="text-left px-0 pb-6 pt-2">
                <DrawerTitle className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  Нэмэлт мэдээлэл өгөх
                </DrawerTitle>
                <DrawerDescription className="text-sm font-medium mt-1">
                  Таны нэр нүүр хуудас <strong className="text-black dark:text-white font-bold">ХЭЗЭЭ Ч</strong> харагдахгүй болно.
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-8 flex-1">

                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="font-semibold text-zinc-800 dark:text-zinc-200 text-[15px] block">Энэ хүнтэй хэр ойрхон харьцдаг вэ?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-2.5"
                        >
                          {frequencyOptions.map(option => (
                            <div key={option}>
                              <RadioGroupItem value={option} id={`freq-${option}`} className="peer sr-only" />
                              <Label
                                htmlFor={`freq-${option}`}
                                className="flex items-center justify-center py-3 px-2 text-[14px] font-semibold rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 peer-data-[state=checked]:border-black dark:peer-data-[state=checked]:border-white peer-data-[state=checked]:bg-black peer-data-[state=checked]:text-white dark:peer-data-[state=checked]:bg-white dark:peer-data-[state=checked]:text-black transition-colors cursor-pointer active:scale-[0.98]"
                              >
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="font-semibold text-zinc-800 dark:text-zinc-200 text-[15px] block">Хаана их харсан бэ?</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {locationOptions.map(option => (
                          <Button
                            key={option}
                            type="button"
                            variant="outline"
                            onClick={() => form.setValue('location', form.watch('location') === option ? '' : option, { shouldValidate: true })}
                            className={`rounded-2xl border text-[14px] font-semibold transition-colors h-11 px-5 ${form.watch('location') === option ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black hover:border-black dark:hover:border-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black' : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                {(!user || user.isAnonymous) && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-3xl flex flex-col items-start gap-4">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-zinc-400" />
                      <h4 className="font-semibold text-[15px] text-zinc-900 dark:text-white">Та өөрөө линктэй болох уу?</h4>
                    </div>
                    <p className="text-[13px] text-zinc-500 font-medium leading-relaxed">Дахин сануулахад, бид таныг хэн болохыг илгээгчид хэлэхгүй.</p>

                    <Button asChild variant="outline" className="w-full h-12 rounded-2xl bg-white dark:bg-zinc-950 font-semibold mt-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                      <Link href="/create">Өөрийн линкээ үүсгэх</Link>
                    </Button>
                  </div>
                )}
              </div>

              <DrawerFooter className="px-0 pt-8 mt-auto">
                <Button
                  type="submit"
                  form="compliment-form"
                  className="w-full h-[56px] rounded-[20px] font-bold text-[16px] bg-black text-white dark:bg-white dark:text-black hover:opacity-90 shadow-lg active:scale-[0.98] transition-all relative overflow-hidden flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Илгээх <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-1.5 mt-4 opacity-50">
                  <Lock className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Your secret is safe</p>
                </div>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </form>
    </Form>
  );
}
