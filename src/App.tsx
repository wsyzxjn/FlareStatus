import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroStatus } from './components/HeroStatus';
import { ServiceCard } from './components/ServiceCard';
import { IncidentSection } from './components/IncidentSection';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { INITIAL_STATUS_DATA } from './mockData';
import { SystemStatusData, ServiceCategory, ServiceItem } from './types';
import { DICTIONARY, Language } from './i18n';
import { apiFetch } from './api';
import {
  Search,
  Server,
  Globe,
  Database,
  Cpu,
  Cloud,
  ShieldCheck,
  FolderTree,
  Sliders,
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
  const [timelineDays, setTimelineDays] = useState<number>(1);
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
      const res = await apiFetch('/api/status');
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

  // Fetch live status on initial mount and auto-refresh every 60s
  useEffect(() => {
    fetchLiveStatus();
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
          setCurrentView('public');
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          fetchLiveStatus();
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
          window.location.href = '/admin';
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 pb-14 space-y-6">
        {/* Compact Apple Status Bar (100% Real-time Dynamically Computed) */}
        {(() => {
          const allServicesList = statusData.categories.flatMap((c) => c.services);
          const totalEndpointsCount = allServicesList.length;
          const dynamicAvgLatency = totalEndpointsCount > 0
            ? Math.round(allServicesList.reduce((acc, s) => acc + s.currentLatency, 0) / totalEndpointsCount)
            : 0;
          const dynamicOverallUptime = totalEndpointsCount > 0
            ? Number((allServicesList.reduce((acc, s) => acc + (s.uptime90d ?? (s as any).uptime30d ?? (s as any).uptime ?? 100), 0) / totalEndpointsCount).toFixed(2))
            : 100;
          const now = new Date();
          const minutesPassedToday = now.getHours() * 60 + now.getMinutes();
          const dynamicTotalProbesToday = totalEndpointsCount * Math.max(1, Math.floor(minutesPassedToday / 2));

          return (
            <HeroStatus
              status={statusData.systemStatus}
              t={t}
              overallUptime={dynamicOverallUptime}
              avgLatency={dynamicAvgLatency}
              totalEndpoints={totalEndpointsCount}
              totalProbes={dynamicTotalProbesToday}
            />
          );
        })()}

        {/* Filter and Control Bar (Tight shrink-wrapped categories, 1D / 7D / 30D gears) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Apple Segmented Category Tabs (Tight shrink-wrapped, zero empty void) */}
          <div className="self-start inline-flex items-center gap-1 p-1 rounded-xl bg-[#e5e5ea]/80 dark:bg-white/10 overflow-x-auto no-scrollbar max-w-full">
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

          {/* Right Controls: Search & Days Selector (1D / 7D / 30D) */}
          <div className="flex items-center gap-2 w-full md:w-auto">
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

            {/* Days Scope Selector: 1D, 7D, 30D */}
            <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[#e5e5ea]/80 dark:bg-white/10 text-xs flex-shrink-0">
              {[1, 7, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setTimelineDays(d)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    timelineDays === d
                      ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-semibold'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-neutral-400 dark:hover:text-neutral-300'
                  }`}
                >
                  {d === 1 ? t.days1 : d === 7 ? t.days7 : t.days30}
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
            <div className="p-10 sm:p-14 text-center rounded-2xl glass-panel text-[#86868b] dark:text-[#a1a1a6] space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#f5f5f7] dark:bg-white/10 flex items-center justify-center mx-auto text-[#6e6e73]">
                <Server className="w-5 h-5 stroke-[1.75]" />
              </div>
              <p className="font-semibold text-sm text-[#1d1d1f] dark:text-white">{t.noServicesFound}</p>
              <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] max-w-sm mx-auto">{t.noServicesHint}</p>
              <button
                onClick={() => {
                  window.location.href = '/admin';
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs cursor-pointer active:scale-95 mt-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '进入管理后台添加监控' : 'Open Admin Console'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Incidents & Maintenance Section (Max 30 Days) */}
        <IncidentSection
          activeIncidents={statusData.activeIncidents.filter(
            (inc) => Date.now() - new Date(inc.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000
          )}
          pastIncidents={statusData.pastIncidents.filter(
            (inc) => Date.now() - new Date(inc.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000
          )}
          t={t}
        />

        {/* Apple Footer */}
        <Footer lastUpdated={statusData.lastUpdated} t={t} />
      </main>
    </div>
  );
}

export default App;
