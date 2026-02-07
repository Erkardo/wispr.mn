'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useUser, useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { submitComplimentAction } from '@/app/compliments/actions';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowRight, ChevronsUpDown, Lock } from 'lucide-react';
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
  const [step, setStep] = useState(1);
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

  const handleNextStep = async () => {
    const isTextValid = await form.trigger('text');
    if (isTextValid) {
      setStep(2);
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
          audioUrl: audioUrl || null,
          duration: audioDuration || 0
        };

        // Non-blocking write to Firestore
        addDoc(complimentsRef, complimentData).then(async () => {
          // Increment owner XP
          try {
            const ownerRef = doc(firestore, 'complimentOwners', ownerId);
            await updateDoc(ownerRef, {
              xp: increment(10), // +10 XP per wispr
            });
          } catch (e) {
            console.error("Failed to update XP", e);
          }
        }).catch(error => {
          const permissionError = new FirestorePermissionError({
            path: complimentsRef.path,
            operation: 'create',
            requestResourceData: complimentData,
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({
            title: 'Алдаа',
            description: 'Wispr илгээхэд алдаа гарлаа. Дахин оролдоно уу.',
            variant: 'destructive',
          });
        });

        // If user logged in and wants their own link, redirect them.
        // Otherwise, show the success message.
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* --- STEP 1: Just Write --- */}
        <div className={step === 1 ? 'block' : 'hidden'}>
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Нэрээ бичихгүйгээр хэлмээр санагдсан зүйлээ энд үлдээгээрэй…"
                    className="resize-none h-40 bg-background/50"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-center pt-2">
                  Та дараа нь нэмэлт мэдээлэл өгч болно.
                </FormDescription>
                <div className="flex justify-between items-center mt-2">
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
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" onClick={handleNextStep} className="w-full mt-4 !mb-0" size="lg">
            Дараагийн алхам <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* --- STEP 2: Make it Better --- */}
        <div className={step === 2 ? 'space-y-8 animate-in fade-in-50' : 'hidden'}>
          {/* 2.1 Google Login */}
          {userLoading ? (
            <div className="flex justify-center items-center h-28">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (!user || user.isAnonymous) && (
            <Card className="bg-secondary/50 border-dashed border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-600" />
                  Таны нэр харагдахгүй
                </CardTitle>
                <CardDescription>
                  Бид таны нэрийг хүлээн авагчид <strong>хэзээ ч</strong> харуулахгүй.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="button" onClick={handleGoogleSignIn} variant="outline" className="w-full font-bold relative overflow-hidden group">
                  <span className="relative z-10 flex items-center justify-center">
                    <GoogleIcon />
                    Google-ээр баталгаажуулах
                  </span>
                  <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Зөвхөн хиймэл оюун ухаан (AI) hint үүсгэхэд ашиглана.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 2.2 Hint Questions */}
          <div className="space-y-6">
            {/* Question 1 (Mandatory) */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-bold text-foreground">Та энэ хүнийг хэр ойрхон анзаардаг вэ?</FormLabel>
                  <FormDescription>Энэ нь hint-ийг илүү зөв болгоход тусална.</FormDescription>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-3"
                    >
                      {frequencyOptions.map(option => (
                        <div key={option}>
                          <RadioGroupItem value={option} id={`freq-${option}`} className="peer sr-only" />
                          <Label
                            htmlFor={`freq-${option}`}
                            className="flex items-center justify-center p-3 text-sm font-medium rounded-md border-2 border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-all cursor-pointer"
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

            {/* Question 2 (Optional) */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="link" className="p-0 h-auto text-muted-foreground">
                  Нэмэлт мэдээлэл өгөх
                  <ChevronsUpDown className="ml-2 h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-4 animate-in fade-in-50">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-bold text-foreground">Та энэ хүнийг хаана ихэвчлэн анзаардаг вэ?</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {locationOptions.map(option => (
                          <Button
                            key={option}
                            type="button"
                            size="sm"
                            variant={form.watch('location') === option ? 'default' : 'secondary'}
                            onClick={() => form.setValue('location', form.watch('location') === option ? '' : option, { shouldValidate: true })}
                            className="h-auto py-1.5 px-3"
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* 3. Convert Sender to User */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Та ч бас wispr авахыг хүсэж байна уу?</CardTitle>
              <CardDescription>Өөрийн хувийн линк үүсгээд нэргүй wispr-үүд хүлээн аваарай.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="createOwnLink"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 bg-background shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Надад ч бас wispr харах сонирхолтой байна
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 4. Submit Button */}
          <div className="!mt-8 text-center">
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wispr илгээх
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Нэр тань харагдахгүй</p>
          </div>
        </div>
      </form>
    </Form>
  );
}
