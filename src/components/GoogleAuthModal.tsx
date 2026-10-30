import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, User, LogOut, ArrowRight, Loader2, Mic } from 'lucide-react';
import { auth, signInWithGoogleFirebase, signOutFirebase } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface GoogleUser {
  name: string;
  email: string;
  avatar?: string;
  uid?: string;
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GoogleUser | null;
  onLoginSuccess: (user: GoogleUser) => void;
  onLogout: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Keep ref to latest onLoginSuccess to avoid subscription re-trigger loops
  const onLoginSuccessRef = useRef(onLoginSuccess);
  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
  }, [onLoginSuccess]);

  // Prevent duplicate login triggers for the same user
  const lastProcessedUidRef = useRef<string | null>(null);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        if (lastProcessedUidRef.current === firebaseUser.uid) return;
        lastProcessedUidRef.current = firebaseUser.uid;

        const googleUser: GoogleUser = {
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'User')}&background=00f3ff&color=090b0e&bold=true`,
          uid: firebaseUser.uid
        };
        localStorage.setItem('playvear_google_user', JSON.stringify(googleUser));
        onLoginSuccessRef.current(googleUser);
      } else {
        lastProcessedUidRef.current = null;
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  // Trigger Google Firebase Sign In
  const handleContinueWithGoogle = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);

    try {
      await signInWithGoogleFirebase();
    } catch (err) {
      console.info('Sign in attempt concluded:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    lastProcessedUidRef.current = null;
    try {
      await signOutFirebase();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    onLogout();
  };

  return (
    <div
      id="google-auth-modal"
      className="fixed inset-0 z-[99999] w-full h-full min-h-screen bg-[#000000]/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 text-stone-100 animate-in fade-in duration-200 overflow-y-auto"
    >
      {/* Top PlayVear Brand Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-4 border-b border-stone-800/80">
        <div id="brand-header-auth" className="flex flex-col items-start justify-center group cursor-default select-none pt-0.5">
          <img
            src="/playvear-brand.png"
            alt="PlayVear"
            className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          />
          <span className="text-[11px] sm:text-xs font-medium tracking-wider text-cyan-300 font-['Hind_Siliguri',sans-serif] mt-2 leading-tight drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
            বাংলা এআই ভয়েস জেনারেটর
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-[#131823] hover:bg-[#1a2233] border border-stone-800 hover:border-cyan-500/50 flex items-center justify-center text-stone-300 hover:text-cyan-300 transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Center Content */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center my-auto py-8">
        {currentUser ? (
          /* Logged In View */
          <div className="w-full flex flex-col gap-4 bg-[#111624] border border-cyan-500/40 rounded-2xl p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center gap-3.5 text-left">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full border-2 border-cyan-400 shadow-md shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-cyan-300 shrink-0">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-cyan-200 truncate flex items-center gap-1.5">
                  <span>{currentUser.name}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </span>
                <span className="text-xs text-stone-400 truncate">{currentUser.email}</span>
                <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">Signed in with Google</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-fuchsia-500 hover:brightness-110 text-stone-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-950/50 transition-all cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <span>Continue to PlayVear</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-3 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Sign In Card with English instructions */
          <div className="w-full flex flex-col items-center gap-5 bg-[#0e0e0e] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 text-center">
            {/* Mic / Voice Badge */}
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.25)]">
              <Mic className="w-6 h-6" />
            </div>

            {/* English Instruction Message */}
            <div className="flex flex-col items-center gap-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
                Please sign in first to clone voices
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 font-['Plus_Jakarta_Sans',sans-serif]">
                Connect your Google account using the button below to use PlayVear AI.
              </p>
            </div>

            {/* Single Official Continue with Google Button */}
            <button
              type="button"
              onClick={handleContinueWithGoogle}
              disabled={isSigningIn}
              className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-stone-100 active:scale-[0.98] text-stone-900 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl transition-all cursor-pointer border border-stone-200 mt-1"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-600 shrink-0" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  {/* Google 'G' Colorful Icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer Branding Subtext */}
      <div className="w-full max-w-4xl mx-auto pt-4 border-t border-stone-800/80 text-center text-xs text-stone-400">
        PlayVear Labs • Secure Sign In
      </div>
    </div>
  );
};
