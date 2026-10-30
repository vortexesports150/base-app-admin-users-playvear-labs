import React from 'react';
import {
  X,
  Film,
  Lightbulb,
  Camera,
  Video,
  FileCheck2,
  Check,
} from 'lucide-react';

interface VideoHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoHelpModal: React.FC<VideoHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#080d16] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-[0_0_50px_rgba(0,240,255,0.2)] space-y-4 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Clean Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-cyan-900/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-950 border border-cyan-400/70 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)] shrink-0">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                ভিডিও রেফারেন্স নির্দেশিকা
              </h2>
              <p className="text-[11px] text-neutral-400">
                সহজে এবং সঠিকভাবে রেফারেন্স ব্যবহারের গাইড
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-neutral-900 hover:bg-cyan-950 border border-neutral-700 hover:border-cyan-400 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="বন্ধ করুন"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body - Ultra Clean 3 Step Layout */}
        <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
          
        {/* Modal Body - Ultra Clean 3 Step Layout */}
        <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
          
          {/* STEP 1: Main Clarification (ভিডিও রেফারেন্স কেন দিবেন) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-[#0a1215] to-[#0a0f18] border border-cyan-500/50 space-y-2 shadow-[0_0_18px_rgba(0,240,255,0.1)]">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs sm:text-sm">
              <Lightbulb className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
              <span>১. ভিডিও রেফারেন্স কেন ও কীভাবে দিবেন?</span>
            </div>

            <div className="text-slate-200 leading-relaxed text-[11.5px] space-y-2">
              <p>
                আপনার ভিডিওকে আরও প্রাণবন্ত করতে চাইলে একটি রেফারেন্স ভিডিও দিতে পারেন। 
                <strong>এটি অপশনাল (ঐচ্ছিক)।</strong> না দিলেও শুধু ছবি ও অডিও দিয়ে দারুণ ভিডিও তৈরি হবে।
              </p>
              <div className="bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/30">
                <p><strong>কী ঘটবে:</strong> আপনি রেফারেন্স ভিডিওতে যেভাবে হাত-পা নাড়বেন, মাথা নাড়বেন বা হাসবেন—এআই আপনার ছবির ক্যারেক্টারকেও ঠিক সেভাবেই ভিডিওতে কথা বলাবে।</p>
              </div>
            </div>
          </div>

          {/* STEP 2: Studio Best Practices */}
          <div className="p-4 rounded-2xl bg-[#0d1422] border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs sm:text-sm">
              <Camera className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>২. সেরা ভিডিওর জন্য টিপস (স্টুডিও মেথড)</span>
            </div>

            <div className="space-y-2 text-[11px] pt-0.5">
              <p className="text-slate-300">
                সবচেয়ে ভালো রেজাল্ট পেতে একটি স্টুডিওর মতো পরিবেশে ভিডিও শুট করুন।
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                <li>আপনার প্রেজেন্টার যে পজিশনে বসবে, রেফারেন্স ভিডিওতেও ঠিক সেই পজিশনে শুট করুন।</li>
                <li>ছবি ও ভিডিও রেফারেন্স উভয়ই একই অ্যাঙ্গেল ও আলোতে নিলে আউটপুট অবিকল রিয়েলিস্টিক হবে।</li>
                <li>কোনো অসামঞ্জস্য (যেমন: দৌড়ানো ভিডিও রেফারেন্স, কিন্তু বসে কথা বলা প্রেজেন্টার) এড়িয়ে চলুন।</li>
              </ul>
            </div>
          </div>

          {/* STEP 3: Simple User Summary */}
          <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-700 space-y-2">
            <p className="text-[11px] text-slate-300">
              ✅ <strong>শুধু ছবি ও অডিও:</strong> আপনি যদি কোনো মোশন না চান, তাহলে কোনো ভিডিও রেফারেন্স দেওয়ার প্রয়োজন নেই। শুধু ছবি ও অডিও দিলেই চলবে।
            </p>
          </div>
        </div>

          {/* STEP 3: Upload Limits & Mutually Exclusive Rule */}
          <div className="p-4 rounded-2xl bg-[#0d1422] border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs sm:text-sm">
              <FileCheck2 className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>৩. ফাইল সাইজ ও নিয়মাবলী</span>
            </div>

            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside leading-relaxed pl-1">
              <li>
                <strong className="text-white">ফাইল সাইজ:</strong> ভিডিওর সাইজ সর্বোচ্চ <strong className="text-amber-300 font-mono">10 MB</strong> হতে পারবে।
              </li>
              <li>
                <strong className="text-white">ছবি ও ভিডিও একসাথে ব্যবহার:</strong> মূল চেহারার জন্য ছবি দিন, এবং শরীরের অঙ্গভঙ্গি রিয়েলিস্টিক করতে সাথে একটি অপশনাল রেফারেন্স ভিডিও যুক্ত করতে পারবেন (দুটোই একসাথে ব্যবহার করা যাবে)।
              </li>
            </ul>
          </div>

        </div>

        {/* Clean Footer */}
        <div className="pt-3 border-t border-cyan-900/40 flex items-center justify-between">
          <span className="text-[10px] text-neutral-500 font-mono">Playvear Studio</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black text-xs font-bold shadow-[0_0_18px_rgba(0,240,255,0.35)] transition-all cursor-pointer active:scale-95"
          >
            ঠিক আছে, বুঝেছি
          </button>
        </div>

      </div>
    </div>
  );
};
