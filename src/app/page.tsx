'use client';

import React, { useState, useEffect } from 'react';
import { SparklesCore } from '@/components/ui/sparkles';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import FloatingCards from '@/components/ui/floating-cards';
import { Input } from '@/components/ui/input';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LandingPage() {
  const { setUserInteracted, setUsername } = useAppContext();
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Wenn der Benutzer bereits eingeloggt ist, direkt zum Spiel leiten
  useEffect(() => {
    if (user && !loading) {
      setUserInteracted();
      router.push('/game?from=intro');
    }
  }, [user, loading, router, setUserInteracted]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    if (authMode === 'signup' && !signupUsername.trim()) {
        toast({ variant: 'destructive', title: t('error'), description: t('enterUsername') });
        return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: t('welcomeBack'), description: t('loginSuccess') });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Benutzernamen im Firebase-Auth-Profil setzen
        await updateProfile(userCredential.user, { displayName: signupUsername });
        // Benutzernamen im AppContext setzen (triggert Cloud-Sync)
        setUsername(signupUsername);
        toast({ title: t('accountCreated'), description: t('welcomeAether') });
      }
      setUserInteracted();
      router.push('/game?from=intro');
    } catch (error: any) {
      let message = t('unexpectedError');
      if (error.code === 'auth/wrong-password') message = t('wrongPassword');
      if (error.code === 'auth/user-not-found') message = t('userNotFound');
      if (error.code === 'auth/email-already-in-use') message = t('emailInUse');
      if (error.code === 'auth/weak-password') message = t('weakPassword');
      
      toast({
        variant: 'destructive',
        title: t('error'),
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setUserInteracted();
      router.push('/game?from=intro');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message,
      });
    }
  };

  if (loading) {
      return (
        <div className="aether-void flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
      )
  }

  return (
    <div className="aether-void overflow-hidden flex items-center justify-center p-4">
        <div className="vignette" />
        <div className="noise-overlay"></div>
        <LanguageSwitcher className="absolute right-4 top-4 z-30" />

        <div className="absolute inset-0 z-10">
          <FloatingCards />
        </div>

        <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-md">
          <div className="flex flex-col items-center mb-12 animate-in fade-in zoom-in duration-1000">
            <Image
              src={`/logo.png?v=2`}
              alt="AETHER: THE FIFTH ELEMENT"
              width={400}
              height={84}
              className="h-auto drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]"
              priority
            />
          </div>

          <Card className="w-full bg-black/40 backdrop-blur-xl border-primary/20 text-white shadow-2xl shadow-primary/5 rounded-2xl overflow-hidden">
            <CardContent className="pt-8 pb-8 px-8">
              <form onSubmit={handleEmailAuth} className="space-y-5">
                {authMode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-widest text-primary/70 font-bold ml-1">{t('username')}</label>
                    <Input 
                      type="text" 
                      placeholder={t('chooseName')}
                      value={signupUsername} 
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="bg-black/40 border-primary/20 h-12 focus:border-primary/50 transition-all rounded-xl"
                    />
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest text-primary/70 font-bold ml-1">{t('email')}</label>
                  <Input 
                    type="email" 
                    placeholder="deine@mail.de" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/40 border-primary/20 h-12 focus:border-primary/50 transition-all rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest text-primary/70 font-bold ml-1">{t('password')}</label>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/40 border-primary/20 h-12 focus:border-primary/50 transition-all rounded-xl"
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full mt-4 h-14 text-lg" 
                  variant="tcg" 
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : (authMode === 'login' ? t('enter') : t('createAccount'))}
                </Button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[3px]">
                  <span className="bg-black/0 px-4 text-white/30 backdrop-blur-sm">{t('or')}</span>
                </div>
              </div>

              <Button variant="outline" className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl transition-all" onClick={handleGoogleLogin}>
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.48-.98 7.31-2.64l-3.57-2.77c-.99.66-2.26 1.06-3.74 1.06-2.88 0-5.32-1.94-6.19-4.55H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.81 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.63-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.63 2.84c.87-2.61 3.31-4.55 6.19-4.55z"
                  />
                </svg>
                {t('signInWithGoogle')}
              </Button>

              <div className="mt-8 text-center">
                {authMode === 'login' ? (
                  <p className="text-sm text-white/50">
                    {t('noAccount')}{' '}
                    <button 
                      onClick={() => setAuthMode('signup')}
                      className="text-primary hover:text-primary/80 font-bold transition-colors underline-offset-4 hover:underline"
                    >
                      {t('registerNow')}
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-white/50">
                    {t('alreadyBinder')}{' '}
                    <button 
                      onClick={() => setAuthMode('login')}
                      className="text-primary hover:text-primary/80 font-bold transition-colors underline-offset-4 hover:underline"
                    >
                      {t('goToLogin')}
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <p className="mt-12 text-[9px] text-white/20 uppercase tracking-[5px] text-center">
            Aether Engine v1.0 • Powered by Genkit & Firebase
          </p>
        </div>

        {/* Sparkles Background Effect */}
        <div className="absolute inset-0 pointer-events-none">
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1.2}
            particleDensity={120}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />
        </div>
    </div>
  );
}
