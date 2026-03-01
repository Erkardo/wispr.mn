'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useUser, useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { submitComplimentAction, notifyNewWisprAction } from '@/app/compliments/actions';
import type { HintContext } from '@/types';
import { ComplimentSentSuccess } from './ComplimentSentSuccess';
import { AISuggestionsDialog } from './AISuggestionsDialog';
import { AudioRecorder } from './AudioRecorder';

// UI Components
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Loader2, ArrowRight, Lock, Sparkles, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';


// New schema and types based on user request
const frequencyOptions = ['Өдөр бүр', 'Заримдаа', 'Хааяа', 'Одоо харьцдаггүй'] as const;
const locationOptions = ['Ажил', 'Сургууль', 'Онлайн', 'Өөр'] as const;

const FormSchema = z.object({
  text: z.string().max(500, { message: 'Хамгийн ихдээ 500 тэмдэгт.' }),
  frequency: z.enum(frequencyOptions, {
    required_error: 'Энэ асуултад хариулах нь hint-ийг илүү зөв болгоход тусална.',
  }),
  location: z.enum([...locationOptions, '']).optional(),
  createOwnLink: z.boolean().default(true),
});

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20c0-1.341-.138-2.65-.389-3.917z" /><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" /><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.534-11.088-8.108l-6.703,5.193C9.432,39.405,16.094,44,24,44z" /><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.088,5.571l6.19,5.238C42.012,35.25,44,30.024,44,24c0-1.341-.138-2.65-.389-3.917z" /></svg>
);


export function ComplimentForm({ ownerId }: { ownerId: string }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      text: '',
      location: '',
      createOwnLink: true,
    },
  });

  const handleOpenDrawer = async () => {
    const isTextValid = await form.trigger('text');
    if (isTextValid) {
      setIsDrawerOpen(true);
    }
  };

  const handleGoogleSignIn = async () => {
    if (auth) {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        toast({
          title: "Амжилттай холбогдлоо!",
          description: "Wispr-ээ үргэлжлүүлэн илгээнэ үү.",
        });
      } catch (error: any) {
        let description = 'Нэвтрэхэд алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.';
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
          description = 'Google-ээр нэвтрэх цонхыг таны хөтөч хаалаа. Popup зөвшөөрлөө шалгаад дахин оролдоно уу.';
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          description = 'Энэ Google аккаунт өөр бүртгэлтэй холбогдсон байна. Өөр аккаунтаар оролдоно уу.';
        } else if (error.code === 'auth/cancelled-popup-request') {
          // This is a user action, not an error, so we can safely ignore it and not show a toast.
          return;
        }

        console.error('Google-ээр нэвтрэхэд алдаа гарлаа', error);
        toast({ title: 'Алдаа', description, variant: 'destructive' });
      }
    }
  };

  const getSenderOS = () => {
    if (typeof window === 'undefined') return 'Unknown';
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Win/.test(ua)) return 'Windows';
    return 'Web';
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSubmitting(true);
    try {
      // AI filter action
      const result = await submitComplimentAction(data.text, audioUrl || undefined, audioDuration);

      if (result.success && (result.filteredText || audioUrl) && firestore) {
        const hintContext: HintContext = {
          frequency: data.frequency,
          location: data.location || '',
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

        // BLOCKING write to Firestore
        const docRef = await addDoc(complimentsRef, complimentData);

        // Follow-up updates
        try {
          const ownerDocRef = doc(firestore, 'complimentOwners', ownerId);
          const batchPromises = [
            updateDoc(ownerDocRef, {
              xp: increment(10), // +10 XP per wispr
              totalCompliments: increment(1), // Increment total Wisprs received
            })
          ];

          // Save reference to sender's Sent Box if they are logged in
          if (user && !user.isAnonymous) {
            const sentRef = doc(firestore, 'complimentOwners', user.uid, 'sentWisprs', docRef.id);
            batchPromises.push(setDoc(sentRef, {
              receiverId: ownerId,
              complimentId: docRef.id,
              sentAt: serverTimestamp()
            }));
          }

          await Promise.all(batchPromises);

          // Trigger push notification asynchronously (don't block the UI flow)
          notifyNewWisprAction(ownerId, complimentData.senderOS, docRef.id).catch(console.error);

        } catch (e) {
          console.error("Failed to update extra DB data", e);
        }

        // Redirect OR Show Success
        if (user && !user.isAnonymous && data.createOwnLink) {
          router.push('/create');
        } else {
          setIsSubmitted(true);
        }

      } else {
        toast({
          title: 'Алдаа',
          description: result.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return <ComplimentSentSuccess />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0 w-full">

        {/* --- STEP 1: Just Write (Frictionless UX) --- */}
        <div className="flex flex-col relative w-full pt-4">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="space-y-0 relative w-full">
                <FormControl>
                  <Textarea
                    placeholder="Надад хэлмээр санагдсан тэр үгээ энд зоригтойгоор үлдээгээрэй... 💭"
                    className="resize-none min-h-[160px] max-h-[250px] bg-transparent border-0 focus-visible:ring-0 px-5 pt-3 pb-12 text-lg md:text-xl font-medium !placeholder-muted-foreground/50 overflow-y-auto leading-relaxed shadow-none caret-primary"
                    {...field}
                  />
                </FormControl>

                {/* Fixed controls bar over the textarea bottom */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-xl p-1 shadow-sm border border-white/20">
                  <div className="flex items-center gap-1">
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
                    <AISuggestionsDialog onSelect={(text) => form.setValue('text', text, { shouldValidate: true })} />
                  </div>

                  {/* Primary Trigger */}
                  <Button
                    type="button"
                    onClick={handleOpenDrawer}
                    className="rounded-lg shadow-xl hover:scale-105 transition-transform active:scale-95 px-5 bg-gradient-to-r from-primary to-accent"
                  >
                    Ахиулах <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                <FormMessage className="absolute -bottom-6 left-4 text-xs font-semibold" />
              </FormItem>
            )}
          />
        </div>

        {/* --- STEP 2: The Bottom Drawer (Hint & Login) --- */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="bg-background/95 backdrop-blur-xl border-t-white/10 sm:max-w-md mx-auto h-[90vh] md:h-auto">
            <div className="overflow-y-auto w-full px-4 pt-4 pb-8 h-full">
              <DrawerHeader className="text-left px-0 pb-6 pt-2">
                <DrawerTitle className="text-2xl font-black flex items-center gap-2 text-foreground tracking-tight">
                  Жаахан hint өгөх үү? <Sparkles className="w-5 h-5 text-yellow-400" />
                </DrawerTitle>
                <DrawerDescription className="text-base font-medium mt-1">
                  Бид таны нэрийг <strong className="text-primary font-bold">ХЭЗЭЭ Ч</strong> харуулахгүй.
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-6 flex-1">

                {/* Bento Box: Hint 1 */}
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem className="space-y-3 bg-muted/40 p-4 rounded-3xl border border-muted/50">
                      <FormLabel className="font-bold text-foreground text-sm tracking-tight ml-1">Та энэ хүнтэй хэр ойрхон анзааралцдаг вэ?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-wrap gap-2"
                        >
                          {frequencyOptions.map(option => (
                            <div key={option} className="flex-1 min-w-[30%]">
                              <RadioGroupItem value={option} id={`freq-${option}`} className="peer sr-only" />
                              <Label
                                htmlFor={`freq-${option}`}
                                className="flex items-center justify-center p-3 text-sm font-semibold rounded-2xl border-2 border-transparent bg-background shadow-sm text-foreground/80 hover:bg-accent/10 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary transition-all duration-300 cursor-pointer active:scale-95"
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

                {/* Bento Box: Hint 2 */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="space-y-3 bg-muted/40 p-4 rounded-3xl border border-muted/50">
                      <FormLabel className="font-bold text-foreground text-sm tracking-tight ml-1">Та энэ хүнийг хаана их харсан бэ?</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {locationOptions.map(option => (
                          <Button
                            key={option}
                            type="button"
                            variant="outline"
                            onClick={() => form.setValue('location', form.watch('location') === option ? '' : option, { shouldValidate: true })}
                            className={`rounded-xl border-2 text-sm font-semibold transition-all h-10 px-4 ${form.watch('location') === option ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-background shadow-sm hover:bg-accent/10'}`}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                {/* Google Auth Block - Optional Viral Loop trap */}
                {(!user || user.isAnonymous) && (
                  <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 flex flex-col items-start gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-primary/20 p-1.5 rounded-full"><Lock className="w-4 h-4 text-primary" /></div>
                      <h4 className="font-bold text-sm tracking-tight text-foreground">Та өөрөө линктэй болох уу?</h4>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">Таныг хэн гэдгийг бид цааш нь хэзээ ч задлахгүй. Харин та өөртөө линк үүсгэвэл бусдаас ийм халуун дулаан зүйл сонсох болно.</p>

                    <Button type="button" onClick={handleGoogleSignIn} variant="outline" className="w-full h-11 rounded-xl bg-background shadow-sm font-bold mt-1 text-foreground relative overflow-hidden group">
                      <span className="relative z-10 flex items-center justify-center">
                        <GoogleIcon />
                        Google-ээр үүсгэх
                      </span>
                    </Button>
                  </div>
                )}

              </div>

              <DrawerFooter className="px-0 pt-6 mt-auto">
                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 group active:scale-[0.98] transition-all relative overflow-hidden"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <>
                      <span className="relative z-10 flex items-center drop-shadow-sm">Зүрхлээд нисгэх <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></span>
                    </>
                  )}
                  {/* Button shine effect */}
                  <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                </Button>
                <div className="flex items-center justify-center gap-1.5 mt-3 opacity-60">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest text-center">Your secret is safe with us</p>
                </div>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </form>
    </Form>
  );
}
