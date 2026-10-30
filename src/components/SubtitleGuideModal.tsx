import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, CheckCircle2, Video, Layers, Sliders } from 'lucide-react';
import { PlayvearIcon } from './PlayvearIcon';

interface SubtitleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubtitleGuideModal: React.FC<SubtitleGuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#131722] border border-stone-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-[#171c2b]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                সাবটাইটেল (.srt) ব্যবহার নির্দেশিকা
              </h2>
              <p className="text-xs text-stone-400">
                CapCut, Premiere Pro, DaVinci Resolve ও VN এডিটরে সাবটাইটেল ব্যবহারের সহজ নিয়ম
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-stone-300">
          {/* Main Info */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-3">
            <PlayvearIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-cyan-300">স্বয়ংক্রিয় নিখুঁত টাইমিং সহ .SRT ফাইল</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                ভয়েস জেনারেট করার পর <strong>Subtitle</strong> বাটনে ক্লিক করলে আপনার সম্পূর্ণ স্ক্রিপ্টের বাংলা বাক্যভিত্তিক নিখুঁত টাইমস্ট্যাম্পসহ স্ট্যান্ডার্ড <code>.srt</code> ফাইল ডাউনলোড হবে।
              </p>
            </div>
          </div>

          {/* How to use in editors */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-400" /> কীভাবে ভিডিওতে যোগ করবেন?
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#1a2030] border border-stone-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  ১
                </span>
                <div>
                  <strong className="text-white">CapCut (মোবাইল ও পিসি):</strong>
                  <p className="text-stone-400 mt-0.5">
                    Text অপশনে যান &gt; <em>Auto Captions</em> বা <em>Local Captions</em> &gt; <em>Import SRT</em> নির্বাচন করে ডাউনলোড করা <code>.srt</code> ফাইলটি সিলেক্ট করুন।
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1a2030] border border-stone-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  ২
                </span>
                <div>
                  <strong className="text-white">Adobe Premiere Pro:</strong>
                  <p className="text-stone-400 mt-0.5">
                    File &gt; Import দিয়ে <code>.srt</code> ফাইলটি প্রজেক্টে আনুন এবং অডিও ট্র্যাকের সাথে টাইমলাইনে ড্র্যাগ করে দিন।
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1a2030] border border-stone-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  ৩
                </span>
                <div>
                  <strong className="text-white">VN Video Editor:</strong>
                  <p className="text-stone-400 mt-0.5">
                    Subtitle অপশনে ট্যাপ করে <em>Import File</em> চেপে <code>.srt</code> ফাইলটি যুক্ত করুন।
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Typography Tip */}
          <div className="p-4 rounded-xl bg-[#1a2030] border border-stone-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-xs">
              <Sliders className="w-4 h-4 text-amber-400" /> বাংলা ফন্ট স্টাইলিং টিপস
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              ভিডিও এডিটরে সাবটাইটেল সুন্দর দেখানোর জন্য <strong>Kalpurush</strong>, <strong>Hind Siliguri</strong>, অথবা <strong>Siyam Rupali</strong> ফন্ট এবং হালকা ব্ল্যাক ড্রপ-শ্যাডো বা স্ট্রোক ব্যবহার করুন।
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-[#171c2b] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            বুঝেছি (Close)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
