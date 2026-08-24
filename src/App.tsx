import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroStatus } from './components/HeroStatus';
import { ServiceCard } from './components/ServiceCard';
import { IncidentSection } from './components/IncidentSection';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { INITIAL_STATUS_DATA } from './mockData';
import { SystemStatusData, ServiceCategory } from './types';
import { DICTIONARY, Language } from './i18n';
import {
  Search,
  Server,
  Globe,
  Database,
  Cpu,
  Cloud,
  ShieldCheck,
  FolderTree,
} from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'public' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin' ? 'admin' : 'public';
    }
    return 'public';
  });
  const [statusData, setStatusData] = useState<SystemStatusData>(INITIAL_STATUS_DATA);
  
  // Persistent Dark Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('apple_status_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (_e) {
      return false;
    }
  });

  // Persistent Language state (ZH / EN)
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('apple_status_lang');
      if (saved === 'en' || saved === 'zh') return saved as Language;
      return navigator.language && navigator.language.startsWith('zh') ? 'zh' : 'zh';
    } catch (_e) {
      return 'zh';
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timelineDays, setTimelineDays] = useState<number>(90);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const t = DICTIONARY[lang];

  // Listen to popstate (HTML5 History API) and hash changes
  useEffect(() => {
    const handleLocationChange = () => {
      const isPathAdmin = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
      setCurrentView(isPathAdmin ? 'admin' : 'public');
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Synchronize and persist dark mode class to html element
  useEffect(() => {
    try {
      localStorage.setItem('apple_status_theme', darkMode ? 'dark' : 'light');
    } catch (_e) {}

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Synchronize and persist html lang attribute (prevents browser auto-translation bar popup)
  useEffect(() => {
    try {
      localStorage.setItem('apple_status_lang', lang);
    } catch (_e) {}

    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  // Try fetching live data from /api/status (if deployed alongside Worker)
  const fetchLiveStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const json = await res.json();
        if (json.categories) {
          setStatusData((prev) => ({
            ...prev,
            ...json,
            lastUpdated: new Date().toISOString(),
          }));
        }
      }
    } catch (_err) {
      setStatusData((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
      }));
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Auto-refresh every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLiveStatus();
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic Category Icon helper
  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'globe':
        return <Globe className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'cpu':
        return <Cpu className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'cloud':
        return <Cloud className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'shield':
        return <ShieldCheck className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'folder':
        return <FolderTree className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'server':
      default:
        return <Server className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
    }
  };

  // Localized Category Name helper (Presets use dictionary, custom categories use user name)
  const getCategoryDisplayName = (cat: ServiceCategory, isShort: boolean = false) => {
    if (lang === 'zh') {
      if (cat.id === 'core-edge') return isShort ? t.catCoreEdgeShort : t.catCoreEdge;
      if (cat.id === 'web-apps') return isShort ? t.catWebAppsShort : t.catWebApps;
      if (cat.id === 'data-storage') return isShort ? t.catDataStorageShort : t.catDataStorage;
    }
    return isShort ? (cat.shortName || cat.name) : cat.name;
  };

  const getCategoryDisplayDesc = (cat: ServiceCategory) => {
    if (lang === 'zh') {
      if (cat.id === 'core-edge') return t.catCoreEdgeDesc;
      if (cat.id === 'web-apps') return t.catWebAppsDesc;
      if (cat.id === 'data-storage') return t.catDataStorageDesc;
    }
    return cat.description;
  };

  // If on Admin View, render the macOS System Settings style Admin Panel
  if (currentView === 'admin') {
    return (
      <AdminPanel
        onBackToPublic={() => {
          window.history.pushState({}, '', '/');
          setCurrentView('public');
        }}
        t={t}
        lang={lang}
        setLang={setLang}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onUpdateIncidents={(active, past) => {
          setStatusData((prev) => ({
            ...prev,
            activeIncidents: active,
            pastIncidents: past,
            systemStatus: active.length > 0 ? (active.some((i) => i.severity === 'critical') ? 'outage' : 'degraded') : 'operational',
          }));
        }}
      />
    );
  }

  // Filter services based on category and search
  const filteredCategories = statusData.categories
    .map((category) => {
      const matchingServices = category.services.filter((svc) => {
        const matchesCategory = selectedCategory === 'all' || category.id === selectedCategory;
        const matchesSearch =
          svc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (svc.description && svc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          svc.region.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      });

      return {
        ...category,
        services: matchingServices,
      };
    })
    .filter((cat) => cat.services.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-300">
      {/* Apple blurred top navbar with Admin Portal button (Public Read-Only) */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        lang={lang}
        setLang={setLang}
        t={t}
        isRefreshing={isRefreshing}
        onRefresh={fetchLiveStatus}
        onOpenAdmin={() => {
          window.history.pushState({}, '', '/admin');
          setCurrentView('admin');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 pb-14 space-y-6">
        {/* Compact Apple Status Bar */}
        <HeroStatus
          status={statusData.systemStatus}
          t={t}
          overallUptime={statusData.overallUptime90d}
          avgLatency={statusData.avgLatencyMs}
          activeRegions={statusData.activeRegionsCount}
          totalProbes={statusData.totalProbesToday}
        />

        {/* Filter and Control Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Apple Segmented Category Tabs (Fully Dynamic) */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#e5e5ea]/80 dark:bg-white/10 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-semibold'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {t.allServices}
            </button>
            {statusData.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-semibold'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {getCategoryDisplayName(cat, true)}
              </button>
            ))}
          </div>

          {/* Right Controls: Search & Days Selector */}
          <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 md:w-44">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-white/10 border border-black/[0.06] dark:border-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20"
              />
            </div>

            {/* Days Scope Selector */}
            <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[#e5e5ea]/80 dark:bg-white/10 text-xs flex-shrink-0">
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setTimelineDays(d)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    timelineDays === d
                      ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-semibold'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-neutral-300'
                  }`}
                >
                  {d === 30 ? t.days30 : d === 60 ? t.days60 : t.days90}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Services Grouped by Category */}
        <div className="space-y-8">
          {filteredCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-white dark:bg-white/10 border border-black/[0.05] dark:border-white/10 flex items-center justify-center shadow-xs">
                    {getCategoryIcon(category.icon)}
                  </div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {getCategoryDisplayName(category, false)}
                  </h2>
                  {getCategoryDisplayDesc(category) && (
                    <span className="text-xs text-[#86868b] dark:text-[#a1a1a6] hidden sm:inline">
                      — {getCategoryDisplayDesc(category)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#86868b] dark:text-[#a1a1a6] font-medium">
                  {category.services.length} {t.endpointsCount}
                </span>
              </div>

              <div className="space-y-3">
                {category.services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    timelineDays={timelineDays}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="p-12 text-center rounded-3xl glass-panel text-[#86868b] dark:text-[#a1a1a6] space-y-2">
              <p className="font-medium text-[#1d1d1f] dark:text-white">{t.noServicesFound}</p>
              <p className="text-xs">{t.noServicesHint}</p>
            </div>
          )}
        </div>

        {/* Incidents & Maintenance Section */}
        <IncidentSection
          activeIncidents={statusData.activeIncidents}
          pastIncidents={statusData.pastIncidents}
          t={t}
        />

        {/* Apple Footer */}
        <Footer lastUpdated={statusData.lastUpdated} t={t} />
      </main>
    </div>
  );
}

export default App;
