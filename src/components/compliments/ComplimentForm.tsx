import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight, Lock, Send, ShieldCheck, Sparkles } from 'lucide-react';
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
import { useUser, useFirestore, useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<ComplimentFormValues>({
    resolver: zodResolver(complimentSchema),
    defaultValues: { text: "", frequency: "", location: "", createOwnLink: false },
  });

  const handleOpenDrawer = async () => {
    const isValid = await form.trigger("text");
    if (isValid) setIsDrawerOpen(true);
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Амжилттай холбогдлоо!", description: "Wispr-ээ үргэлжлүүлэн илгээнэ үү." });
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') return;
      let description = 'Нэвтрэхэд алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.';
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        description = 'Popup цонхыг хаалаа. Popup зөвшөөрлөө шалгаад дахин оролдоно уу.';
      }
      console.error('Google sign-in error:', error);
      toast({ title: "Алдаа гарлаа", description, variant: "destructive" });
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
        const hintContext: HintContext = { frequency: (data.frequency as any) || '', location: (data.location as any) || '' };
        const complimentsRef = collection(firestore, 'complimentOwners', ownerId, 'compliments');
        const complimentData = {
          ownerId,
          text: result.filteredText || '',
          hintContext,
          createdAt: serverTimestamp(),
          isRead: false,
          reactions: { '💛': 0, '😄': 0, '✨': 0 },
          senderId: user && !user.isAnonymous ? user.uid : null,
          senderOS: getSenderOS(),
        };
        if (audioUrl) Object.assign(complimentData, { audioUrl, audioDuration });

        const docRef = await addDoc(complimentsRef, complimentData);

        try {
          const ownerDocRef = doc(firestore, 'complimentOwners', ownerId);
          const batchPromises = [updateDoc(ownerDocRef, { xp: increment(10), totalCompliments: increment(1) })];
          if (user && !user.isAnonymous) {
            const sentRef = doc(firestore, 'complimentOwners', user.uid, 'sentWisprs', docRef.id);
            batchPromises.push(setDoc(sentRef, { receiverId: ownerId, complimentId: docRef.id, sentAt: serverTimestamp() }));
          }
          await Promise.all(batchPromises);
          notifyNewWisprAction(ownerId, complimentData.senderOS, docRef.id).catch(console.error);
        } catch (e) {
          console.error("Follow up updates failed:", e);
        }
        setIsSubmitted(true);
      } else {
        toast({ title: "Илгээхэд алдаа гарлаа", description: result.message || "Дахин оролдоно уу.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Submit Error:", error);
      toast({ title: "Серверийн алдаа", description: `Алдаа: ${error.message || 'Ямар нэг зүйл буруу хуурайшлаа.'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) return <ComplimentSentSuccess />;

  return (
    <Form {...form}>
      <form id="compliment-form" onSubmit={form.handleSubmit(onSubmit)} className="w-full">

        {/* ─── Message card ─── */}
        <div className="relative w-full rounded-[28px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] overflow-hidden focus-within:border-zinc-300 dark:focus-within:border-zinc-600 transition-all duration-300">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Textarea
                    placeholder="Хэлмээр байсан үгээ энд үлдээгээрэй…"
                    className="resize-none min-h-[180px] max-h-[320px] bg-transparent border-0 focus-visible:ring-0 px-6 pt-6 pb-2 text-[17px] font-medium leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 overflow-y-auto shadow-none caret-primary"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="px-6 pb-2 text-xs font-semibold text-red-500" />
              </FormItem>
            )}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <AudioRecorder
                ownerId={ownerId}
                onAudioReady={(url, duration) => { setAudioUrl(url); setAudioDuration(duration); }}
                onAudioRemoved={() => { setAudioUrl(null); setAudioDuration(0); }}
              />
              <AISuggestionsDialog onSelect={(text) => form.setValue('text', text, { shouldValidate: true })} />
            </div>
            <Button
              type="button"
              onClick={handleOpenDrawer}
              className="h-11 px-5 rounded-2xl font-bold text-[14px] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
            >
              Илгээх <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ─── Hint Pill ─── */}
        <div className="mt-4 flex items-center justify-center gap-1.5 opacity-60">
          <Lock className="w-3 h-3 text-zinc-500" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Таны нэр хаана ч харагдахгүй</p>
        </div>

        {/* ─── Drawer ─── */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 rounded-t-[2rem] max-w-md mx-auto">
            <div className="overflow-y-auto w-full px-6 pt-2 pb-10 max-h-[85vh]">
              <DrawerHeader className="px-0 pt-4 pb-6">
                <DrawerTitle className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Нэмэлт мэдээлэл</DrawerTitle>
                <DrawerDescription className="text-[15px] mt-1 text-zinc-500 dark:text-zinc-400">
                  Таны нэр <strong className="font-bold text-zinc-900 dark:text-white">хэзээ ч</strong> харагдахгүй.
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-8">
                {/* Frequency */}
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-[15px] font-bold text-zinc-800 dark:text-zinc-200 block">
                        Энэ хүнтэй хэр ойрхон харьцдаг вэ?
                      </FormLabel>
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
                                className="flex items-center justify-center py-3.5 rounded-2xl text-[14px] font-semibold cursor-pointer border-2 border-transparent bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-all duration-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-95 peer-data-[state=checked]:border-zinc-950 dark:peer-data-[state=checked]:border-white peer-data-[state=checked]:bg-zinc-950 dark:peer-data-[state=checked]:bg-white peer-data-[state=checked]:text-white dark:peer-data-[state=checked]:text-zinc-950"
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

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field: _field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-[15px] font-bold text-zinc-800 dark:text-zinc-200 block">
                        Хаана их харсан бэ?
                      </FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {locationOptions.map(option => {
                          const isSelected = form.watch('location') === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => form.setValue('location', isSelected ? '' : option, { shouldValidate: true })}
                              className={`h-11 px-5 rounded-xl text-[14px] font-semibold border-2 transition-all duration-200 active:scale-95 ${isSelected
                                  ? 'border-zinc-950 dark:border-white bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                                  : 'border-transparent bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                                }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </FormItem>
                  )}
                />

                {/* CTA for anonymous users to get their own link */}
                {(!user || user.isAnonymous) && (
                  <div className="relative overflow-hidden rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[15px] text-zinc-900 dark:text-white mb-1">Өөрийн линк аваарай</h4>
                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
                          Таны нэрийг бид хэзээ ч задлахгүй. Өөртөө линк үүсгэж бусдын бодлыг сонс.
                        </p>
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="w-full h-12 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-semibold text-[14px] text-zinc-900 dark:text-white flex items-center justify-center gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors active:scale-[0.98]"
                        >
                          <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          Google-ээр үүсгэх
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <DrawerFooter className="px-0 pt-8">
                <Button
                  type="submit"
                  form="compliment-form"
                  className="w-full h-14 rounded-2xl font-black text-[17px] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-xl shadow-black/20 dark:shadow-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      Wispr илгээх
                      <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-2 mt-3 opacity-50">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Нэрийг тань бид хамгаалж байна</p>
                </div>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </form>
    </Form>
  );
}
