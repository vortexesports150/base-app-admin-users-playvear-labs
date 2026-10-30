import React from 'react';
import { X, KeyRound, ExternalLink, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
  keyPrefix?: string | null;
  onRefreshStatus: () => void;
}

export const ApiStatusModal: React.FC<ApiStatusModalProps> = ({
  isOpen,
  onClose,
  isConfigured,
  keyPrefix,
  onRefreshStatus,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyEnvName = () => {
    navigator.clipboard.writeText('FAL_KEY');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Fal.ai API Key কনফিগারেশন</h3>
            <p className="text-xs text-slate-400">Playvear Lab-এ HeyGen ভিডিও ইন্টিগ্রেশন</p>
          </div>
        </div>

        {/* Current Status Box */}
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border mb-5 ${
            isConfigured
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
              : 'border-amber-500/40 bg-amber-950/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-semibold">
                {isConfigured ? 'FAL_KEY সফলভাবে সংযুক্ত রয়েছে!' : 'FAL_KEY সেট করা প্রয়োজন'}
              </div>
              <div className="text-[11px] opacity-80 font-mono mt-0.5">
                {isConfigured ? `Key: ${keyPrefix}` : 'সার্ভার এখনো কোনো এপিআই কি খুঁজে পায়নি'}
              </div>
            </div>
          </div>

          <button
            onClick={onRefreshStatus}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition-colors border border-slate-700"
          >
            রিফ্রেশ চেক
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3.5 text-xs text-slate-300">
          <p className="font-semibold text-slate-100">কীভাবে আপনি API Key যুক্ত করবেন?</p>

          <div className="flex gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-indigo-300 text-[11px] font-bold">
              ১
            </span>
            <div>
              <p className="text-slate-200 font-medium">Fal.ai থেকে আপনার কি (Key) কপি করুন:</p>
              <a
                href="https://fal.ai/dashboard/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 mt-1 font-medium"
              >
                <span>fal.ai/dashboard/keys-এ যান</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-indigo-300 text-[11px] font-bold">
              ২
            </span>
            <div className="flex-1">
              <p className="text-slate-200 font-medium">AI Studio-এর Secrets প্যানেল খুলুন:</p>
              <p className="text-slate-400 mt-0.5">
                বাম পাশের প্যানেল বা Settings-এ গিয়ে <strong className="text-slate-200">Secrets</strong> মেনু খুলুন।
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-indigo-300 text-[11px] font-bold">
              ৩
            </span>
            <div className="flex-1">
              <p className="text-slate-200 font-medium">নতুন Secret ভ্যারিয়েবল যোগ করুন:</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  FAL_KEY
                </span>
                <button
                  onClick={handleCopyEnvName}
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'কপি হয়েছে' : 'নাম কপি'}</span>
                </button>
              </div>
              <p className="text-slate-400 mt-1">
                Value-এর ঘরে আপনার কপি করা Fal.ai কি-টি পেস্ট করে সেভ করুন।
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
