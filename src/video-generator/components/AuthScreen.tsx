import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  User,
  Mail,
  Smartphone,
  CheckCircle2,
  X,
} from 'lucide-react';
import { UserProfile } from '../types';
import { signInWithGoogleFirebase } from '../../lib/firebase';
import { PlayvearIcon } from '../../components/PlayvearIcon';

interface AuthScreenProps {
  onSignIn: (user: UserProfile) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignIn,
  onCancel,
  isModal = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'google' | 'email'>('google');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Real Firebase Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      const firebaseUser = await signInWithGoogleFirebase();
      if (firebaseUser) {
        const user: UserProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email?.toLowerCase() || 'user@gmail.com',
          photoUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}`,
          provider: 'google',
          signedInAt: new Date().toISOString(),
        };

        // Also sync to localStorage for cross-tab auth sync
        try {
          localStorage.setItem('playvear_google_user', JSON.stringify({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          }));
        } catch {}

        onSignIn(user);
      }
    } catch (err) {
      console.info('Firebase auth sign-in notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = () => {
    const guestUser: UserProfile = {
      id: `guest_${Date.now()}`,
      name: 'গেস্ট ব্যবহারকারী',
      email: 'guest@playvear.local',
      provider: 'guest',
      signedInAt: new Date().toISOString(),
    };
    onSignIn(guestUser);
  };

  return (
    <div
      className={`w-full flex items-center justify-center p-4 font-sans ${
        isModal
          ? 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto'
          : 'min-h-[85vh] py-8'
      }`}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-[#090d16] border border-cyan-500/40 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,240,255,0.2)] animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button if Modal */}
        {isModal && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Brand / Logo */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-950 via-black to-fuchsia-950 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            <PlayvearIcon className="h-7 w-7" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-fuchsia-500 shadow-[0_0_8px_#ff007f] animate-ping" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono uppercase tracking-wider mb-1.5">
              <span>Google Account Sign-In</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-fuchsia-200 bg-clip-text text-transparent">
              Playvear Studio
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
              আপনার গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করুন। আপনার জেনারেট করা ভিডিওগুলো আপনার অ্যাকাউন্টের অধীনে লোকাল স্টোরেজে নিরাপদে থাকবে।
            </p>
          </div>
        </div>

        {/* SIGN-IN OPTIONS */}
        <div className="space-y-3">
          {/* 1. Primary: CONTINUE WITH GOOGLE */}
          {!showEmailForm ? (
            <div className="space-y-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-sm font-semibold shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all cursor-pointer active:scale-[0.99] disabled:opacity-70"
              >
                {/* Official Google G Logo */}
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google অ্যাকাউন্ট দিয়ে সাইন-ইন করুন</span>
              </button>


            </div>
          ) : (
            /* Custom Google Email Form */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGoogleSignIn();
              }}
              className="space-y-3 bg-[#060911] p-3.5 rounded-2xl border border-cyan-500/30"
            >
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-cyan-300 flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-cyan-400" />
                  <span>আপনার Gmail / Google Email অ্যাড্রেস</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-cyan-500/40 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-cyan-300 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-cyan-400" />
                  <span>আপনার নাম (ঐচ্ছিক)</span>
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Farhan Ahmed"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-cyan-500/40 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading || !googleEmail.trim()}
                  className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.4)] disabled:opacity-50"
                >
                  {isLoading ? 'সাইন-ইন হচ্ছে...' : 'লগইন সম্পন্ন করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs transition-colors cursor-pointer"
                >
                  ফিরে যান
                </button>
              </div>
            </form>
          )}

          {/* Guest Mode Button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleGuestSignIn}
              className="text-xs text-neutral-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              বা গেস্ট হিসেবে ট্রাই করুন (Continue as Guest) →
            </button>
          </div>
        </div>

        {/* FAQ & SECURITY NOTICE (Answers User's Question directly) */}
        <div className="mt-6 pt-4 border-t border-cyan-900/40 space-y-2 text-[11px] text-neutral-400">
          <div className="flex items-start gap-2 bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-500/20">
            <Smartphone className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-neutral-300">
              <span className="text-cyan-300 font-semibold">আইফোন ব্যবহারকারীদের জন্য:</span> আইফোন, অ্যান্ড্রয়েড বা কম্পিউটার—সব প্ল্যাটফর্মেই গুগল (Gmail) অ্যাকাউন্ট দিয়ে ১-ক্লিকে সাইন-ইন করা যায়। আলাদা অ্যাপল আইডির প্রয়োজন নেই।
            </div>
          </div>

          <div className="flex items-start gap-2 bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-800">
            <Lock className="h-4 w-4 text-fuchsia-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="text-fuchsia-300 font-semibold">লোকাল স্টোরেজ নিরাপত্তা:</span> প্রতিটি ব্যবহারকারীর ভিডিও শুধুমাত্র তাদের নিজস্ব গুগল অ্যাকাউন্টের অধীনে ব্রাউজারের লোকাল স্টোরেজে সেভ থাকবে।
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
