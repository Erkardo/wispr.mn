import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
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
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast({ title: "Амжилттай холбогдлоо!", description: "Wispr-ээ үргэлжлүүлэн илгээнэ үү." });
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') return;
      toast({ title: "Алдаа", description: 'Нэвтрэхэд алдаа гарлаа.', variant: "destructive" });
    }
  };

  async function onSubmit(data: ComplimentFormValues) {
    if (!ownerId) { toast({ title: "Алдаа", variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
      const result = await submitComplimentAction(data.text, audioUrl || undefined, audioDuration);
      if (result.success && (result.filteredText || audioUrl) && firestore) {
        const hintContext: HintContext = { frequency: (data.frequency as any) || '', location: (data.location as any) || '' };
        const complimentsRef = collection(firestore, 'complimentOwners', ownerId, 'compliments');
        const complimentData: any = {
          ownerId, text: result.filteredText || '', hintContext,
          createdAt: serverTimestamp(), isRead: false,
          reactions: { '💛': 0, '😄': 0, '✨': 0 },
          senderId: user && !user.isAnonymous ? user.uid : null,
          senderOS: getSenderOS(),
        };
        if (audioUrl) Object.assign(complimentData, { audioUrl, audioDuration });
        const docRef = await addDoc(complimentsRef, complimentData);
        try {
          const batchPromises = [updateDoc(doc(firestore, 'complimentOwners', ownerId), { xp: increment(10), totalCompliments: increment(1) })];
          if (user && !user.isAnonymous) {
            batchPromises.push(setDoc(doc(firestore, 'complimentOwners', user.uid, 'sentWisprs', docRef.id), { receiverId: ownerId, complimentId: docRef.id, sentAt: serverTimestamp() }));
          }
          await Promise.all(batchPromises);
          notifyNewWisprAction(ownerId, complimentData.senderOS, docRef.id).catch(console.error);
        } catch (e) { console.error(e); }
        setIsSubmitted(true);
      } else {
        toast({ title: "Илгээхэд алдаа гарлаа", description: result.message || "Дахин оролдоно уу.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Серверийн алдаа", description: error.message, variant: "destructive" });
    } finally { setIsSubmitting(false); }
  }

  if (isSubmitted) return <ComplimentSentSuccess />;

  return (
    <Form {...form}>
      <form id="compliment-form" onSubmit={form.handleSubmit(onSubmit)} className="w-full">

        {/* ── Premium Message Card ── */}
        <div
          className="relative w-full overflow-hidden transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.85)',
            border: '1.5px solid rgba(139,92,246,0.18)',
            borderRadius: '28px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(139,92,246,0.12), 0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* Subtle shimmer line at top */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), rgba(167,139,250,0.6), rgba(139,92,246,0.4), transparent)' }}
          />

          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Textarea
                    placeholder="Хэлмээр байсан үгээ энд үлдээгээрэй…"
                    className="resize-none min-h-[190px] max-h-[320px] bg-transparent border-0 focus-visible:ring-0 px-6 pt-7 pb-3 text-[17px] font-medium leading-relaxed placeholder:text-zinc-400 overflow-y-auto shadow-none"
                    style={{ caretColor: '#8b5cf6', color: '#18181b' }}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="px-6 pb-2 text-xs font-semibold text-red-500" />
              </FormItem>
            )}
          />

          {/* Toolbar */}
          <div
            className="flex items-center gap-3 px-5 py-3.5"
            style={{ borderTop: '1px solid rgba(139,92,246,0.1)', background: 'rgba(139,92,246,0.02)' }}
          >
            <AudioRecorder
              ownerId={ownerId}
              compact={true}
              onAudioReady={(url, duration) => { setAudioUrl(url); setAudioDuration(duration); }}
              onAudioRemoved={() => { setAudioUrl(null); setAudioDuration(0); }}
            />
            <AISuggestionsDialog onSelect={(text) => form.setValue('text', text, { shouldValidate: true })} />
          </div>
        </div>

        {/* ── Primary CTA ── */}
        <button
          type="button"
          onClick={handleOpenDrawer}
          className="w-full mt-4 flex items-center justify-center gap-2.5 font-black text-white transition-all active:scale-[0.98] group"
          style={{
            height: '56px',
            borderRadius: '18px',
            fontSize: '17px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
            boxShadow: '0 8px 24px rgba(124,58,237,0.4), 0 2px 8px rgba(124,58,237,0.2)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Үргэлжлүүлэх
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
        </button>

        {/* Trust hint */}
        <div className="mt-4 flex items-center justify-center gap-2 opacity-60">
          <Lock className="w-3 h-3" style={{ color: '#8b5cf6' }} />
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#8b5cf6' }}>
            Таны нэр хаана ч харагдахгүй
          </p>
        </div>

        {/* ── Drawer ── */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent
            className="max-w-md mx-auto rounded-t-[2rem]"
            style={{
              background: 'rgba(255,255,255,0.98)',
              borderTop: '1.5px solid rgba(139,92,246,0.15)',
              boxShadow: '0 -20px 60px rgba(139,92,246,0.12)',
            }}
          >
            <div className="overflow-y-auto w-full px-6 pt-2 pb-10 max-h-[88vh]">
              <DrawerHeader className="px-0 pt-5 pb-6">
                <DrawerTitle className="text-2xl font-black tracking-tight" style={{ color: '#18181b' }}>
                  Нэмэлт мэдээлэл
                </DrawerTitle>
                <DrawerDescription className="text-[15px] mt-1.5 text-zinc-500">
                  Таны нэр <span className="font-bold text-zinc-900">хэзээ ч</span> харагдахгүй.
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-8">
                {/* Frequency */}
                <div className="space-y-3">
                  <p className="text-[15px] font-bold text-zinc-800">Энэ хүнтэй хэр ойрхон харьцдаг вэ?</p>
                  <RadioGroup
                    onValueChange={(v) => form.setValue('frequency', v)}
                    value={form.watch('frequency')}
                    className="grid grid-cols-2 gap-2.5"
                  >
                    {frequencyOptions.map(option => (
                      <div key={option}>
                        <RadioGroupItem value={option} id={`freq-${option}`} className="peer sr-only" />
                        <Label
                          htmlFor={`freq-${option}`}
                          className="flex items-center justify-center py-3.5 rounded-2xl text-[14px] font-bold cursor-pointer transition-all duration-150 active:scale-95 peer-data-[state=checked]:text-white"
                          style={{
                            border: '2px solid transparent',
                            background: 'rgba(139,92,246,0.06)',
                            color: '#52525b',
                          }}
                          onMouseEnter={e => { if (form.watch('frequency') !== option) (e.target as HTMLElement).style.background = 'rgba(139,92,246,0.12)'; }}
                          onMouseLeave={e => { if (form.watch('frequency') !== option) (e.target as HTMLElement).style.background = 'rgba(139,92,246,0.06)'; }}
                        >
                          {option}
                        </Label>
                        <style>{`
                          #freq-${option.replace(' ', '-')}:checked ~ label[for="freq-${option}"] {
                            background: linear-gradient(135deg, #7c3aed, #8b5cf6) !important;
                            border-color: transparent !important;
                            color: white !important;
                          }
                        `}</style>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Location */}
                <div className="space-y-3">
                  <p className="text-[15px] font-bold text-zinc-800">Хаана их харсан бэ?</p>
                  <div className="flex flex-wrap gap-2">
                    {locationOptions.map(option => {
                      const isSelected = form.watch('location') === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => form.setValue('location', isSelected ? '' : option)}
                          className="h-11 px-5 rounded-xl text-[14px] font-bold transition-all duration-150 active:scale-95"
                          style={{
                            background: isSelected ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(139,92,246,0.06)',
                            color: isSelected ? 'white' : '#52525b',
                            border: '2px solid transparent',
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Upsell for anonymous */}
                {(!user || user.isAnonymous) && (
                  <div
                    className="rounded-3xl p-5 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(167,139,250,0.04) 100%)',
                      border: '1.5px solid rgba(139,92,246,0.15)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(167,139,250,0.1))' }}
                      >
                        <Sparkles className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-[15px] text-zinc-900 mb-1">Өөрийн линк аваарай</h4>
                        <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">
                          Таны нэрийг бид хэзээ ч задлахгүй. Өөртөо линк үүсгэж бусдын бодлыг сонс.
                        </p>
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="w-full h-12 rounded-2xl font-bold text-[14px] text-zinc-800 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
                          style={{
                            background: 'white',
                            border: '1.5px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          }}
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

              {/* Submit Button */}
              <DrawerFooter className="px-0 pt-8">
                <Button
                  type="submit"
                  form="compliment-form"
                  disabled={isSubmitting}
                  className="w-full h-14 font-black text-[17px] text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group border-0"
                  style={{
                    borderRadius: '18px',
                    background: isSubmitting ? '#a78bfa' : 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
                    boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
                  }}
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
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#8b5cf6' }}>
                    Нэрийг тань бид хамгаалж байна
                  </p>
                </div>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </form>
    </Form>
  );
}
