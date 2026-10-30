import React from 'react';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { PlayvearIcon } from '../../components/PlayvearIcon';

interface NavbarProps {
  isConfigured: boolean;
  onOpenApiModal: () => void;
  activeSection: 'studio' | 'pricing' | 'presets' | 'guide';
  setActiveSection: (section: 'studio' | 'pricing' | 'presets' | 'guide') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConfigured,
  onOpenApiModal,
  activeSection,
  setActiveSection,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('studio')}
            className="flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-white hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/30 border border-cyan-400/30 text-white shadow-sm shadow-cyan-500/20">
              <PlayvearIcon className="h-4 w-4" />
            </div>
            <span>Playvear Lab</span>
          </button>
          <span className="hidden sm:inline-block text-xs text-slate-500 border-l border-slate-800 pl-3 font-medium">
            HeyGen · Fal.ai Studio
          </span>
        </div>

        {/* Zone 2: Navigation Links (Single-line unboxed text) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveSection('studio')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'studio' ? 'text-white' : 'hover:text-slate-200'
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveSection('presets')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'presets' ? 'text-white' : 'hover:text-slate-200'
            }`}
          >
            Presenters
          </button>
          <button
            onClick={() => setActiveSection('pricing')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'pricing' ? 'text-white' : 'hover:text-slate-200'
            }`}
          >
            Pricing & Specs
          </button>
          <button
            onClick={() => setActiveSection('guide')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'guide' ? 'text-white' : 'hover:text-slate-200'
            }`}
          >
            API Setup Guide
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (API Key Setup & Status) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenApiModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 ${
              isConfigured
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            {isConfigured ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>FAL_KEY Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>Configure FAL_KEY</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
