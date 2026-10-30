import React, { useState, useRef, useEffect } from 'react';
import { CharacterId, CHARACTERS } from '../types';
import { ClonedVoiceItem } from './VoiceCloningModal';
import { GoogleUser } from './GoogleAuthModal';
import { MoreVertical, ShieldCheck, Plus, User as UserIcon, LogOut, Zap, Coins } from 'lucide-react';

interface HeaderProps {
  engineMode: 'v2' | 'v3' | 'v4';
  selectedCharacter: CharacterId;
  onSelectCharacter: (char: CharacterId) => void;
  selectedClonedVoiceId: string | null;
  onSelectClonedVoiceId: (id: string) => void;
  v3Voices: ClonedVoiceItem[];
  v4Voices?: ClonedVoiceItem[];
  onOpenVoiceCloneModal: () => void;
  onOpenHistory: () => void;
  onOpenSubtitleGuide: () => void;
  onOpenCartesiaRotator?: () => void;
  onOpenAdminPanel?: () => void;
  historyCount: number;
  activeKeyInfo?: {
    index: number;
    label: string;
    charsUsed: number;
    maxLimit: number;
  };
  hasPaidKey?: boolean;
  availableKeys?: { index: number; label: string; customVoicesCount?: number }[];
  onSwitchKey?: (keyIndex: number) => void;
  googleUser?: GoogleUser | null;
  onOpenGoogleAuth?: () => void;
  onLogout?: () => void;
  userCredit?: number;
  showVoiceSelector?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  engineMode,
  selectedCharacter,
  onSelectCharacter,
  selectedClonedVoiceId,
  onSelectClonedVoiceId,
  v3Voices,
  v4Voices = [],
  onOpenVoiceCloneModal,
  onOpenHistory,
  onOpenSubtitleGuide,
  onOpenCartesiaRotator,
  onOpenAdminPanel,
  historyCount: _historyCount,
  activeKeyInfo: _activeKeyInfo,
  hasPaidKey: _hasPaidKey,
  availableKeys: _availableKeys = [],
  onSwitchKey: _onSwitchKey,
  googleUser,
  onOpenGoogleAuth,
  onLogout,
  userCredit = 0,
  showVoiceSelector = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isV2 = engineMode === 'v2';
  const isV3 = engineMode === 'v3';
  const isV4 = engineMode === 'v4';

  const v4VoiceList = v4Voices;

  const activeV2Char = CHARACTERS.find((c) => c.id === selectedCharacter) || CHARACTERS[0];
  const activeV3Char = v3Voices.find((v) => v.id === selectedClonedVoiceId) || (v3Voices.length > 0 ? v3Voices[0] : null);
  const activeV4Char = v4VoiceList.find((v) => v.id === selectedClonedVoiceId) || (v4VoiceList.length > 0 ? v4VoiceList[0] : null);

  const activeCategoryObj = CHARACTERS.find((c) => c.id === selectedCharacter) || CHARACTERS[0];

  const activeName = isV4
    ? (activeV4Char?.name?.replace(/^[💎\s]+/, '') || 'No Voice')
    : isV3
    ? (activeV3Char?.name?.replace(/^[💎\s]+/, '') || 'No Voice')
    : activeV2Char.name;

  const activeRole = isV4
    ? `${activeV4Char?.name?.replace(/^[💎\s]+/, '') || 'Voice'} • ${activeCategoryObj.name.replace(/^\d+\.\s*/, '').split('(')[0].trim()}`
    : isV3
    ? `${activeV3Char?.name?.replace(/^[💎\s]+/, '') || 'Voice'} • ${activeCategoryObj.name.replace(/^\d+\.\s*/, '').split('(')[0].trim()}`
    : activeV2Char.role;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
        setIsVoiceDropdownOpen(false);
        setIsCategoryDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsMenuOpen(false);
        setIsVoiceDropdownOpen(false);
        setIsCategoryDropdownOpen(false);
      }
    };

    const handleCloseAllMenus = () => {
      setIsOpen(false);
      setIsMenuOpen(false);
      setIsVoiceDropdownOpen(false);
      setIsCategoryDropdownOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('close-all-header-menus', handleCloseAllMenus);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('close-all-header-menus', handleCloseAllMenus);
    };
  }, []);

  const handleHistoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    onOpenHistory();
  };



  const handleSubtitleGuideClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    onOpenSubtitleGuide();
  };

  const renderUserProfileSection = () => {
    if (!googleUser) return null;

    const isNewAccount = userCredit <= 0;

    return (
      <div className="flex flex-col items-end leading-none mr-2 select-none pr-2 border-r border-stone-800/80">
        <span className="text-[8px] font-bold text-cyan-200 truncate max-w-[80px] sm:max-w-[100px]">
          {googleUser.name.split(' ')[0]}
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[5px] font-bold uppercase tracking-tighter text-stone-500">
            credit
          </span>
          <span className="text-[6px] font-bold font-mono text-stone-500">
            {userCredit.toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  const renderThreeDotsButton = () => (
    <div ref={menuRef} className="relative flex items-center">
      {/* Moved User Info to align with 3-dots side */}
      {renderUserProfileSection()}

      <button
        id="header-options-menu-btn"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen((prev) => !prev);
        }}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="More options"
        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
          isMenuOpen
            ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300'
            : 'bg-[#131823] hover:bg-[#1a2233] border-stone-800 hover:border-cyan-500/50 text-stone-300 hover:text-cyan-300'
        }`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* 3 Dots Menu Options */}
      {isMenuOpen && (
        <div
          id="header-options-dropdown"
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-52 bg-[#12161f] border border-stone-800 rounded-lg shadow-2xl z-50 p-1 flex flex-col backdrop-blur-md"
        >
          {/* Sign In / Sign Out Option in 3 Dots Menu */}
          {googleUser ? (
            <button
              id="menu-option-signout"
              type="button"
              role="menuitem"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(false);
                onLogout?.();
              }}
              onClick={() => {
                setIsMenuOpen(false);
                onLogout?.();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded cursor-pointer transition-colors flex items-center gap-2 border-b border-stone-800/80 mb-0.5 pb-2"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              id="menu-option-signin"
              type="button"
              role="menuitem"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(false);
                onOpenGoogleAuth?.();
              }}
              onClick={() => {
                setIsMenuOpen(false);
                onOpenGoogleAuth?.();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/40 rounded cursor-pointer transition-colors flex items-center gap-2 border-b border-stone-800/80 mb-0.5 pb-2"
            >
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sign In</span>
            </button>
          )}

          {googleUser?.email === 'vortexesports150@gmail.com' && (onOpenAdminPanel || onOpenCartesiaRotator) && (
            <button
              id="menu-option-admin-panel"
              type="button"
              role="menuitem"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(false);
                (onOpenAdminPanel || onOpenCartesiaRotator)?.();
              }}
              onClick={() => {
                setIsMenuOpen(false);
                (onOpenAdminPanel || onOpenCartesiaRotator)?.();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/40 rounded cursor-pointer transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Panel</span>
            </button>
          )}

          {googleUser && (
            <button
              id="menu-option-add-credits"
              type="button"
              role="menuitem"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(false);
                window.dispatchEvent(new CustomEvent('open-credits-modal'));
              }}
              onClick={() => {
                setIsMenuOpen(false);
                window.dispatchEvent(new CustomEvent('open-credits-modal'));
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/40 rounded cursor-pointer transition-colors flex items-center gap-2"
            >
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              <span>Add Credits</span>
            </button>
          )}

          <button
            id="menu-option-history"
            type="button"
            role="menuitem"
            onPointerDown={handleHistoryClick}
            onClick={handleHistoryClick}
            className="w-full text-left px-3 py-2 text-xs font-medium text-stone-200 hover:text-cyan-300 hover:bg-stone-800/60 rounded cursor-pointer transition-colors border-t border-stone-800/80 mt-0.5 pt-2"
          >
            History
          </button>
          <button
            id="menu-option-subtitle-guide"
            type="button"
            role="menuitem"
            onPointerDown={handleSubtitleGuideClick}
            onClick={handleSubtitleGuideClick}
            className="w-full text-left px-3 py-2 text-xs font-medium text-stone-200 hover:text-cyan-300 hover:bg-stone-800/60 rounded cursor-pointer transition-colors"
          >
            Subtitle Usage Guide
          </button>
        </div>
      )}
    </div>
  );

  return (
    <header
      id="main-header"
      className="w-full border-b border-stone-800/80 bg-[#0d1017]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5 sm:px-6 shadow-sm"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Brand Header on left */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div id="brand-header" className="flex items-center gap-2 group cursor-default select-none pt-0.5">
            <img
              src="/playvear-brand.webp"
              alt="PlayVear"
              className="h-7 sm:h-8 w-auto object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <span className="text-xl sm:text-2xl font-black tracking-tight text-[#00f3ff] drop-shadow-[0_0_12px_rgba(0,243,255,0.8)] font-['Plus_Jakarta_Sans',sans-serif]">
              Labs
            </span>
          </div>

          <div className="sm:hidden flex items-center gap-2">
            {renderThreeDotsButton()}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {renderThreeDotsButton()}
        </div>
      </div>
    </header>
  );
};
