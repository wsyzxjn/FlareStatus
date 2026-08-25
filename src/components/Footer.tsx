import React from 'react';
import { Cloud, ArrowUpRight } from 'lucide-react';
import { Translations } from '../i18n';

interface FooterProps {
  lastUpdated: string;
  t: Translations;
}

export const Footer: React.FC<FooterProps> = ({ lastUpdated, t }) => {
  return (
    <footer className="mt-16 pt-8 pb-12 border-t border-[#e5e5ea] dark:border-white/[0.08] text-xs text-[#86868b] dark:text-[#a1a1a6]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Platform info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e5e5ea]/80 dark:bg-white/10 text-[#1d1d1f] dark:text-[#f5f5f7]">
            <Cloud className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />
            <span className="font-medium">Cloudflare Workers + Durable Objects</span>
          </div>
          <span className="text-[11px] hidden sm:inline text-[#86868b]">
            {t.serverlessBadge}
          </span>
        </div>

        {/* Right: Links & Time */}
        <div className="flex items-center gap-4 text-[11px]">
          <a
            href="/api/status"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#1d1d1f] dark:hover:text-white text-[#6e6e73] dark:text-[#a1a1a6] inline-flex items-center gap-0.5 transition-colors"
          >
            <span>{t.jsonFeed}</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
          <span>•</span>
          <span>
            {t.lastSync}: {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </footer>
  );
};
