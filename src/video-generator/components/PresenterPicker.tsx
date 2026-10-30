import React, { useRef } from 'react';
import { Upload, User, Check, Image as ImageIcon } from 'lucide-react';
import { PRESET_PRESENTERS } from '../data/presets';
import { PresetPresenter } from '../types';

interface PresenterPickerProps {
  selectedImageUrl: string;
  onSelectImage: (url: string, name?: string) => void;
  onApplyPromptPreset?: (prompt: string) => void;
}

export const PresenterPicker: React.FC<PresenterPickerProps> = ({
  selectedImageUrl,
  onSelectImage,
  onApplyPromptPreset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSelectImage(reader.result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (presenter: PresetPresenter) => {
    onSelectImage(presenter.imagePath, presenter.name);
    if (onApplyPromptPreset) {
      onApplyPromptPreset(presenter.recommendedPrompt);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <User className="h-4 w-4 text-indigo-400" />
          <span>১. প্রেজেন্টারের ছবি (Presenter Portrait)</span>
        </label>
        <span className="text-xs text-slate-500">JPG, PNG, WebP · Max 15MB</span>
      </div>

      {/* Preset Presenters 1-click select */}
      <div>
        <p className="text-xs text-slate-400 mb-2">স্টুডিও প্রিসেট অ্যাভাটার বেছে নিন অথবা নিজের ছবি আপলোড করুন:</p>
        <div className="grid grid-cols-2 gap-3">
          {PRESET_PRESENTERS.map((presenter) => {
            const isSelected = selectedImageUrl === presenter.imagePath;
            return (
              <button
                key={presenter.id}
                type="button"
                onClick={() => handleSelectPreset(presenter)}
                className={`group relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-800 border border-slate-700">
                  <img
                    src={presenter.imagePath}
                    alt={presenter.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white drop-shadow" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                    {presenter.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{presenter.role}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Custom Image Area */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                try {
                  localStorage.setItem('playvear_recent_custom_image', reader.result);
                } catch {}
                onSelectImage(reader.result, file.name);
              }
            };
            reader.readAsDataURL(file);
          }}
        />
        {(() => {
          let recentImg: string | null = null;
          try {
            recentImg = localStorage.getItem('playvear_recent_custom_image');
          } catch {}
          
          if (recentImg) {
            return (
              <div
                onClick={() => onSelectImage(recentImg!)}
                className="relative group rounded-xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] border border-cyan-500/40 bg-slate-900/40 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.15)]"
              >
                <img
                  src={recentImg}
                  alt="Recent Custom"
                  className="w-full h-full object-cover"
                />
                <div className="w-full py-2 px-1.5 bg-[#070b14] border-t border-cyan-900/40 text-center shrink-0 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-[11px] font-semibold text-cyan-300 hover:text-white uppercase tracking-wide transition-colors cursor-pointer"
                  >
                    চেঞ্জ ইমেজ
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-center hover:border-indigo-500/80 hover:bg-slate-900/70 cursor-pointer transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-300 transition-colors">
                <Upload className="h-5 w-5" />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-300">
                নিজের ছবি নির্বাচন করতে ক্লিক করুন (বা ড্র্যাগ করুন)
              </p>
            </div>
          );
        })()}
      </div>

      {/* Active Selection Indicator */}
      {selectedImageUrl && (
        <div className="flex items-center gap-3 p-2 bg-slate-900/80 rounded-lg border border-slate-800/80 text-xs text-slate-300">
          <div className="h-7 w-7 rounded overflow-hidden bg-slate-800 shrink-0">
            <img
              src={selectedImageUrl}
              alt="Active selection"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="truncate flex-1">প্রেজেন্টার ছবি প্রস্তুত রয়েছে</span>
          <span className="text-[11px] text-emerald-400 font-medium shrink-0 flex items-center gap-1">
            <Check className="h-3 w-3" /> সিলেক্টেড
          </span>
        </div>
      )}
    </div>
  );
};
