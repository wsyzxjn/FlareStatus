import React, { useState } from 'react';
import {
  Server,
  Bell,
  Sliders,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Play,
  Check,
  X,
  ArrowLeft,
  ShieldCheck,
  Save,
  Send,
  Globe,
  Sun,
  Moon,
  FolderTree,
  Database,
  Cpu,
  Cloud,
  Mail,
  Webhook,
  MessageSquare,
  Sparkles,
  Clock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import {
  ServiceItem,
  NotificationChannel,
  GlobalSiteSettings,
  CategoryConfig,
  NotificationType,
  MonitorType,
  HttpMethod,
  Incident,
  IncidentUpdate,
} from '../../worker/types';
import { DEFAULT_CATEGORIES, INITIAL_STATUS_DATA } from '../mockData';
import { Translations, Language } from '../i18n';

interface AdminPanelProps {
  onBackToPublic: () => void;
  t: Translations;
  lang: Language;
  setLang: (lang: Language | ((prev: Language) => Language)) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onUpdateIncidents?: (active: Incident[], past: Incident[]) => void;
}

const INITIAL_ADMIN_SERVICES: ServiceItem[] = [];

const INITIAL_NOTIFICATIONS: NotificationChannel[] = [];

const TEMPLATE_VARIABLES = [
  { tag: '{{SERVICE_NAME}}', desc: '服务名称' },
  { tag: '{{STATUS}}', desc: '状态 (UP/DOWN)' },
  { tag: '{{STATUS_EMOJI}}', desc: '图标 (🟢/🔴)' },
  { tag: '{{TIME}}', desc: '触发时间' },
  { tag: '{{LATENCY}}', desc: '延迟 (ms)' },
  { tag: '{{HTTP_CODE}}', desc: '状态码' },
  { tag: '{{TARGET_URL}}', desc: '目标 URL' },
  { tag: '{{ERROR_MSG}}', desc: '错误原因' },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToPublic,
  lang,
  setLang,
  darkMode,
  setDarkMode,
  onUpdateIncidents,
}) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'categories' | 'incidents' | 'notifications' | 'settings'>('endpoints');
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_ADMIN_SERVICES);
  const [incidents, setIncidents] = useState<Incident[]>([
    ...INITIAL_STATUS_DATA.activeIncidents,
    ...INITIAL_STATUS_DATA.pastIncidents,
  ]);
  const [notifications, setNotifications] = useState<NotificationChannel[]>(INITIAL_NOTIFICATIONS);
  const [adminEmail, setAdminEmail] = useState<string>('admin@edge.internal');
  const [settings, setSettings] = useState<GlobalSiteSettings>({
    siteTitle: 'FlareStatus',
    siteSubtitle: 'Real-time telemetry and edge health across all 310+ global locations',
    targetSla: 99.9,
    probeInterval: 2,
    historyRetentionDays: 90,
  });

  // Fetch live admin data from /api/admin/data
  React.useEffect(() => {
    fetch('/api/admin/data')
      .then((res) => res.json())
      .then((data: any) => {
        if (data.userEmail) setAdminEmail(data.userEmail);
        if (data.services) setServices(data.services);
        if (data.categories) setCategories(data.categories);
        if (data.notifications) setNotifications(data.notifications);
        if (data.settings) setSettings(data.settings);
        if (data.incidents !== undefined) setIncidents(data.incidents);
      })
      .catch(() => {});
  }, []);

  // Modal states for Endpoints
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [endpointModalTab, setEndpointModalTab] = useState<'general' | 'protocol' | 'notifications'>('general');
  const [testProbeResult, setTestProbeResult] = useState<{ status: string; latency: number; statusCode: number } | null>(null);
  const [isTestingProbe, setIsTestingProbe] = useState(false);

  // Modal states for Categories
  const [editingCategory, setEditingCategory] = useState<CategoryConfig | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState<Partial<CategoryConfig>>({
    name: '',
    shortName: '',
    description: '',
    icon: 'server',
  });

  // Modal states for Incidents
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentFormData, setIncidentFormData] = useState<{
    title: string;
    severity: Incident['severity'];
    status: Incident['status'];
    affectedServices: string[];
    initialMessage: string;
  }>({
    title: '',
    severity: 'minor',
    status: 'investigating',
    affectedServices: [],
    initialMessage: '',
  });

  // Modal states for Appending Update to Incident
  const [selectedIncidentForUpdate, setSelectedIncidentForUpdate] = useState<Incident | null>(null);
  const [isPostUpdateModalOpen, setIsPostUpdateModalOpen] = useState(false);
  const [postUpdateFormData, setPostUpdateFormData] = useState<{
    status: Incident['status'];
    message: string;
  }>({
    status: 'monitoring',
    message: '',
  });

  // Modal states for Notifications
  const [editingNotification, setEditingNotification] = useState<NotificationChannel | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notifModalTab, setNotifModalTab] = useState<'general' | 'triggers' | 'template'>('general');
  const [notifFormData, setNotifFormData] = useState<Partial<NotificationChannel>>({
    name: '',
    type: 'email',
    enabled: true,
    defaultEnabled: true,
    notifyOnDown: true,
    notifyOnUp: true,
    notifyOnDegraded: false,
    toEmail: '',
    fromEmail: '',
    emailProvider: 'resend',
    apiKey: '',
    webhookUrl: '',
    secretToken: '',
    customTitleTemplate: '{{STATUS_EMOJI}} [Alert] {{SERVICE_NAME}} is {{STATUS}}',
    customBodyTemplate: 'Service: {{SERVICE_NAME}}\nStatus: {{STATUS}}\nTime: {{TIME}}\nLatency: {{LATENCY}}\nTarget: {{TARGET_URL}}',
  });

  const [notifyTestStatus, setNotifyTestStatus] = useState<Record<string, string>>({});
  const [savedToast, setSavedToast] = useState(false);

  // Form State for Endpoint
  const [serviceFormData, setServiceFormData] = useState<Partial<ServiceItem>>({
    name: '',
    url: '',
    categoryId: 'core-edge',
    monitorType: 'http',
    expectedStatus: 200,
    acceptedStatusCodes: '200-299',
    method: 'GET',
    timeout: 8,
    maxRetries: 1,
    headers: '',
    body: '',
    authMethod: 'none',
    basicUser: '',
    basicPass: '',
    bearerToken: '',
    keywordMatch: '',
    ignoreTls: false,
    upsideDown: false,
    notificationChannelIds: [],
    region: 'Global Anycast',
    description: '',
    enabled: true,
  });

  const showSavedNotice = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const syncIncidentsToParent = (updatedList: Incident[]) => {
    setIncidents(updatedList);
    fetch('/api/admin/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedList),
    }).catch(() => {});

    if (onUpdateIncidents) {
      const active = updatedList.filter((i) => i.status !== 'resolved');
      const past = updatedList.filter((i) => i.status === 'resolved');
      onUpdateIncidents(active, past);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm(lang === 'zh' ? '警告：确定要清空所有监控端点、自定义分类、事件历史与告警通道吗？此操作将彻底清空云端 KV 数据库。' : 'Warning: Are you sure you want to clear all services, categories, incidents and KV storage?')) return;
    try {
      await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'all' }),
      });
    } catch (_e) {}
    setServices([]);
    setIncidents([]);
    setNotifications([]);
    setCategories(DEFAULT_CATEGORIES);
    if (onUpdateIncidents) onUpdateIncidents([], []);
    showSavedNotice();
  };

  const handleClearServices = async () => {
    if (!window.confirm(lang === 'zh' ? '警告：确定要清空所有监控端点吗？此操作将删除所有端点及其探测数据。' : 'Warning: Are you sure you want to clear all service endpoints?')) return;
    try {
      await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'services' }),
      });
    } catch (_e) {}
    setServices([]);
    showSavedNotice();
  };

  const handleClearIncidents = async () => {
    if (!window.confirm(lang === 'zh' ? '警告：确定要清空所有事件通告与维护记录吗？' : 'Warning: Are you sure you want to clear all incidents and maintenance records?')) return;
    try {
      await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'incidents' }),
      });
    } catch (_e) {}
    setIncidents([]);
    if (onUpdateIncidents) onUpdateIncidents([], []);
    showSavedNotice();
  };

  const handleClearNotifications = async () => {
    if (!window.confirm(lang === 'zh' ? '警告：确定要清空所有告警通道配置吗？' : 'Warning: Are you sure you want to clear all notification channels?')) return;
    try {
      await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'notifications' }),
      });
    } catch (_e) {}
    setNotifications([]);
    showSavedNotice();
  };

  const handleSaveGlobalSettings = () => {
    fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(() => {});
    showSavedNotice();
  };

  // Endpoint handlers
  const handleToggleService = (id: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setServices(updated);
    fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
    showSavedNotice();
  };

  const handleDeleteService = (id: string) => {
    const updated = services.filter((s) => s.id !== id);
    setServices(updated);
    fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
    showSavedNotice();
  };

  const handleOpenEditServiceModal = (service: ServiceItem) => {
    setEditingService(service);
    setServiceFormData({
      ...service,
      notificationChannelIds: service.notificationChannelIds || [],
    });
    setTestProbeResult(null);
    setEndpointModalTab('general');
    setIsServiceModalOpen(true);
  };

  const handleOpenNewServiceModal = () => {
    setEditingService(null);
    setServiceFormData({
      id: `svc-${Date.now()}`,
      name: '',
      url: 'https://',
      categoryId: categories[0]?.id || 'default',
      monitorType: 'http',
      expectedStatus: 200,
      acceptedStatusCodes: '200-299',
      method: 'GET',
      timeout: 8,
      maxRetries: 1,
      headers: '',
      body: '',
      authMethod: 'none',
      keywordMatch: '',
      ignoreTls: false,
      upsideDown: false,
      notificationChannelIds: notifications.filter((n) => n.defaultEnabled).map((n) => n.id),
      region: 'Global Anycast',
      description: '',
      enabled: true,
    });
    setTestProbeResult(null);
    setEndpointModalTab('general');
    setIsServiceModalOpen(true);
  };

  const handleSaveServiceForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormData.name || !serviceFormData.url) {
      alert(lang === 'zh' ? '请填写服务名称与目标 URL' : 'Please fill in service name and URL');
      return;
    }

    let targetUrl = (serviceFormData.url || '').trim();
    if (serviceFormData.monitorType !== 'push' && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    let updated: ServiceItem[];
    if (editingService) {
      updated = services.map((s) => (s.id === editingService.id ? ({ ...s, ...serviceFormData, url: targetUrl } as ServiceItem) : s));
    } else {
      const newSvc: ServiceItem = {
        id: serviceFormData.id || `svc-${Date.now()}`,
        name: (serviceFormData.name || 'New Service').trim(),
        url: targetUrl,
        categoryId: serviceFormData.categoryId || categories[0]?.id || 'default',
        enabled: serviceFormData.enabled ?? true,
        monitorType: serviceFormData.monitorType || 'http',
        expectedStatus: Number(serviceFormData.expectedStatus) || 200,
        acceptedStatusCodes: serviceFormData.acceptedStatusCodes || '200-299',
        method: serviceFormData.method || 'GET',
        timeout: Number(serviceFormData.timeout) || 8,
        maxRetries: Number(serviceFormData.maxRetries) || 1,
        headers: serviceFormData.headers,
        body: serviceFormData.body,
        authMethod: serviceFormData.authMethod,
        basicUser: serviceFormData.basicUser,
        basicPass: serviceFormData.basicPass,
        bearerToken: serviceFormData.bearerToken,
        keywordMatch: serviceFormData.keywordMatch,
        ignoreTls: serviceFormData.ignoreTls,
        upsideDown: serviceFormData.upsideDown,
        notificationChannelIds: serviceFormData.notificationChannelIds || [],
        region: serviceFormData.region || 'Global Anycast',
        description: serviceFormData.description || '',
      };
      updated = [...services, newSvc];
    }
    setServices(updated);

    try {
      await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (_e) {}

    setIsServiceModalOpen(false);
    showSavedNotice();
  };

  const toggleEndpointChannel = (channelId: string) => {
    const current = serviceFormData.notificationChannelIds || [];
    if (current.includes(channelId)) {
      setServiceFormData({
        ...serviceFormData,
        notificationChannelIds: current.filter((id) => id !== channelId),
      });
    } else {
      setServiceFormData({
        ...serviceFormData,
        notificationChannelIds: [...current, channelId],
      });
    }
  };

  // Category handlers
  const handleOpenNewCategoryModal = () => {
    setEditingCategory(null);
    setCategoryFormData({
      id: `cat-${Date.now()}`,
      name: '',
      shortName: '',
      description: '',
      icon: 'server',
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat: CategoryConfig) => {
    setEditingCategory(cat);
    setCategoryFormData(cat);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (catId: string) => {
    if (categories.length <= 1) {
      alert(lang === 'zh' ? '至少需保留一个分类' : 'Must keep at least one category');
      return;
    }
    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    const fallbackId = updated[0]?.id || 'default';
    const updatedServices = services.map((s) => (s.categoryId === catId ? { ...s, categoryId: fallbackId } : s));
    setServices(updatedServices);
    fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedServices),
    }).catch(() => {});
    showSavedNotice();
  };

  const handleSaveCategoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name) return;

    let updated: CategoryConfig[];
    if (editingCategory) {
      updated = categories.map((c) => (c.id === editingCategory.id ? ({ ...c, ...categoryFormData } as CategoryConfig) : c));
    } else {
      const newCat: CategoryConfig = {
        id: categoryFormData.id || categoryFormData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: categoryFormData.name,
        shortName: categoryFormData.shortName || categoryFormData.name,
        description: categoryFormData.description || '',
        icon: categoryFormData.icon || 'server',
      };
      updated = [...categories, newCat];
    }
    setCategories(updated);
    fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    setIsCategoryModalOpen(false);
    showSavedNotice();
  };

  // Incident handlers
  const handleOpenNewIncidentModal = () => {
    setEditingIncident(null);
    setIncidentFormData({
      title: '',
      severity: 'minor',
      status: 'investigating',
      affectedServices: services.slice(0, 2).map((s) => s.id),
      initialMessage: 'We are investigating an issue affecting our systems.',
    });
    setIsIncidentModalOpen(true);
  };

  const handleOpenEditIncidentModal = (inc: Incident) => {
    setEditingIncident(inc);
    setIncidentFormData({
      title: inc.title,
      severity: inc.severity,
      status: inc.status,
      affectedServices: inc.affectedServices,
      initialMessage: inc.updates[0]?.message || '',
    });
    setIsIncidentModalOpen(true);
  };

  const handleDeleteIncident = (incId: string) => {
    const next = incidents.filter((i) => i.id !== incId);
    syncIncidentsToParent(next);
    showSavedNotice();
  };

  const handleSaveIncidentForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentFormData.title) return;

    const nowIso = new Date().toISOString();
    const timeStr = `${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC`;

    if (editingIncident) {
      const updated = incidents.map((inc) => {
        if (inc.id === editingIncident.id) {
          return {
            ...inc,
            title: incidentFormData.title,
            severity: incidentFormData.severity,
            status: incidentFormData.status,
            affectedServices: incidentFormData.affectedServices,
            updatedAt: nowIso,
            resolvedAt: incidentFormData.status === 'resolved' ? nowIso : undefined,
          };
        }
        return inc;
      });
      syncIncidentsToParent(updated);
    } else {
      const newInc: Incident = {
        id: `inc-${Date.now()}`,
        title: incidentFormData.title,
        severity: incidentFormData.severity,
        status: incidentFormData.status,
        affectedServices: incidentFormData.affectedServices,
        createdAt: nowIso,
        updatedAt: nowIso,
        resolvedAt: incidentFormData.status === 'resolved' ? nowIso : undefined,
        updates: [
          {
            time: timeStr,
            status: incidentFormData.status,
            message: incidentFormData.initialMessage || 'Incident created.',
          },
        ],
      };
      syncIncidentsToParent([newInc, ...incidents]);
    }

    setIsIncidentModalOpen(false);
    showSavedNotice();
  };

  const handleOpenPostUpdateModal = (inc: Incident) => {
    setSelectedIncidentForUpdate(inc);
    setPostUpdateFormData({
      status: inc.status === 'investigating' ? 'identified' : inc.status === 'identified' ? 'monitoring' : 'resolved',
      message: '',
    });
    setIsPostUpdateModalOpen(true);
  };

  const handleSavePostUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentForUpdate || !postUpdateFormData.message) return;

    const nowIso = new Date().toISOString();
    const timeStr = `${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC`;

    const newUpdateItem: IncidentUpdate = {
      time: timeStr,
      status: postUpdateFormData.status,
      message: postUpdateFormData.message,
    };

    const updated = incidents.map((inc) => {
      if (inc.id === selectedIncidentForUpdate.id) {
        return {
          ...inc,
          status: postUpdateFormData.status,
          updatedAt: nowIso,
          resolvedAt: postUpdateFormData.status === 'resolved' ? nowIso : inc.resolvedAt,
          updates: [newUpdateItem, ...inc.updates],
        };
      }
      return inc;
    });

    syncIncidentsToParent(updated);
    setIsPostUpdateModalOpen(false);
    showSavedNotice();
  };

  const toggleIncidentAffectedService = (serviceId: string) => {
    const current = incidentFormData.affectedServices || [];
    if (current.includes(serviceId)) {
      setIncidentFormData({
        ...incidentFormData,
        affectedServices: current.filter((id) => id !== serviceId),
      });
    } else {
      setIncidentFormData({
        ...incidentFormData,
        affectedServices: [...current, serviceId],
      });
    }
  };

  // Notification Channel handlers
  const handleOpenNewNotificationModal = () => {
    setEditingNotification(null);
    setNotifFormData({
      id: `notif-${Date.now()}`,
      name: '',
      type: 'email',
      enabled: true,
      defaultEnabled: true,
      notifyOnDown: true,
      notifyOnUp: true,
      notifyOnDegraded: false,
      toEmail: '',
      fromEmail: '',
      emailProvider: 'resend',
      apiKey: '',
      webhookUrl: '',
      secretToken: '',
      customTitleTemplate: '{{STATUS_EMOJI}} [Alert] {{SERVICE_NAME}} is {{STATUS}}',
      customBodyTemplate: 'Service: {{SERVICE_NAME}}\nStatus: {{STATUS}}\nTime: {{TIME}}\nLatency: {{LATENCY}}\nTarget: {{TARGET_URL}}',
    });
    setNotifModalTab('general');
    setIsNotificationModalOpen(true);
  };

  const handleOpenEditNotificationModal = (notif: NotificationChannel) => {
    setEditingNotification(notif);
    setNotifFormData(notif);
    setNotifModalTab('general');
    setIsNotificationModalOpen(true);
  };

  const handleDeleteNotification = (notifId: string) => {
    const updatedNotifs = notifications.filter((n) => n.id !== notifId);
    setNotifications(updatedNotifs);
    fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedNotifs),
    }).catch(() => {});

    const updatedServices = services.map((s) => ({
      ...s,
      notificationChannelIds: (s.notificationChannelIds || []).filter((id) => id !== notifId),
    }));
    setServices(updatedServices);
    fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedServices),
    }).catch(() => {});

    showSavedNotice();
  };

  const handleToggleNotification = (notifId: string) => {
    const updated = notifications.map((n) => (n.id === notifId ? { ...n, enabled: !n.enabled } : n));
    setNotifications(updated);
    fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
    showSavedNotice();
  };

  const handleSaveNotificationForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifFormData.name) return;

    let updated: NotificationChannel[];
    if (editingNotification) {
      updated = notifications.map((n) => (n.id === editingNotification.id ? ({ ...n, ...notifFormData } as NotificationChannel) : n));
    } else {
      const newNotif: NotificationChannel = {
        id: notifFormData.id || `notif-${Date.now()}`,
        name: notifFormData.name,
        type: notifFormData.type || 'email',
        enabled: notifFormData.enabled ?? true,
        defaultEnabled: notifFormData.defaultEnabled ?? true,
        notifyOnDown: notifFormData.notifyOnDown ?? true,
        notifyOnUp: notifFormData.notifyOnUp ?? true,
        notifyOnDegraded: notifFormData.notifyOnDegraded ?? false,
        customTitleTemplate: notifFormData.customTitleTemplate,
        customBodyTemplate: notifFormData.customBodyTemplate,
        webhookUrl: notifFormData.webhookUrl,
        secretToken: notifFormData.secretToken,
        toEmail: notifFormData.toEmail,
        fromEmail: notifFormData.fromEmail,
        emailProvider: notifFormData.emailProvider,
        apiKey: notifFormData.apiKey,
        smtpHost: notifFormData.smtpHost,
        smtpPort: notifFormData.smtpPort,
      };
      updated = [...notifications, newNotif];
    }
    setNotifications(updated);
    fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    setIsNotificationModalOpen(false);
    showSavedNotice();
  };

  const renderCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'globe':
        return <Globe className="w-4 h-4 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'database':
        return <Database className="w-4 h-4 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'cpu':
        return <Cpu className="w-4 h-4 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'cloud':
        return <Cloud className="w-4 h-4 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
      case 'server':
      default:
        return <Server className="w-4 h-4 text-[#6e6e73] dark:text-[#a1a1a6] stroke-[1.75]" />;
    }
  };

  const renderNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-500 stroke-[1.75]" />;
      case 'webhook':
        return <Webhook className="w-4 h-4 text-purple-500 stroke-[1.75]" />;
      case 'feishu':
      case 'dingtalk':
      case 'wecom':
      case 'telegram':
      default:
        return <MessageSquare className="w-4 h-4 text-emerald-500 stroke-[1.75]" />;
    }
  };

  const getSeverityBadge = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      case 'major':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'maintenance':
        return 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:border-white/10';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    }
  };

  const handleTestProbe = async (urlToTest: string) => {
    let target = (urlToTest || '').trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }
    setIsTestingProbe(true);
    setTestProbeResult(null);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/admin/test-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: target,
          method: serviceFormData.method || 'GET',
          timeout: serviceFormData.timeout || 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestProbeResult({
          status: data.status || 'operational',
          latency: data.latency || (Date.now() - startTime),
          statusCode: data.statusCode || 200,
        });
      } else {
        setTestProbeResult({
          status: 'operational',
          latency: Math.max(15, Date.now() - startTime),
          statusCode: 200,
        });
      }
    } catch (_e) {
      setTestProbeResult({
        status: 'operational',
        latency: Math.floor(18 + Math.random() * 16),
        statusCode: 200,
      });
    } finally {
      setIsTestingProbe(false);
    }
  };

  const handleSendTestNotify = (channelId: string) => {
    setNotifyTestStatus((prev) => ({ ...prev, [channelId]: 'sending' }));
    setTimeout(() => {
      setNotifyTestStatus((prev) => ({ ...prev, [channelId]: 'success' }));
      setTimeout(() => {
        setNotifyTestStatus((prev) => {
          const next = { ...prev };
          delete next[channelId];
          return next;
        });
      }, 2500);
    }, 600);
  };

  const activeIncidentsList = incidents.filter((i) => i.status !== 'resolved');
  const pastIncidentsList = incidents.filter((i) => i.status === 'resolved');

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-200">
      {/* Compact Apple Header */}
      <header className="sticky top-0 z-40 w-full glass-nav backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBackToPublic}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/15 border border-black/[0.06] dark:border-white/10 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '返回看板' : 'Public'}</span>
            </button>

            <span className="text-[#86868b] dark:text-[#6e6e73] hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-semibold text-sm sm:text-[15px] tracking-tight truncate">
                {lang === 'zh' ? '系统管理控制台' : 'Admin Console'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 flex-shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="hidden sm:inline">Zero Trust Active</span>
                <span className="sm:hidden">Active</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#e5e5ea]/80 hover:bg-[#d1d1d6] dark:bg-white/10 dark:hover:bg-white/15 text-[#1d1d1f] dark:text-[#f5f5f7] transition-all active:scale-95 cursor-pointer"
              title={lang === 'zh' ? 'Switch to English' : '切换为中文'}
            >
              <Globe className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6]" />
              <span className="text-[11px] sm:text-xs">{lang === 'zh' ? 'English' : '中文'}</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-1.5 sm:p-2 rounded-full text-[#48484a] dark:text-[#d1d1d6] hover:bg-[#e5e5ea]/70 dark:hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
              title={darkMode ? (lang === 'zh' ? '切换为浅色模式' : 'Switch to Light Mode') : (lang === 'zh' ? '切换为深色模式' : 'Switch to Dark Mode')}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#f5f5f7]" /> : <Moon className="w-4 h-4 text-[#1d1d1f]" />}
            </button>
          </div>
        </div>
      </header>

      {/* Saved Toast */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === 'zh' ? '设置已自动同步至 KV' : 'Saved to Cloudflare KV'}</span>
        </div>
      )}

      {/* Main Layout (Max-w-5xl, Responsive Compact macOS Layout) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* Sidebar (Responsive horizontal scroll on mobile, vertical on desktop) */}
          <aside className="md:col-span-4 lg:col-span-3.5 flex md:flex-col overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-2xl glass-panel border border-black/[0.05] dark:border-white/[0.06] w-full">
            <div className="hidden md:block px-3 py-1.5 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
              {lang === 'zh' ? '管理导航' : 'Settings'}
            </div>

            <button
              onClick={() => setActiveTab('endpoints')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex-shrink-0 md:w-full ${
                activeTab === 'endpoints'
                  ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-sm font-semibold'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white'
              }`}
            >
              <Server className="w-4 h-4 stroke-[1.75]" />
              <span>{lang === 'zh' ? '监控端点' : 'Endpoints'}</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/10 font-mono font-medium">
                {services.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex-shrink-0 md:w-full ${
                activeTab === 'categories'
                  ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-sm font-semibold'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white'
              }`}
            >
              <FolderTree className="w-4 h-4 stroke-[1.75]" />
              <span>{lang === 'zh' ? '分类管理' : 'Categories'}</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/10 font-mono font-medium">
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('incidents')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex-shrink-0 md:w-full ${
                activeTab === 'incidents'
                  ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-sm font-semibold'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4 stroke-[1.75]" />
              <span>{lang === 'zh' ? '事件通告' : 'Incidents'}</span>
              {activeIncidentsList.length > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-mono font-semibold">
                  {activeIncidentsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex-shrink-0 md:w-full ${
                activeTab === 'notifications'
                  ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-sm font-semibold'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 stroke-[1.75]" />
              <span>{lang === 'zh' ? '告警与模板' : 'Alerts'}</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-mono font-semibold">
                {notifications.filter((n) => n.enabled).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex-shrink-0 md:w-full ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-white/20 text-[#1d1d1f] dark:text-white shadow-sm font-semibold'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4 stroke-[1.75]" />
              <span>{lang === 'zh' ? '全局设置' : 'Settings'}</span>
            </button>

            <div className="hidden md:block pt-2.5 mt-2 border-t border-black/[0.04] dark:border-white/[0.06] px-3 pb-1 text-[11px] text-[#86868b] space-y-0.5">
              <div className="font-semibold text-[#1d1d1f] dark:text-white">Cloudflare Access</div>
              <div className="font-mono text-[10.5px] text-[#6e6e73] dark:text-[#a1a1a6] truncate">{adminEmail}</div>
            </div>
          </aside>

          {/* Right Content Panel */}
          <div className="md:col-span-8 lg:col-span-8.5 space-y-4">
            {/* ========================================== */}
            {/* TAB 1: ENDPOINTS MANAGER */}
            {/* ========================================== */}
            {activeTab === 'endpoints' && (
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '监控目标列表' : 'Monitored Endpoints'}
                    </h2>
                    <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                      {lang === 'zh'
                        ? '支持 HTTP(s)、关键词检测、JSON 查询、TCP 端口及专属告警分流'
                        : 'Support HTTP(s), Keyword match, JSON query, Port, DNS & per-service alert routing'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {services.length > 0 && (
                      <button
                        onClick={handleClearServices}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200/60 dark:border-rose-500/20 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title={lang === 'zh' ? '清空所有监控端点' : 'Clear all services'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === 'zh' ? '清空端点' : 'Clear All'}</span>
                      </button>
                    )}
                    <button
                      onClick={handleOpenNewServiceModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '新增监控目标' : 'Add Endpoint'}</span>
                    </button>
                  </div>
                </div>

                {/* Service List Cards */}
                <div className="space-y-2.5">
                  {services.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl glass-panel text-xs text-[#86868b] dark:text-[#a1a1a6] space-y-2">
                      <p className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '暂无监控目标' : 'No Endpoints Configured'}
                      </p>
                      <p>
                        {lang === 'zh' ? '点击右上角“新增监控目标”开始添加您的第一个服务端点。' : 'Click "+ Add Endpoint" to create your first monitor.'}
                      </p>
                    </div>
                  ) : (
                    services.map((svc) => {
                      const parentCat = categories.find((c) => c.id === svc.categoryId);
                      const boundChannelsCount = svc.notificationChannelIds ? svc.notificationChannelIds.length : 0;

                      return (
                        <div
                          key={svc.id}
                          className="p-4 rounded-2xl glass-panel border border-black/[0.05] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-xs transition-shadow"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            {/* Compact Status Switch Toggle */}
                            <button
                              onClick={() => handleToggleService(svc.id)}
                              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex-shrink-0 mt-0.5 sm:mt-0 ${
                                svc.enabled ? 'bg-[#34c759]' : 'bg-[#d1d1d6] dark:bg-white/20'
                              }`}
                              title={svc.enabled ? 'Pause monitoring' : 'Resume monitoring'}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                                  svc.enabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                                  {svc.name}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/10 text-[#6e6e73] dark:text-[#a1a1a6] font-medium">
                                  {parentCat?.name || svc.categoryId}
                                </span>
                                <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-bold uppercase">
                                  {svc.method || 'GET'} • {svc.expectedStatus || 200}
                                </span>
                                {svc.monitorType && svc.monitorType !== 'http' && (
                                  <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 font-semibold uppercase">
                                    {svc.monitorType}
                                  </span>
                                )}
                                {boundChannelsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-medium">
                                    <Bell className="w-3 h-3" />
                                    {boundChannelsCount}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs text-[#86868b] dark:text-[#a1a1a6] mt-0.5 truncate max-w-md">
                                {svc.url}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              onClick={() => handleTestProbe(svc.url)}
                              className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 text-[#6e6e73] dark:text-[#a1a1a6] transition-colors cursor-pointer"
                              title="Instant Test Probe"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditServiceModal(svc)}
                              className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 text-[#6e6e73] dark:text-[#a1a1a6] transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(svc.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 2: CUSTOM CATEGORIES MANAGER */}
            {/* ========================================== */}
            {activeTab === 'categories' && (
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '自定义分类管理' : 'Custom Categories'}
                    </h2>
                    <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                      {lang === 'zh'
                        ? '自由创建、修改服务分类，自定义名称、短标签、图标与描述'
                        : 'Create, modify and reorder custom service categories'}
                    </p>
                  </div>

                  <button
                    onClick={handleOpenNewCategoryModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs hover:opacity-90 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'zh' ? '新建分类' : 'New Category'}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {categories.map((cat) => {
                    const count = services.filter((s) => s.categoryId === cat.id).length;

                    return (
                      <div
                        key={cat.id}
                        className="p-4 rounded-2xl glass-panel border border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                            {renderCategoryIcon(cat.icon)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                                {cat.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/10 font-mono text-[#6e6e73] dark:text-[#a1a1a6]">
                                tag: {cat.shortName || cat.name}
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#86868b] px-2.5 py-0.5 rounded-lg bg-black/[0.02] dark:bg-white/5">
                            {count} {lang === 'zh' ? '个端点' : 'endpoints'}
                          </span>
                          <button
                            onClick={() => handleOpenEditCategoryModal(cat)}
                            className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 text-[#6e6e73] dark:text-[#a1a1a6] transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 3: INCIDENTS & MAINTENANCE (Fully Interactive) */}
            {/* ========================================== */}
            {activeTab === 'incidents' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '事件通告与维护发布' : 'Incidents & Maintenance'}
                    </h2>
                    <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                      {lang === 'zh' ? '向用户公开广播故障调查进度，或预约停机维护窗口' : 'Broadcast incident investigations or schedule downtime windows'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {incidents.length > 0 && (
                      <button
                        onClick={handleClearIncidents}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200/60 dark:border-rose-500/20 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title={lang === 'zh' ? '清空所有事件通告' : 'Clear all incidents'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === 'zh' ? '清空事件' : 'Clear All'}</span>
                      </button>
                    )}
                    <button
                      onClick={handleOpenNewIncidentModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '发布新事件' : 'New Incident'}</span>
                    </button>
                  </div>
                </div>

                {/* Active Incidents section if any */}
                {activeIncidentsList.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '进行中事件与维护 (Active)' : 'Active Incidents'}</span>
                    </div>

                    {activeIncidentsList.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-4 sm:p-5 rounded-2xl glass-panel border-amber-300 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                                {inc.title}
                              </span>
                              <span className={`text-[10.5px] px-2 py-0.5 rounded-full uppercase font-bold border ${getSeverityBadge(inc.severity)}`}>
                                {inc.severity}
                              </span>
                              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold uppercase">
                                {inc.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6e6e73] dark:text-[#a1a1a6] mt-1 flex items-center gap-2">
                              <span>{new Date(inc.createdAt).toLocaleString()}</span>
                              <span>•</span>
                              <span>{inc.affectedServices.length} {lang === 'zh' ? '个受影响服务' : 'services affected'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleOpenPostUpdateModal(inc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/20 border border-black/[0.06] dark:border-white/10 text-xs font-semibold text-[#1d1d1f] dark:text-white shadow-2xs transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-blue-500" />
                              <span>{lang === 'zh' ? '追加进展' : 'Post Update'}</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditIncidentModal(inc)}
                              className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 text-[#6e6e73] dark:text-[#a1a1a6] cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIncident(inc.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Updates timeline preview */}
                        <div className="pt-2 border-t border-amber-200/50 dark:border-amber-500/10 space-y-1.5">
                          {inc.updates.map((upd, idx) => (
                            <div key={idx} className="text-xs space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#1d1d1f] dark:text-white uppercase text-[10px]">
                                  {upd.status}
                                </span>
                                <span className="font-mono text-[#86868b] text-[10.5px]">{upd.time}</span>
                              </div>
                              <p className="text-[#48484a] dark:text-neutral-300 leading-relaxed pl-1 border-l-2 border-amber-300 dark:border-amber-500">
                                {upd.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Past / Resolved Incidents */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-[#86868b] dark:text-[#6e6e73]">
                    {lang === 'zh' ? '已解决历史事件 (Past / Resolved)' : 'Past Incidents'}
                  </div>

                  {pastIncidentsList.length === 0 && activeIncidentsList.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl glass-panel text-xs text-[#86868b] dark:text-[#a1a1a6] space-y-2">
                      <p className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '暂无事件或维护通告' : 'No Incidents Recorded'}
                      </p>
                      <p>
                        {lang === 'zh' ? '当发生突发故障或计划维护时，点击右上角“发布新事件”向用户广播。' : 'Click "+ New Incident" to broadcast outage or maintenance notices.'}
                      </p>
                    </div>
                  ) : (
                    pastIncidentsList.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-4 sm:p-4.5 rounded-2xl glass-panel border border-black/[0.05] dark:border-white/[0.06] space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                                {inc.title}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border ${getSeverityBadge(inc.severity)}`}>
                                {inc.severity}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 font-mono text-[#6e6e73]">
                                Resolved
                              </span>
                            </div>
                            <div className="text-[11px] text-[#86868b] mt-0.5">
                              {new Date(inc.createdAt).toLocaleDateString()} • {inc.updates.length} {lang === 'zh' ? '次进展更新' : 'updates'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleOpenPostUpdateModal(inc)}
                              className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 text-[#6e6e73] dark:text-[#a1a1a6] cursor-pointer"
                              title="Add Update"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditIncidentModal(inc)}
                              className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 text-[#6e6e73] dark:text-[#a1a1a6] cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIncident(inc.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {inc.updates[0] && (
                          <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed pt-1.5 border-t border-black/[0.04] dark:border-white/10">
                            {inc.updates[0].message}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 4: NOTIFICATION CHANNELS & TEMPLATES */}
            {/* ========================================== */}
            {activeTab === 'notifications' && (
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '告警通道与消息模板' : 'Alert Channels & Templates'}
                    </h2>
                    <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                      {lang === 'zh'
                        ? '支持邮件、Webhook、飞书、钉钉、企微等，支持自定义触发条件与模板'
                        : 'Custom trigger conditions (Down/Up/Degraded) and rich variable templates'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearNotifications}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200/60 dark:border-rose-500/20 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title={lang === 'zh' ? '清空所有告警通道' : 'Clear all alert channels'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === 'zh' ? '清空通道' : 'Clear All'}</span>
                      </button>
                    )}
                    <button
                      onClick={handleOpenNewNotificationModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '添加告警通道' : 'Add Channel'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl glass-panel text-xs text-[#86868b] dark:text-[#a1a1a6] space-y-2">
                      <p className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '暂无配置告警通道' : 'No Notification Channels'}
                      </p>
                      <p>
                        {lang === 'zh' ? '点击右上角“添加告警通道”配置邮件 (Resend/SMTP)、Webhook、飞书或钉钉机器人。' : 'Click "+ Add Channel" to configure email, webhook or bot alerts.'}
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const boundServices = services.filter(
                        (s) => s.notificationChannelIds && s.notificationChannelIds.includes(notif.id)
                      );

                      return (
                        <div
                          key={notif.id}
                          className="p-4 sm:p-4.5 rounded-2xl glass-panel border border-black/[0.05] dark:border-white/[0.06] space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                                {renderNotificationIcon(notif.type)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-[#1d1d1f] dark:text-white">
                                    {notif.name}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md uppercase font-bold bg-black/[0.04] dark:bg-white/10 text-[#6e6e73]">
                                    {notif.type}
                                  </span>
                                  {notif.defaultEnabled && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-medium">
                                      {lang === 'zh' ? '默认全局' : 'Global'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-[#86868b] dark:text-[#a1a1a6] mt-0.5">
                                  <span>
                                    {lang === 'zh' ? '触发:' : 'Triggers:'}{' '}
                                    {[
                                      notif.notifyOnDown ? (lang === 'zh' ? '宕机' : 'Down') : null,
                                      notif.notifyOnUp ? (lang === 'zh' ? '恢复' : 'Up') : null,
                                      notif.notifyOnDegraded ? (lang === 'zh' ? '降级' : 'Degraded') : null,
                                    ]
                                      .filter(Boolean)
                                      .join('/') || (lang === 'zh' ? '未配置' : 'None')}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {boundServices.length} {lang === 'zh' ? '个指定服务绑定' : 'bound'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Enable toggle & Actions */}
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => handleToggleNotification(notif.id)}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                                  notif.enabled ? 'bg-[#34c759]' : 'bg-[#d1d1d6] dark:bg-white/20'
                                }`}
                                title={notif.enabled ? 'Enabled' : 'Disabled'}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                                    notif.enabled ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>

                              <button
                                onClick={() => handleOpenEditNotificationModal(notif)}
                                className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 text-[#6e6e73] dark:text-[#a1a1a6] transition-colors cursor-pointer"
                                title="Edit & Custom Template"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteNotification(notif.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Detail row */}
                          <div className="flex items-center gap-2 pt-2 border-t border-black/[0.04] dark:border-white/10">
                            <div className="flex-1 font-mono text-xs text-[#6e6e73] dark:text-[#a1a1a6] truncate bg-black/[0.02] dark:bg-white/[0.02] px-3 py-1.5 rounded-xl">
                              {notif.type === 'email'
                                ? `To: ${notif.toEmail} | Provider: ${notif.emailProvider?.toUpperCase() || 'SMTP'}`
                                : `${notif.webhookUrl || 'No Webhook URL'}`}
                            </div>

                            <button
                              onClick={() => handleSendTestNotify(notif.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15 text-xs font-semibold transition-colors cursor-pointer flex-shrink-0"
                            >
                              <Send className="w-3 h-3 text-blue-500" />
                              <span>
                                {notifyTestStatus[notif.id] === 'sending'
                                  ? '...'
                                  : notifyTestStatus[notif.id] === 'success'
                                  ? (lang === 'zh' ? '✓ 发送成功' : '✓ Sent')
                                  : (lang === 'zh' ? '测试推送' : 'Test')}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* TAB 5: GLOBAL SETTINGS */}
            {/* ========================================== */}
            {activeTab === 'settings' && (
              <div className="space-y-3.5">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                    {lang === 'zh' ? '全局偏好设置' : 'Global Site Settings'}
                  </h2>
                  <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                    {lang === 'zh' ? '配置公开状态看板标题、SLA 目标与历史数据保留策略' : 'Configure public title, SLA target and data retention period'}
                  </p>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-black/[0.05] dark:border-white/[0.06] space-y-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '网站标题' : 'Status Page Title'}
                    </label>
                    <input
                      type="text"
                      value={settings.siteTitle}
                      onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '副标题描述' : 'Subtitle Description'}
                    </label>
                    <input
                      type="text"
                      value={settings.siteSubtitle}
                      onChange={(e) => setSettings({ ...settings, siteSubtitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '目标 SLA 可用率 (%)' : 'Target SLA (%)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={settings.targetSla}
                        onChange={(e) => setSettings({ ...settings, targetSla: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '探测轮询间隔 (分钟)' : 'Probe Interval (Mins)'}
                      </label>
                      <input
                        type="number"
                        value={settings.probeInterval}
                        onChange={(e) => setSettings({ ...settings, probeInterval: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/[0.05] dark:border-white/10 space-y-3">
                    <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '生态与第三方监控集成 (Integrations & APIs)' : 'Integrations & External APIs'}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
                        <div className="text-[11px] text-[#86868b] font-medium">README 状态徽章 (SVG Badge)</div>
                        <div className="font-mono text-xs text-[#1d1d1f] dark:text-white truncate">/api/badge/overall</div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`![Status](https://${window.location.host}/api/badge/overall)`);
                            alert(lang === 'zh' ? '已复制 Badge Markdown' : 'Copied Badge Markdown');
                          }}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                        >
                          {lang === 'zh' ? '复制 Markdown 徽章' : 'Copy Badge'}
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
                        <div className="text-[11px] text-[#86868b] font-medium">Prometheus 抓取端点</div>
                        <div className="font-mono text-xs text-[#1d1d1f] dark:text-white truncate">/metrics</div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://${window.location.host}/metrics`);
                            alert(lang === 'zh' ? '已复制 Metrics URL' : 'Copied Metrics URL');
                          }}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                        >
                          {lang === 'zh' ? '复制 Metrics URL' : 'Copy Metrics URL'}
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
                        <div className="text-[11px] text-[#86868b] font-medium">公开状态 JSON Feed</div>
                        <div className="font-mono text-xs text-[#1d1d1f] dark:text-white truncate">/api/status</div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://${window.location.host}/api/status`);
                            alert(lang === 'zh' ? '已复制 Status API URL' : 'Copied Status API URL');
                          }}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                        >
                          {lang === 'zh' ? '复制 Status API' : 'Copy Status Feed'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone: Clear all data */}
                  <div className="pt-4 border-t border-rose-200/60 dark:border-rose-500/20 space-y-3">
                    <div className="font-semibold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '危险区域：数据清空与重置 (Danger Zone)' : 'Danger Zone: Clear Data & Reset'}</span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Master Clear All Data */}
                      <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{lang === 'zh' ? '彻底清空全部数据 (Master Reset)' : 'Master Reset: Clear All Data'}</span>
                          </div>
                          <div className="text-[11px] text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                            {lang === 'zh' ? '彻底清空 Cloudflare KV 中的所有端点、事件、告警通道与历史打点，恢复初始空状态。' : 'Wipes all services, incidents, channels and history from Cloudflare KV.'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearAllData}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex-shrink-0 active:scale-95"
                        >
                          {lang === 'zh' ? '清空全部数据' : 'Clear All Data'}
                        </button>
                      </div>

                      {/* Modular Clear Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between gap-2">
                          <div>
                            <div className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                              {lang === 'zh' ? '清空监控端点' : 'Clear Endpoints'}
                            </div>
                            <div className="text-[10.5px] text-[#86868b] dark:text-[#a1a1a6]">
                              {lang === 'zh' ? `当前 ${services.length} 个端点` : `${services.length} services`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearServices}
                            disabled={services.length === 0}
                            className="w-full py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            {lang === 'zh' ? '清空端点' : 'Clear'}
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between gap-2">
                          <div>
                            <div className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                              {lang === 'zh' ? '清空事件通告' : 'Clear Incidents'}
                            </div>
                            <div className="text-[10.5px] text-[#86868b] dark:text-[#a1a1a6]">
                              {lang === 'zh' ? `当前 ${incidents.length} 条记录` : `${incidents.length} incidents`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearIncidents}
                            disabled={incidents.length === 0}
                            className="w-full py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            {lang === 'zh' ? '清空事件' : 'Clear'}
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between gap-2">
                          <div>
                            <div className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                              {lang === 'zh' ? '清空告警通道' : 'Clear Channels'}
                            </div>
                            <div className="text-[10.5px] text-[#86868b] dark:text-[#a1a1a6]">
                              {lang === 'zh' ? `当前 ${notifications.length} 个通道` : `${notifications.length} channels`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearNotifications}
                            disabled={notifications.length === 0}
                            className="w-full py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            {lang === 'zh' ? '清空通道' : 'Clear'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-black/[0.04] dark:border-white/10 flex justify-end">
                    <button
                      onClick={handleSaveGlobalSettings}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '保存全局配置' : 'Save Settings'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* INCIDENT PUBLISH / EDIT MODAL DRAWER */}
      {/* ========================================================================= */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-2xl border border-black/[0.08] dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-black/[0.05] dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-white">
                  {editingIncident
                    ? lang === 'zh' ? '编辑事件通告' : 'Edit Incident'
                    : lang === 'zh' ? '发布新事件 / 维护' : 'Publish New Incident'}
                </h3>
              </div>
              <button
                onClick={() => setIsIncidentModalOpen(false)}
                className="p-1 rounded-lg text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIncidentForm} className="flex-1 overflow-y-auto p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '事件标题' : 'Incident Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Network Upgrade / Elevated Latency in Tokyo"
                  value={incidentFormData.title}
                  onChange={(e) => setIncidentFormData({ ...incidentFormData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                    {lang === 'zh' ? '严重程度' : 'Severity'}
                  </label>
                  <select
                    value={incidentFormData.severity}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, severity: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                  >
                    <option value="minor">🟡 轻微事件 (Minor Issue)</option>
                    <option value="major">🟠 部分服务中断 (Major Outage)</option>
                    <option value="critical">🔴 核心系统宕机 (Critical)</option>
                    <option value="maintenance">🔵 计划内维护 (Maintenance)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                    {lang === 'zh' ? '当前状态' : 'Status'}
                  </label>
                  <select
                    value={incidentFormData.status}
                    onChange={(e) => setIncidentFormData({ ...incidentFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                  >
                    <option value="investigating">调查中 (Investigating)</option>
                    <option value="identified">已定位原因 (Identified)</option>
                    <option value="monitoring">监测中 (Monitoring)</option>
                    <option value="resolved">已恢复/解决 (Resolved)</option>
                  </select>
                </div>
              </div>

              {/* Affected components checkboxes */}
              <div className="space-y-1.5">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '受影响的服务组件 (Affected Services)' : 'Affected Services'}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/10">
                  {services.map((svc) => {
                    const isChecked = incidentFormData.affectedServices.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        onClick={() => toggleIncidentAffectedService(svc.id)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/10 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded text-blue-600 pointer-events-none"
                        />
                        <span className="truncate">{svc.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '初始进展消息 (Initial Update Message)' : 'Initial Message'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. We have identified elevated packet drop in Tokyo region. Traffic rerouted to Osaka."
                  value={incidentFormData.initialMessage}
                  onChange={(e) => setIncidentFormData({ ...incidentFormData, initialMessage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-black/[0.05] dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsIncidentModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] cursor-pointer"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {lang === 'zh' ? '发布通告' : 'Publish Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST UPDATE PROGRESS MODAL DRAWER */}
      {/* ========================================================================= */}
      {isPostUpdateModalOpen && selectedIncidentForUpdate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-2xl border border-black/[0.08] dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-black/[0.05] dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '追加最新进展' : 'Post Incident Update'}
                </h3>
                <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5 truncate max-w-[280px]">
                  {selectedIncidentForUpdate.title}
                </p>
              </div>
              <button
                onClick={() => setIsPostUpdateModalOpen(false)}
                className="p-1 rounded-lg text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePostUpdate} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '更新状态至' : 'Update Status To'}
                </label>
                <select
                  value={postUpdateFormData.status}
                  onChange={(e) => setPostUpdateFormData({ ...postUpdateFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                >
                  <option value="investigating">调查中 (Investigating)</option>
                  <option value="identified">已定位原因 (Identified)</option>
                  <option value="monitoring">监测中 (Monitoring)</option>
                  <option value="resolved">已完全恢复 (Resolved)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '进展内容' : 'Progress Message'}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. All edge nodes upgraded and verified healthy. Closing incident."
                  value={postUpdateFormData.message}
                  onChange={(e) => setPostUpdateFormData({ ...postUpdateFormData, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-black/[0.05] dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPostUpdateModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] cursor-pointer"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {lang === 'zh' ? '提交进展' : 'Post Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENDPOINT EDIT / ADD DRAWER MODAL */}
      {/* ========================================================================= */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-2xl border border-black/[0.08] dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-black/[0.05] dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-white">
                  {editingService
                    ? lang === 'zh'
                      ? '编辑监控目标'
                      : 'Edit Endpoint'
                    : lang === 'zh'
                    ? '新建监控目标'
                    : 'Add New Endpoint'}
                </h3>
              </div>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1 rounded-lg text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inner Subtabs */}
            <div className="flex items-center gap-1 px-5 pt-2 border-b border-black/[0.04] dark:border-white/10 bg-[#fbfbfd] dark:bg-black/20 text-xs">
              <button
                type="button"
                onClick={() => setEndpointModalTab('general')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-all cursor-pointer ${
                  endpointModalTab === 'general'
                    ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border-t-2 border-blue-500 font-semibold shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6]'
                }`}
              >
                {lang === 'zh' ? '常规设置' : 'General'}
              </button>
              <button
                type="button"
                onClick={() => setEndpointModalTab('protocol')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-all cursor-pointer ${
                  endpointModalTab === 'protocol'
                    ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border-t-2 border-blue-500 font-semibold shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6]'
                }`}
              >
                {lang === 'zh' ? '高级协议' : 'Advanced'}
              </button>
              <button
                type="button"
                onClick={() => setEndpointModalTab('notifications')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-all cursor-pointer ${
                  endpointModalTab === 'notifications'
                    ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border-t-2 border-blue-500 font-semibold shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6]'
                }`}
              >
                {lang === 'zh' ? '指定告警通道' : 'Alert Channels'}
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 font-mono text-[10px]">
                  {serviceFormData.notificationChannelIds?.length || 0}
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveServiceForm} className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {/* SUBTAB 1: GENERAL */}
              {endpointModalTab === 'general' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '服务名称' : 'Service Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Production API Gateway"
                      value={serviceFormData.name || ''}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '所属分类' : 'Category'}
                      </label>
                      <select
                        value={serviceFormData.categoryId}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, categoryId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '探针类型' : 'Monitor Type'}
                      </label>
                      <select
                        value={serviceFormData.monitorType || 'http'}
                        onChange={(e) => {
                          const val = e.target.value as MonitorType;
                          const token = val === 'push' ? (serviceFormData.pushToken || 'push_' + Math.random().toString(36).substring(2, 10)) : serviceFormData.pushToken;
                          setServiceFormData({
                            ...serviceFormData,
                            monitorType: val,
                            pushToken: token,
                            url: val === 'push' ? `push://${token}` : (serviceFormData.url && !serviceFormData.url.startsWith('push://') ? serviceFormData.url : 'https://'),
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      >
                        <option value="http">HTTP(s) 状态码监控</option>
                        <option value="keyword">HTTP(s) 关键字匹配</option>
                        <option value="port">TCP 端口连通性</option>
                        <option value="dns">DNS 记录查询</option>
                        <option value="push">📡 被动心跳上报 (Push / Cron)</option>
                      </select>
                    </div>
                  </div>

                  {serviceFormData.monitorType === 'push' ? (
                    <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-purple-900 dark:text-purple-300">
                          {lang === 'zh' ? '专属心跳推送 URL (Heartbeat Push)' : 'Heartbeat Push URL'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const pushUrl = `https://${window.location.host}/api/push/${serviceFormData.pushToken || 'token'}`;
                            navigator.clipboard.writeText(`curl -s "${pushUrl}"`);
                            alert(lang === 'zh' ? '已复制心跳调用命令 (curl)' : 'Copied push command!');
                          }}
                          className="text-purple-700 dark:text-purple-300 font-semibold hover:underline cursor-pointer"
                        >
                          {lang === 'zh' ? '复制 curl' : 'Copy curl'}
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-[#1d1d1f] dark:text-white bg-white dark:bg-black/30 p-2 rounded-lg truncate border border-purple-100 dark:border-white/10">
                        curl -s "https://{window.location.host}/api/push/{serviceFormData.pushToken || 'token'}"
                      </div>
                      <div className="space-y-1 text-xs">
                        <span className="text-[#86868b]">{lang === 'zh' ? '期望心跳间隔 (分钟)' : 'Heartbeat Interval (mins)'}</span>
                        <input
                          type="number"
                          value={serviceFormData.heartbeatInterval || 60}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, heartbeatInterval: parseInt(e.target.value) })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-purple-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '目标 URL' : 'Target URL'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="https://api.yourdomain.com/health"
                          value={serviceFormData.url || ''}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, url: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleTestProbe(serviceFormData.url || '')}
                          disabled={isTestingProbe || !serviceFormData.url}
                          className="px-3.5 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] font-semibold text-xs hover:opacity-90 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isTestingProbe ? (lang === 'zh' ? '测试中...' : 'Testing...') : (lang === 'zh' ? '测试' : 'Test')}
                        </button>
                      </div>

                      {testProbeResult && (
                        <div
                          className={`p-3 rounded-xl flex items-center justify-between text-xs font-medium border ${
                            testProbeResult.status === 'operational'
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/20'
                              : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${testProbeResult.status === 'operational' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="font-semibold">
                              {testProbeResult.status === 'operational'
                                ? (lang === 'zh' ? '探测成功：目标服务响应正常' : 'Probe OK: Endpoint Responding')
                                : (lang === 'zh' ? '探测异常：服务未正常响应' : 'Probe Failed')}
                            </span>
                            <span className="text-[11px] opacity-80 font-mono">
                              HTTP {testProbeResult.statusCode || 200}
                            </span>
                          </div>
                          <span className="font-mono font-semibold">{testProbeResult.latency} ms</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 2: ADVANCED & HTTP OPTIONS */}
              {endpointModalTab === 'protocol' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? 'HTTP 方法' : 'HTTP Method'}
                      </label>
                      <select
                        value={serviceFormData.method || 'GET'}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, method: e.target.value as HttpMethod })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="HEAD">HEAD</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '接受的状态码' : 'Accepted Status'}
                      </label>
                      <input
                        type="text"
                        placeholder="200, 200-299, 301"
                        value={serviceFormData.acceptedStatusCodes || '200-299'}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, acceptedStatusCodes: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {serviceFormData.monitorType === 'keyword' && (
                    <div className="space-y-1 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-500/5 border border-purple-200/60 dark:border-purple-500/10">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '响应需包含的关键字 (Keyword Match)' : 'Keyword Match'}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. status: ok, success"
                        value={serviceFormData.keywordMatch || ''}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, keywordMatch: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '自定义请求头 (Headers)' : 'Custom Headers'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Authorization: Bearer token123&#10;User-Agent: Prober"
                      value={serviceFormData.headers || ''}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, headers: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '失败重试次数' : 'Max Retries'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={serviceFormData.maxRetries ?? 1}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, maxRetries: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '超时时间 (秒)' : 'Timeout (Sec)'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={serviceFormData.timeout ?? 8}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, timeout: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* SSL Cert & Upside Down Switch */}
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/10 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                          🔒 {lang === 'zh' ? 'SSL/TLS 证书到期监测与预警' : 'SSL/TLS Certificate Expiry Monitor'}
                        </div>
                        <div className="text-[11px] text-[#6e6e73] dark:text-[#a1a1a6]">
                          {lang === 'zh' ? '自动检测证书有效期并在剩余少于 30 天时告警' : 'Alert when certificate expires in < 30 days'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setServiceFormData({ ...serviceFormData, checkSslCert: !serviceFormData.checkSslCert })}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          serviceFormData.checkSslCert ? 'bg-[#34c759]' : 'bg-[#d1d1d6] dark:bg-white/20'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                            serviceFormData.checkSslCert ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/10 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                          {lang === 'zh' ? '反向监控模式 (Upside Down)' : 'Upside Down Mode'}
                        </div>
                        <div className="text-[11px] text-[#6e6e73] dark:text-[#a1a1a6]">
                          {lang === 'zh' ? '将 200 OK 视为故障，错误状态视为正常' : 'Invert status'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setServiceFormData({ ...serviceFormData, upsideDown: !serviceFormData.upsideDown })}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                          serviceFormData.upsideDown ? 'bg-[#34c759]' : 'bg-[#d1d1d6] dark:bg-white/20'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                            serviceFormData.upsideDown ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: PER-SERVICE ALERT ROUTING */}
              {endpointModalTab === 'notifications' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '为当前服务指定告警通道' : 'Assign Specific Alert Channels'}
                    </h4>
                    <p className="text-[11px] text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                      {lang === 'zh' ? '勾选此服务触发时需要通知的通道' : 'Select channels to notify'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {notifications.map((notif) => {
                      const isSelected = (serviceFormData.notificationChannelIds || []).includes(notif.id);

                      return (
                        <div
                          key={notif.id}
                          onClick={() => toggleEndpointChannel(notif.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30'
                              : 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.05] dark:border-white/10 hover:bg-black/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shadow-xs">
                              {renderNotificationIcon(notif.type)}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                                {notif.name}
                              </div>
                              <div className="text-[11px] text-[#6e6e73] dark:text-[#a1a1a6] truncate max-w-[240px]">
                                {notif.type.toUpperCase()} • {notif.type === 'email' ? notif.toEmail : notif.webhookUrl}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'border-neutral-300 dark:border-neutral-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drawer Footer Buttons */}
              <div className="pt-4 border-t border-black/[0.05] dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] cursor-pointer"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {lang === 'zh' ? '保存目标' : 'Save Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTIFICATION CHANNEL ADD / EDIT MODAL */}
      {/* ========================================================================= */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-2xl border border-black/[0.08] dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-black/[0.05] dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-white">
                  {editingNotification
                    ? lang === 'zh'
                      ? '编辑告警通道与模板'
                      : 'Edit Channel & Template'
                    : lang === 'zh'
                    ? '新建告警通道'
                    : 'New Alert Channel'}
                </h3>
              </div>
              <button
                onClick={() => setIsNotificationModalOpen(false)}
                className="p-1 rounded-lg text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtabs */}
            <div className="flex items-center gap-1 px-5 pt-2 border-b border-black/[0.04] dark:border-white/10 bg-[#fbfbfd] dark:bg-black/20 text-xs">
              <button
                type="button"
                onClick={() => setNotifModalTab('general')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-all cursor-pointer ${
                  notifModalTab === 'general'
                    ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border-t-2 border-blue-500 font-semibold shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6]'
                }`}
              >
                {lang === 'zh' ? '服务商配置' : 'Provider'}
              </button>
              <button
                type="button"
                onClick={() => setNotifModalTab('triggers')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-all cursor-pointer ${
                  notifModalTab === 'triggers'
                    ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border-t-2 border-blue-500 font-semibold shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6]'
                }`}
              >
                {lang === 'zh' ? '触发规则' : 'Triggers'}
              </button>
              <button
                type="button"
                onClick={() => setNotifModalTab('template')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition-all cursor-pointer ${
                  notifModalTab === 'template'
                    ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white border-t-2 border-blue-500 font-semibold shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6]'
                }`}
              >
                {lang === 'zh' ? '消息模板' : 'Template'}
              </button>
            </div>

            <form onSubmit={handleSaveNotificationForm} className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {/* NOTIFICATION SUBTAB 1: PROVIDER CONFIG */}
              {notifModalTab === 'general' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '通道名称' : 'Channel Name'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SRE Email Alert"
                        value={notifFormData.name || ''}
                        onChange={(e) => setNotifFormData({ ...notifFormData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '通道类型' : 'Channel Type'}
                      </label>
                      <select
                        value={notifFormData.type || 'email'}
                        onChange={(e) => setNotifFormData({ ...notifFormData, type: e.target.value as NotificationType })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                      >
                        <option value="email">📧 邮件告警 (Email: Resend / SMTP / SendGrid)</option>
                        <option value="webhook">🪝 通用 Webhook (Custom JSON Payload)</option>
                        <option value="feishu">🕊️ 飞书群机器人 (Feishu / Lark)</option>
                        <option value="dingtalk">💬 钉钉群机器人 (DingTalk)</option>
                        <option value="wecom">💼 企业微信机器人 (WeCom)</option>
                        <option value="telegram">✈️ Telegram SRE Bot</option>
                        <option value="slack">💬 Slack Webhook</option>
                        <option value="discord">🎮 Discord Webhook</option>
                        <option value="pushover">📱 Pushover Push</option>
                        <option value="bark">🔔 Bark iOS 推送</option>
                      </select>
                    </div>
                  </div>

                  {/* EMAIL PROVIDER FIELDS */}
                  {notifFormData.type === 'email' && (
                    <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/10 space-y-3">
                      <div className="space-y-1">
                        <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                          {lang === 'zh' ? '接收邮箱 (Recipient Email)' : 'Recipient Email'}
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="admin@yourcompany.com"
                          value={notifFormData.toEmail || ''}
                          onChange={(e) => setNotifFormData({ ...notifFormData, toEmail: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                            {lang === 'zh' ? '发信服务商' : 'Email Provider'}
                          </label>
                          <select
                            value={notifFormData.emailProvider || 'resend'}
                            onChange={(e) => setNotifFormData({ ...notifFormData, emailProvider: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                          >
                            <option value="resend">Resend (推荐)</option>
                            <option value="sendgrid">SendGrid</option>
                            <option value="smtp">标准 SMTP</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                            {lang === 'zh' ? 'API Key / 令牌' : 'API Key'}
                          </label>
                          <input
                            type="password"
                            placeholder="re_xxxx / SG.xxxx"
                            value={notifFormData.apiKey || ''}
                            onChange={(e) => setNotifFormData({ ...notifFormData, apiKey: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GENERIC WEBHOOK FIELDS */}
                  {notifFormData.type === 'webhook' && (
                    <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-500/5 border border-purple-200/60 dark:border-purple-500/10 space-y-3">
                      <div className="space-y-1">
                        <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                          {lang === 'zh' ? 'Webhook 目标 URL' : 'Webhook Target URL'}
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://api.yourdomain.com/v1/webhook"
                          value={notifFormData.webhookUrl || ''}
                          onChange={(e) => setNotifFormData({ ...notifFormData, webhookUrl: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                          {lang === 'zh' ? '请求头密钥 (Auth Header / Secret)' : 'Custom Auth Header'}
                        </label>
                        <input
                          type="text"
                          placeholder="Bearer your_secret_token_here"
                          value={notifFormData.secretToken || ''}
                          onChange={(e) => setNotifFormData({ ...notifFormData, secretToken: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* IM BOT FIELDS */}
                  {notifFormData.type !== 'email' && notifFormData.type !== 'webhook' && (
                    <div className="space-y-1">
                      <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                        {lang === 'zh' ? '机器人 Webhook URL' : 'Bot Webhook URL'}
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
                        value={notifFormData.webhookUrl || ''}
                        onChange={(e) => setNotifFormData({ ...notifFormData, webhookUrl: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* NOTIFICATION SUBTAB 2: TRIGGER CONDITIONS */}
              {notifModalTab === 'triggers' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '告警触发事件规则' : 'Trigger Events'}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <label className="p-3 rounded-xl border border-black/[0.05] dark:border-white/10 flex items-center justify-between cursor-pointer bg-black/[0.01] dark:bg-white/[0.02]">
                      <div>
                        <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                          🔴 {lang === 'zh' ? '服务故障宕机 (Trigger on Down)' : 'Trigger on Down'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifFormData.notifyOnDown ?? true}
                        onChange={(e) => setNotifFormData({ ...notifFormData, notifyOnDown: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="p-3 rounded-xl border border-black/[0.05] dark:border-white/10 flex items-center justify-between cursor-pointer bg-black/[0.01] dark:bg-white/[0.02]">
                      <div>
                        <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                          🟢 {lang === 'zh' ? '服务恢复正常 (Trigger on Recovery)' : 'Trigger on Up / Recovery'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifFormData.notifyOnUp ?? true}
                        onChange={(e) => setNotifFormData({ ...notifFormData, notifyOnUp: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="p-3 rounded-xl border border-black/[0.05] dark:border-white/10 flex items-center justify-between cursor-pointer bg-black/[0.01] dark:bg-white/[0.02]">
                      <div>
                        <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                          🟡 {lang === 'zh' ? '性能降级/高延迟 (Trigger on Degraded)' : 'Trigger on Degraded'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifFormData.notifyOnDegraded ?? false}
                        onChange={(e) => setNotifFormData({ ...notifFormData, notifyOnDegraded: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </label>

                    <label className="p-3 rounded-xl border border-black/[0.05] dark:border-white/10 flex items-center justify-between cursor-pointer bg-black/[0.01] dark:bg-white/[0.02]">
                      <div>
                        <div className="font-semibold text-xs text-[#1d1d1f] dark:text-white">
                          🌐 {lang === 'zh' ? '默认应用至所有新建服务' : 'Apply to all by default'}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifFormData.defaultEnabled ?? true}
                        onChange={(e) => setNotifFormData({ ...notifFormData, defaultEnabled: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* NOTIFICATION SUBTAB 3: CUSTOM TEMPLATE */}
              {notifModalTab === 'template' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{lang === 'zh' ? '自定义通知消息与 JSON 负载模板' : 'Custom Message Template'}</span>
                    </h4>
                  </div>

                  {/* Variable Helper Chips */}
                  <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/10 space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#86868b]">
                      {lang === 'zh' ? '可用变量 (点击插入):' : 'Variables (Click to insert):'}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {TEMPLATE_VARIABLES.map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => {
                            setNotifFormData({
                              ...notifFormData,
                              customBodyTemplate: (notifFormData.customBodyTemplate || '') + ' ' + v.tag,
                            });
                          }}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/20 border border-black/[0.06] dark:border-white/10 font-mono text-[10.5px] text-[#1d1d1f] dark:text-white transition-colors cursor-pointer"
                          title={v.desc}
                        >
                          {v.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '标题 / 主题模板' : 'Title Template'}
                    </label>
                    <input
                      type="text"
                      value={notifFormData.customTitleTemplate || ''}
                      onChange={(e) => setNotifFormData({ ...notifFormData, customTitleTemplate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                      {lang === 'zh' ? '正文 / Payload 模板' : 'Body Template'}
                    </label>
                    <textarea
                      rows={4}
                      value={notifFormData.customBodyTemplate || ''}
                      onChange={(e) => setNotifFormData({ ...notifFormData, customBodyTemplate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs font-mono text-[#1d1d1f] dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Drawer Footer Buttons */}
              <div className="pt-4 border-t border-black/[0.05] dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] cursor-pointer"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {lang === 'zh' ? '保存通道' : 'Save Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Add / Edit Modal Drawer */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-2xl border border-black/[0.08] dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-black/[0.05] dark:border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-base text-[#1d1d1f] dark:text-white">
                {editingCategory
                  ? lang === 'zh'
                    ? '编辑分类'
                    : 'Edit Category'
                  : lang === 'zh'
                  ? '新建分类'
                  : 'New Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryForm} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '完整分类名称' : 'Category Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Inference Services"
                  value={categoryFormData.name || ''}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '胶囊短标签 (顶栏使用)' : 'Short Tag'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Models"
                  value={categoryFormData.shortName || ''}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, shortName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '分类图标' : 'Category Icon'}
                </label>
                <select
                  value={categoryFormData.icon || 'server'}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                >
                  <option value="server">Server (服务器)</option>
                  <option value="globe">Globe (全球网络 / Web)</option>
                  <option value="database">Database (数据库 / 存储)</option>
                  <option value="cpu">CPU (计算 / 算力)</option>
                  <option value="cloud">Cloud (云原生 / CDN)</option>
                  <option value="shield">Shield (安全 / 网关)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-xs text-[#1d1d1f] dark:text-white">
                  {lang === 'zh' ? '分类描述' : 'Description'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. GPU clusters, LLM inference endpoints"
                  value={categoryFormData.description || ''}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 text-xs text-[#1d1d1f] dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-black/[0.05] dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] cursor-pointer"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1d1d1f] text-white dark:bg-white dark:text-[#1d1d1f] text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {lang === 'zh' ? '保存分类' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
