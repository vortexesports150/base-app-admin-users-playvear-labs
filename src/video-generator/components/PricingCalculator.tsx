import React from 'react';
import { DollarSign, Zap, ShieldCheck, HelpCircle } from 'lucide-react';
import { SUPPORTED_MODELS } from '../data/presets';

interface PricingCalculatorProps {
  selectedDuration: number;
  selectedResolution: '480p' | '768p' | '1080p' | '2K';
  selectedModel: string;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  selectedDuration,
  selectedResolution,
  selectedModel,
}) => {
  const currentModel = SUPPORTED_MODELS.find((m) => m.id === selectedModel) || SUPPORTED_MODELS[0];
  
  // Rate per second based on resolution
  const is1080p = selectedResolution === '1080p' || selectedResolution === '2K';
  const ratePerSec = is1080p ? currentModel.costPerSec1080p : currentModel.costPerSec768p;
  
  const totalCostUsd = ratePerSec * selectedDuration;
  const totalCostBdt = totalCostUsd * 120; // 1 USD = 120 BDT

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <span>স্বচ্ছ প্রাইসিং ও খরচ ক্যালকুলেটর (Pricing Calculator)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Fal.ai-এর অফিসিয়াল প্রতি-সেকেন্ড বিলিং অনুযায়ী বর্তমান রেন্ডারের আনুমানিক খরচ:
          </p>
        </div>

        {/* Highlight cost box */}
        <div className="flex items-baseline gap-2 bg-emerald-950/40 border border-emerald-500/30 px-4 py-2 rounded-xl text-emerald-300">
          <span className="text-2xl font-bold font-mono">${totalCostUsd.toFixed(2)}</span>
          <span className="text-xs text-emerald-400 font-medium font-mono">
            (৳{totalCostBdt.toFixed(1)} টাকা)
          </span>
          <span className="text-[11px] text-slate-400">/ {selectedDuration}s @ {selectedResolution}</span>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold">
              <th className="pb-3 pr-4">মডেলের নাম (Model)</th>
              <th className="pb-3 px-4">প্রতি সেকেন্ডের খরচ</th>
              <th className="pb-3 px-4">{selectedDuration}s ভিডিওর মোট খরচ (ডলার)</th>
              <th className="pb-3 px-4">{selectedDuration}s ভিডিওর খরচ (টাকায়)</th>
              <th className="pb-3 pl-4">বিশেষ সুবিধা</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {SUPPORTED_MODELS.map((model) => {
              const rate = is1080p ? model.costPerSec1080p : model.costPerSec768p;
              const costUsd = rate * selectedDuration;
              const costBdt = costUsd * 120;
              const isSelected = model.id === selectedModel;

              return (
                <tr
                  key={model.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-indigo-950/30 text-white font-medium' : 'text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3.5 pr-4 font-sans">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{model.name}</span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500 text-white uppercase font-sans">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">{model.badge}</div>
                  </td>
                  <td className="py-3.5 px-4 tabular-nums">${rate.toFixed(3)}/s</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold tabular-nums">
                    ${costUsd.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold tabular-nums">
                    ৳{costBdt.toFixed(1)} টাকা
                  </td>
                  <td className="py-3.5 pl-4 text-slate-400 font-sans text-[11px] max-w-xs">
                    {model.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Helpful notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-slate-400">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
          <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200 block mb-0.5">কেন HeyGen সবচেয়ে সাশ্রয়ী?</span>
            HeyGen প্রতি সেকেন্ডে মাত্র $0.02 ডলার চার্জ করে, যার ফলে ১০ সেকেন্ডের একটি পূর্ণাঙ্গ প্রেজেন্টার ভিডিও বানাতে মাত্র ২৪ টাকা খরচ হয়।
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-200 block mb-0.5">কোনো মাসিক হিডেন চার্জ নেই</span>
            Fal.ai সম্পূর্ণ পে-অ্যাজ-ইউ-গো (Pay-as-you-go)। আপনি যে কয়টি ভিডিও বানাবেন শুধু সেগুলোর জন্য অ্যাকাউন্ট ব্যালেন্স থেকে কাটা যাবে।
          </div>
        </div>
      </div>
    </div>
  );
};
