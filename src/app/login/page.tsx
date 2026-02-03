'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';


const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.534-11.088-8.108l-6.703,5.193C9.432,39.405,16.094,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.088,5.571l6.19,5.238C42.012,35.25,44,30.024,44,24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);


export default function LoginPage() {
  const auth = useAuth();
  const { user, loading } = useUser();

  const handleSignIn = async () => {
    if (auth) {
      const provider = new GoogleAuthProvider();
      try {
        // Firebase handles account linking automatically for anonymous users
        await signInWithPopup(auth, provider);
      } catch (error: any) {
        // This error occurs if the user closes the popup without signing in.
        // It's a normal user action, so we can safely ignore it.
        if (error.code !== 'auth/cancelled-popup-request') {
          console.error('Error signing in with Google', error);
        }
      }
    }
  };
  
  if (loading || (user && !user.isAnonymous)) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4 text-center">
      <div className="mx-auto w-fit mb-6 text-primary">
        <Logo className="w-56" />
      </div>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Сэтгэлээсээ хуваалцаж, wispr-үүд сонсох орон зай. Wispr-үүдээ хадгалахын тулд бүртгэл үүсгэнэ үү.
      </p>

      <div className="mt-12 w-full max-w-xs">
          <Button onClick={handleSignIn} size="lg" className="w-full font-bold">
            <GoogleIcon />
            Google-ээр үргэлжлүүлэх
          </Button>
      </div>

       <p className="absolute bottom-6 text-xs text-muted-foreground px-8">
            Үргэлжлүүлснээр та манай <Link href="/privacy" className="underline">Үйлчилгээний нөхцөл</Link> болон <Link href="/privacy" className="underline">Нууцлалын бодлогыг</Link> зөвшөөрч байна.
       </p>
    </div>
  );
}
