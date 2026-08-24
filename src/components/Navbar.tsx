import React from 'react';
import {
  Activity,
  Sun,
  Moon,
  RotateCw,
  Globe,
  Sliders,
} from 'lucide-react';
import { Translations, Language } from '../i18n';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  lang: Language;
  setLang: (val: Language | ((prev: Language) => Language)) => void;
  t: Translations;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  setDarkMode,
  lang,
  setLang,
  t,
  isRefreshing,
  onRefresh,
  onOpenAdmin,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full glass-nav transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand with Pure Glyph Icon */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Activity className="w-5 h-5 text-[#1d1d1f] dark:text-[#f5f5f7] stroke-[1.85] flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm sm:text-[15px] tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
              {t.navTitle}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t.live}
            </span>
          </div>
        </div>

        {/* Right: Actions (Public Read-Only) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Admin Switch Button */}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#e5e5ea]/80 hover:bg-[#d1d1d6] dark:bg-white/10 dark:hover:bg-white/15 text-[#1d1d1f] dark:text-[#f5f5f7] transition-all active:scale-95 cursor-pointer"
              title={t.adminPortal}
            >
              <Sliders className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />
              <span className="hidden sm:inline">{t.adminPortal}</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#e5e5ea]/80 hover:bg-[#d1d1d6] dark:bg-white/10 dark:hover:bg-white/15 text-[#1d1d1f] dark:text-[#f5f5f7] transition-all active:scale-95 cursor-pointer"
            title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6]" />
            <span className="text-[11px] sm:text-xs">{t.toggleLang}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 rounded-full text-[#48484a] dark:text-[#d1d1d6] hover:bg-[#e5e5ea]/70 dark:hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
            title={t.refresh}
            aria-label={t.refresh}
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#1d1d1f] dark:text-white' : ''}`} />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className="p-1.5 sm:p-2 rounded-full text-[#48484a] dark:text-[#d1d1d6] hover:bg-[#e5e5ea]/70 dark:hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
            title={darkMode ? t.toggleThemeLight : t.toggleThemeDark}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-[#f5f5f7]" /> : <Moon className="w-4 h-4 text-[#1d1d1f]" />}
          </button>
        </div>
      </div>
    </header>
  );
};
