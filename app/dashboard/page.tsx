"use client";

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import PasswordGate from '@/app/components/PasswordGate';
import MarkdownEditor from '@/app/components/MarkdownEditor';
import { DEFAULT_TIMEZONE, formatDateInTimeZone, formatDateTimeInTimeZone, normalizeTimeZone } from '@/app/lib/timezone';
import { Calendar, Users, FileText, AlertTriangle, CheckCircle, Clock, Download, Search, Filter, BarChart3, Settings, Mail, Archive, ChevronUp, ChevronDown } from 'lucide-react';

interface Submission {
  id: number;
  type: string;
  status: string;
  employee_name: string;
  employee_email: string;
  employee_id: string;
  created_at: string;
  validation_result: string;
  error_message: string | null;
  data_json: string;
}

interface Stats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byType: { [key: string]: number };
  byStatus: { [key: string]: number };
  byEmployer: { [key: string]: number };
}

interface Employer {
  id: number;
  name: string;
  active: boolean;
  color: string;
}

interface EmployerSetting {
  employer: string;
  sb_email: string | null;
  sb_emails?: string[];
  subject_prefix: string | null;
  send_global_copy?: boolean;
  requires_remarks?: boolean;
}

export default function Dashboard() {
  return (
    <PasswordGate requireUsername={true} showLogo={true} title="Dashboard Zugang" subtitle="Administrator-Bereich">
      <DashboardContent />
    </PasswordGate>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byType: {},
    byStatus: {},
    byEmployer: {}
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDebugWarning, setShowDebugWarning] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [configuredTimeZone, setConfiguredTimeZone] = useState<string>(DEFAULT_TIMEZONE);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('sb-auth-token');
    localStorage.removeItem('sb-username');
    window.location.reload();
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const loadConfiguredTimeZone = async () => {
      try {
        const response = await fetch('/api/global-settings');
        const data = await response.json();
        const rawValue = data?.data?.TIMEZONE?.value || DEFAULT_TIMEZONE;
        setConfiguredTimeZone(normalizeTimeZone(rawValue));
      } catch {
        setConfiguredTimeZone(DEFAULT_TIMEZONE);
      }
    };
    loadConfiguredTimeZone();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/submissions/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels = {
    simple: 'Einfache Meldung',
    auscan: 'AU',
    eau: 'eAU-Information',
    childcare: 'Kind krank'
  };

  const statusLabels = {
    accepted: 'Akzeptiert',
    pending: 'Ausstehend',
    needs_au: 'AU erforderlich'
  };

  const statusColors = {
    accepted: 'bg-green-600 text-white',
    pending: 'bg-yellow-500 text-black',
    needs_au: 'bg-red-600 text-white'
  };

  const formatDateTime = (value: string | Date) => {
    return formatDateTimeInTimeZone(value, configuredTimeZone);
  };

  return (
    <div className="min-h-screen bg-white  transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sachbearbeiter Dashboard</h1>
              <p className="text-sm text-gray-500">Krankmelderer — Sachbearbeiteransicht</p>
              <p className="mt-2 text-gray-600">Verwaltung der Krankmeldungen • v10.02</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Theme toggle removed — light mode only */}
              <div className="mr-4">
                <div className="text-xl font-semibold text-gray-800">
                  {formatDateTime(now)} ({configuredTimeZone})
                </div>
              </div>
              <Link href="/staff-instructions" className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                📖 Anleitung
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                title="Sitzung beenden"
              >
                🚪 Abmelden
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 ">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Übersicht', icon: BarChart3 },
                { id: 'submissions', label: 'Meldungen', icon: FileText },
                { id: 'employers', label: 'Arbeitgeber & Einstellungen', icon: Users },
                { id: 'settings', label: 'System-Einstellungen', icon: Settings },
                { id: 'debug', label: 'Für IT Experten', icon: Mail }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id === 'debug' && activeTab !== 'debug') {
                      setShowDebugWarning(true);
                    } else {
                      setActiveTab(id);
                    }
                  }}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 '
                      : 'border-transparent text-gray-700  hover:text-gray-900  hover:border-gray-300 '
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            loading={loading}
            typeLabels={typeLabels}
            statusLabels={statusLabels}
            statusColors={statusColors}
            formatDateTime={formatDateTime}
          />
        )}
        {activeTab === 'submissions' && <SubmissionsTab loadStats={loadStats} timeZone={configuredTimeZone} />}
        {activeTab === 'employers' && <EmployersTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'debug' && <DebugTab formatDateTime={formatDateTime} />}

        {/* Debug Warning Modal */}
        {showDebugWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white  rounded-lg shadow-lg max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200 ">
                <h2 className="text-lg font-bold text-red-600 ">⚠️ Vorsicht!</h2>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700  mb-4">
                  Sie betreten den <strong>Bereich für IT-Experten</strong>. Hier haben Sie Zugriff auf sensible Systemfunktionen und Datenverwaltung.
                </p>
                <p className="text-gray-700  font-semibold">
                  Seien Sie vorsichtig! Falsche Einstellungen können zu Datenverlust führen.
                </p>
              </div>
              <div className="px-6 py-4 bg-gray-50  flex gap-3 justify-end border-t border-gray-200 ">
                <button
                  onClick={() => setShowDebugWarning(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700  border border-gray-300  rounded-md hover:bg-gray-100  transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    setShowDebugWarning(false);
                    setActiveTab('debug');
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Verstanden, weiter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, loading, typeLabels, statusLabels, statusColors, formatDateTime }: any) {
  // All hooks must be at top level before any early returns
  const [currentSubs, setCurrentSubs] = useState<Submission[]>([]);
  const [loadingCurrentSubs, setLoadingCurrentSubs] = useState(false);
  const [collapsedEmployers, setCollapsedEmployers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchCurrent = async () => {
      setLoadingCurrentSubs(true);
      try {
        const res = await fetch('/api/submissions/today');
        const json = await res.json();
        if (json.success && json.data) setCurrentSubs(json.data);
      } catch (err) {
        console.error('Error fetching today submissions', err);
      } finally {
        setLoadingCurrentSubs(false);
      }
    };
    fetchCurrent();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Lade...</span>
      </div>
    );
  }

  // AG Farben: Annahme, stats.byEmployerColors vorhanden (vom Server mitliefern)
  const employerColorMap = stats.byEmployerColors || {};

  const typeColorMap: Record<string, string> = {
    simple: 'bg-blue-500',
    auscan: 'bg-green-500',
    eau: 'bg-indigo-500',
    childcare: 'bg-yellow-500'
  };

  const groupedByEmployer = ((): Record<string, Submission[]> => {
    const groups: Record<string, Submission[]> = {};
    for (const sub of currentSubs) {
      let data: any = {};
      try { data = JSON.parse(sub.data_json || '{}'); } catch { data = {}; }
      const employer = data.employer || 'Unbekannter Arbeitgeber';
      groups[employer] = groups[employer] || [];
      groups[employer].push(sub);
    }
    // sort each group's submissions by last name (employee_name) alphabetically
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => {
        const da = (() => { try { return JSON.parse(a.data_json || '{}'); } catch { return {}; } })();
        const db = (() => { try { return JSON.parse(b.data_json || '{}'); } catch { return {}; } })();
        const na = (da.employee_name || '').toLowerCase();
        const nb = (db.employee_name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }
    return groups;
  })();

  const calcDaysRemaining = (data: any) => {
    try {
      const today = new Date();
      const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const start = data.start_date || data.from_date || data.date;
      const end = data.end_date || data.to_date || data.date;
      if (start && end) {
        const e = new Date(end.slice(0,10));
        const diff = Math.ceil((e.getTime() - today0.getTime()) / (1000*60*60*24)) + 1;
        return diff >= 0 ? diff : 0;
      }
      if (end) {
        const e = new Date(end.slice(0,10));
        const diff = Math.ceil((e.getTime() - today0.getTime()) / (1000*60*60*24)) + 1;
        return diff >= 0 ? diff : 0;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards - Redesigned */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Gesamt Meldungen</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-2">Vergleich Vorjahr: {stats.trends ? `${stats.trends.prevYear} (∆ ${stats.trends.prevYear ? Math.round(((stats.total - stats.trends.prevYear)/Math.max(1,stats.trends.prevYear))*100) : 0}% )` : 'n/a'}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Heute</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.today}</p>
              <p className="text-xs text-gray-600 mt-2">Vorwoche: {stats.trends ? `${stats.trends.prevWeek} (${stats.trends.prevWeek? Math.round(((stats.today - stats.trends.prevWeek)/Math.max(1,stats.trends.prevWeek))*100):0}%)` : 'n/a'}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-800">Diese Woche</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.thisWeek}</p>
              <p className="text-xs text-gray-600 mt-2">Vergleich Vorwoche: {stats.trends ? `${stats.trends.prevWeek} → ${stats.trends.prevWeek? Math.round(((stats.thisWeek - stats.trends.prevWeek)/Math.max(1,stats.trends.prevWeek))*100):0}%` : 'n/a'}</p>
            </div>
            <Clock className="h-8 w-8 text-indigo-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Dieser Monat</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.thisMonth}</p>
              <p className="text-xs text-gray-600 mt-2">Vergleich Vormonat: {stats.trends ? `${stats.trends.prevMonth} (${stats.trends.prevMonth? Math.round(((stats.thisMonth - stats.trends.prevMonth)/Math.max(1,stats.trends.prevMonth))*100):0}%)` : 'n/a'}</p>
            </div>
            <Users className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Feedback Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-yellow-500" />
          Anwender-Feedback (anonym)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-4xl font-bold text-yellow-500">
              {(stats as any).feedback?.avg ? ((stats as any).feedback.avg).toFixed(1) : '0.0'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Durchschnittliche Bewertung</div>
            <div className="text-xs text-gray-500 mt-2">Gesamt: {(stats as any).feedback?.total || 0} Bewertungen</div>
          </div>
          <div className="md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((r) => (
              <div key={r} className="flex items-center gap-3">
                <div className="w-10 font-medium text-sm text-gray-700">{r}★</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-2"
                    style={{
                      width: `${((stats as any).feedback?.distribution?.[String(r)] || 0) / Math.max(1, (stats as any).feedback?.total || 1) * 100}%`,
                    }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-medium text-gray-700">
                  {(stats as any).feedback?.distribution?.[String(r)] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Meldungen nach Typ
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {typeLabels[type as keyof typeof typeLabels] || type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${((count as number) / Math.max(...(Object.values(stats.byType) as number[]))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-8 text-right">{count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Meldungen nach Status
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      status === 'accepted'
                        ? 'bg-green-500'
                        : status === 'pending'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">
                    {statusLabels[status as keyof typeof statusLabels] || status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status === 'accepted'
                          ? 'bg-green-500'
                          : status === 'pending'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{
                        width: `${((count as number) / Math.max(...(Object.values(stats.byStatus) as number[]))) * 100}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {count as number}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aktuell krank gemeldet */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-500" />
          Aktuell krank gemeldet
        </h3>
        {loadingCurrentSubs ? (
          <div className="py-6 text-center text-gray-600">Lade aktuelle Meldungen…</div>
        ) : Object.keys(groupedByEmployer).length === 0 ? (
          <div className="py-6 text-center text-gray-600">Keine aktiven Meldungen</div>
        ) : (
          <div className="space-y-3">
            {Object.keys(groupedByEmployer).sort((a,b)=>a.localeCompare(b)).map((employer) => {
              const items = groupedByEmployer[employer];
              const collapsed = !!collapsedEmployers[employer];
              return (
                <div key={employer} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setCollapsedEmployers(prev => ({ ...prev, [employer]: !prev[employer] }))}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: employerColorMap[employer] || '#cbd5e1' }} />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{employer}</div>
                        <div className="text-xs text-gray-500">{items.length} Meldung(en)</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{collapsed ? '▶' : '▼'}</div>
                  </button>
                  {!collapsed && (
                    <div className="p-3 space-y-2">
                      {items.map(sub => {
                        let data: any = {};
                        try { data = JSON.parse(sub.data_json || '{}'); } catch { data = {}; }
                        const fullName = `${data.employee_vorname || ''} ${data.employee_name || ''}`.trim() || data.employee_name || 'Unbekannt';
                        const days = calcDaysRemaining(data);
                        return (
                          <div key={sub.id} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-gray-50">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-semibold ${typeColorMap[sub.type || 'simple'] || 'bg-gray-400'}`}>
                                {sub.type?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{fullName}</div>
                                <div className="text-xs text-gray-500 truncate">{data.employee_id ? `ID: ${data.employee_id}` : ''}{data.employee_id ? ' • ' : ''}{formatDateTime(sub.created_at)}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-800">{days > 0 ? `Noch ${days} Tag${days>1?'e':''}` : 'Heute'}</div>
                              <a href={`/dashboard?open=${sub.id}`} className="text-xs text-blue-600 hover:underline">Anzeigen</a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Employers removed per UX request */}
    </div>
  );
}

// Submissions Tab Component
function SubmissionsTab({ loadStats, timeZone }: { loadStats: () => void; timeZone: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    searchTerm: '',
    startDate: '',
    endDate: '',
    employer: ''
  });
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [employers, setEmployers] = useState<string[]>([]);
  const [employerColors, setEmployerColors] = useState<Record<string, string>>({});
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    employee: true,
    type: true,
    status: true,
    date: true,
    actions: true
  });
  const [columnOrder, setColumnOrder] = useState<string[]>(['employee', 'type', 'status', 'date', 'actions']);
  const pageSize = 20;

  useEffect(() => {
    fetchEmployers();
    fetchSubmissions();
  }, [filters, page, sortField, sortDirection]);

  const fetchEmployers = async () => {
    try {
      const response = await fetch('/api/employers');
      const data = await response.json();
      if (data.success) {
        const employerList = data.data.map((emp: Employer) => emp.name);
        const colorMap: Record<string, string> = {};
        data.data.forEach((emp: Employer) => {
          colorMap[emp.name] = emp.color;
        });
        setEmployers(employerList);
        setEmployerColors(colorMap);
      }
    } catch (error) {
      console.error('Error fetching employers:', error);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
        sort_field: sortField,
        sort_direction: sortDirection,
      });

      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.searchTerm) params.append('search', filters.searchTerm);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.employer) params.append('employer', filters.employer);

      const response = await fetch(`/api/submissions?${params}`);
      const data = await response.json();

      if (data.success) {
        setSubmissions(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const exportToCSV = () => {
    const typeLabels = {
      simple: 'Einfache Meldung',
      auscan: 'AU',
      eau: 'eAU-Information',
      childcare: 'Kind krank'
    };

    const statusLabels = {
      accepted: 'Akzeptiert',
      pending: 'Ausstehend',
      needs_au: 'AU erforderlich'
    };

    const headers = ['ID', 'Typ', 'Status', 'Mitarbeiter Name', 'Mitarbeiter Vorname', 'E-Mail', 'Arbeitgeber', 'Start Datum', 'End Datum', 'Erstellt am'];
    const csvData = submissions.map(sub => {
      const data = parseData(sub.data_json);
      return [
        sub.id,
        typeLabels[sub.type as keyof typeof typeLabels] || sub.type,
        statusLabels[sub.status as keyof typeof statusLabels] || sub.status,
        data.employee_name || '',
        data.employee_vorname || '',
        data.employee_email || '',
        data.employer || '',
        data.start_date || '',
        data.end_date || '',
        sub.created_at
      ];
    });

    const csvContent = [headers, ...csvData].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meldungen_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleArchive = async () => {
    if (!confirm('Sind Sie sicher, dass Sie die gefilterten Meldungen löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      const body: any = {};
      if (filters.employer) {
        body.employers = [filters.employer];
      } else {
        alert('Bitte filtern Sie nach einem Arbeitgeber, um zu löschen.');
        return;
      }

      const response = await fetch('/api/submissions/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.success) {
        alert(`${data.deleted} Meldungen wurden gelöscht.`);
        fetchSubmissions();
        loadStats();
      } else {
        alert(`Fehler beim Löschen: ${data.error || 'Unbekannter Fehler'}`);
        console.error('Delete error:', data.error);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert(`Fehler beim Löschen: ${error}`);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDateInTimeZone(dateStr, timeZone);
    } catch {
      return dateStr;
    }
  };

  const parseData = (dataJson: string) => {
    try {
      return JSON.parse(dataJson);
    } catch {
      return {};
    }
  };

  const calculateDuration = (data: any, type: string) => {
    try {
      if (type === 'simple') {
        const date = data.date;
        if (!date) return '-';
        return `Am ${formatDate(date)}`;
      } else {
        const start = data.from_date || data.start_date;
        const end = data.to_date || data.end_date;
        if (!start || !end) return '-';
        return `${formatDate(start)} - ${formatDate(end)}`;
      }
    } catch {
      return '-';
    }
  };

  const typeLabels = {
    simple: 'Einfache Meldung',
    auscan: 'AU',
    eau: 'eAU-Information',
    childcare: 'Kind krank'
  };

  const statusLabels = {
    accepted: 'Akzeptiert',
    pending: 'Ausstehend',
    needs_au: 'AU erforderlich'
  };

  const statusColors = {
    accepted: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    needs_au: 'bg-red-100 text-red-800'
  };

  const SortableTh = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1.5 select-none">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Suche
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">Typ</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Alle Typen</option>
                <option value="simple">Einfache Meldung</option>
                <option value="auscan">AU</option>
                <option value="eau">eAU-Information</option>
                <option value="childcare">Kind krank</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Alle Status</option>
                <option value="accepted">Akzeptiert</option>
                <option value="pending">Ausstehend</option>
                <option value="needs_au">AU erforderlich</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">Arbeitgeber</label>
              <select
                value={filters.employer}
                onChange={(e) => handleFilterChange('employer', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Alle Arbeitgeber</option>
                {employers.map((emp) => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">Suche</label>
              <input
                type="text"
                placeholder="Name, E-Mail..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">Von Datum</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">Bis Datum</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Meldungen ({total})</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV Export
              </button>
              <button 
                onClick={handleArchive}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Archive className="h-4 w-4 mr-2" />
                Löschen/Säubern
              </button>
              <div className="flex items-center gap-2 ml-4 border-l pl-4">
                <label className="text-sm font-medium text-gray-700">Schriftgröße:</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as 'sm' | 'base' | 'lg')}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="sm">Klein</option>
                  <option value="base">Normal</option>
                  <option value="lg">Groß</option>
                </select>
              </div>
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ⚙️ Spalten
              </button>
            </div>
          </div>

          {showColumnConfig && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-sm mb-3 text-gray-900">Spaltenansicht konfigurieren</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {Object.keys(visibleColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span>{col === 'employee' ? 'Mitarbeiter' : col === 'type' ? 'Typ' : col === 'status' ? 'Status' : col === 'date' ? 'Datum' : 'Aktionen'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={`overflow-x-auto border rounded-lg ${fontSize === 'sm' ? 'text-xs' : fontSize === 'base' ? 'text-sm' : 'text-base'}`}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
                <tr>
                  {visibleColumns.employee && <SortableTh field="employee_name">👤 Mitarbeiter</SortableTh>}
                  {visibleColumns.type && <SortableTh field="type">📋 Typ</SortableTh>}
                  {visibleColumns.status && <SortableTh field="status">✓ Status</SortableTh>}
                  {visibleColumns.date && <SortableTh field="created_at">📅 Datum</SortableTh>}
                  {visibleColumns.actions && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">⚙️ Aktionen</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Lade Meldungen...</span>
                      </div>
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <FileText className="h-12 w-12 text-gray-300 mb-2" />
                        <p className="font-medium">Keine Meldungen gefunden</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => {
                    const data = parseData(submission.data_json);
                    const employerColor = employerColors[data.employer] || '#3B82F6';
                    return (
                      <tr key={submission.id} style={{ borderLeft: `5px solid ${employerColor}` }} className="hover:bg-blue-50 transition-colors">
                        {visibleColumns.employee && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <div className="font-semibold text-gray-900">{data.employee_name} {data.employee_vorname}</div>
                              <div className="text-xs text-gray-600 mt-0.5">{data.employee_email || '–'}</div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: employerColor }}></span>
                                <span className="font-medium">{data.employer}</span>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.type && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white">
                              {typeLabels[submission.type as keyof typeof typeLabels] || submission.type}
                            </span>
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold ${statusColors[submission.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                              {statusLabels[submission.status as keyof typeof statusLabels] || submission.status}
                            </span>
                          </td>
                        )}
                        {visibleColumns.date && (
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-medium">
                            {formatDate(submission.created_at)}
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <a
                                href={`/api/submissions/${submission.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2.5 py-1.5 border border-blue-300 rounded text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                title="PDF herunterladen"
                              >
                                📄 PDF
                              </a>
                              <button
                                onClick={() => {
                                  const details = JSON.stringify(data, null, 2);
                                  alert(`Meldungsdetails:\n${details}`);
                                }}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Details anzeigen"
                              >
                                🔍 Daten
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-700">
                Zeige {((page - 1) * pageSize) + 1} bis {Math.min(page * pageSize, total)} von {total} Ergebnissen
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Zurück
                </button>
                <span className="text-sm">
                  Seite {page} von {Math.ceil(total / pageSize)}
                </span>
                <button
                  onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
                  disabled={page === Math.ceil(total / pageSize)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Employer Color Row Component
function EmployerColorRow({ employer, updateEmployer, deleteEmployer }: any) {
  const [editingColor, setEditingColor] = useState(false);
  const [tempColor, setTempColor] = useState(employer.color);

  const colorPresets = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#14B8A6', // Teal
    '#6366F1', // Indigo
    '#D946EF', // Fuchsia
  ];

  const handleColorChange = (color: string) => {
    setTempColor(color);
  };

  const handleSave = () => {
    updateEmployer(employer.id, employer.name, employer.active, tempColor);
    setEditingColor(false);
  };

  const handleCancel = () => {
    setTempColor(employer.color);
    setEditingColor(false);
  };

  return (
    <div key={employer.id} className="border rounded-lg p-4">
      {!editingColor ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border-2 border-gray-300 shadow-sm" style={{ backgroundColor: employer.color }}></div>
            <span className={employer.active ? 'text-gray-900 font-medium' : 'text-gray-700 line-through'}>
              {employer.name}
            </span>
            <span className="text-xs text-gray-500 font-mono">{employer.color}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingColor(true)}
              className="px-3 py-1 text-sm border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50 font-medium"
            >
              🎨 Farbe
            </button>
            <button
              onClick={() => updateEmployer(employer.id, employer.name, !employer.active, employer.color)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {employer.active ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm" style={{ backgroundColor: tempColor }}></div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700  mb-1">Farbe wählen</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={tempColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="h-10 border-2 border-gray-300 rounded cursor-pointer flex-1"
                />
                <input
                  type="text"
                  value={tempColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(val) || val === '') {
                      setTempColor(val);
                    }
                  }}
                  placeholder="#000000"
                  className="px-3 py-2 border border-gray-300 rounded font-mono text-sm w-24"
                />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-2">Vordefinierte Farben:</p>
            <div className="grid grid-cols-5 gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-full h-10 rounded-lg border-2 transition-all ${
                    tempColor === color ? 'border-gray-900 shadow-lg scale-110' : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={handleCancel}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Consolidated Employers & Settings Tab Component
function EmployersTab() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [employerSettings, setEmployerSettings] = useState<EmployerSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployerName, setNewEmployerName] = useState('');
  const [expandedEmployer, setExpandedEmployer] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingSettings, setEditingSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    loadEmployers();
    loadEmployerSettings();
  }, []);

  const loadEmployers = async () => {
    try {
      const response = await fetch('/api/employers');
      const data = await response.json();
      if (data.success) {
        setEmployers(data.data);
      }
    } catch (error) {
      console.error('Error loading employers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployerSettings = async () => {
    try {
      const response = await fetch('/api/employer-settings');
      const data = await response.json();
      if (data.success) {
        setEmployerSettings(data.data);
        // Initialize editing state
        const initialEditing: Record<string, any> = {};
        data.data.forEach((setting: any) => {
          initialEditing[setting.employer] = {
            emails: setting.sb_emails || [],
            prefix: setting.subject_prefix || '',
            sendGlobalCopy: setting.send_global_copy || false,
            requiresRemarks: setting.requires_remarks || false
          };
        });
        setEditingSettings(initialEditing);
      }
    } catch (error) {
      console.error('Error loading employer settings:', error);
    }
  };

  const addEmployer = async () => {
    if (!newEmployerName.trim()) {
      alert('Bitte geben Sie einen Arbeitgebernamen ein');
      return;
    }
    try {
      const response = await fetch('/api/config/employers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEmployerName.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setNewEmployerName('');
        loadEmployers();
      } else {
        alert('Fehler beim Hinzufügen des Arbeitgebers');
      }
    } catch (error) {
      console.error('Error adding employer:', error);
      alert('Fehler beim Hinzufügen des Arbeitgebers');
    }
  };

  const reorderOnServer = async (orderedIds: number[]) => {
    try {
      const response = await fetch('/api/employers/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: orderedIds }),
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Failed to update order on server', data);
      }
    } catch (error) {
      console.error('Error updating order on server', error);
    }
  };

  const moveUp = async (id: number) => {
    setEmployers(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const tmp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = tmp;
      // persist
      reorderOnServer(copy.map(c => c.id));
      return copy;
    });
  };

  const moveDown = async (id: number) => {
    setEmployers(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const tmp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = tmp;
      // persist
      reorderOnServer(copy.map(c => c.id));
      return copy;
    });
  };

  const moveToTop = async (id: number) => {
    setEmployers(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      reorderOnServer(copy.map(c => c.id));
      return copy;
    });
  };

  const moveToBottom = async (id: number) => {
    setEmployers(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.push(item);
      reorderOnServer(copy.map(c => c.id));
      return copy;
    });
  };

  // DnD-Kit drag end handler
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (String(active.id) === String(over.id)) return;
    setEmployers(prev => {
      const oldIndex = prev.findIndex((p) => String(p.id) === String(active.id));
      const newIndex = prev.findIndex((p) => String(p.id) === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      const copy = arrayMove(prev, oldIndex, newIndex);
      reorderOnServer(copy.map(c => c.id));
      return copy;
    });
  };

  const updateEmployer = async (id: number, name: string, active: boolean, color: string) => {
    try {
      const response = await fetch('/api/employers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, active, color }),
      });
      const data = await response.json();
      if (data.success) {
        setEmployers(prev => prev.map(e => 
          e.id === id ? { ...e, name, active, color } : e
        ));
      } else {
        alert('Fehler beim Aktualisieren des Arbeitgebers');
      }
    } catch (error) {
      console.error('Error updating employer:', error);
      alert('Fehler beim Aktualisieren des Arbeitgebers');
    }
  };

  const deleteEmployer = async (id: number) => {
    if (!confirm('Möchten Sie diesen Arbeitgeber wirklich löschen?')) return;
    try {
      const response = await fetch('/api/employers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (data.success) {
        loadEmployers();
        setEmployerSettings(prev => prev.filter(s => s.employer !== employers.find(e => e.id === id)?.name));
      } else {
        alert('Fehler beim Löschen des Arbeitgebers');
      }
    } catch (error) {
      console.error('Error deleting employer:', error);
      alert('Fehler beim Löschen des Arbeitgebers');
    }
  };

  const saveEmployerSetting = async (
    employer: string,
    sbEmails: string[],
    subjectPrefix: string,
    sendGlobalCopy: boolean = false,
    requiresRemarks: boolean = false
  ) => {
    setSavingId(employers.find(e => e.name === employer)?.id || null);
    try {
      const emailArray = sbEmails.filter(e => e.trim());

      const response = await fetch('/api/employer-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employer,
          sb_emails: emailArray,
          subject_prefix: subjectPrefix,
          send_global_copy: sendGlobalCopy,
          requires_remarks: requiresRemarks,
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadEmployerSettings();
        alert('Einstellungen gespeichert');
      } else {
        alert('Fehler beim Speichern der Einstellung');
      }
    } catch (error) {
      console.error('Error saving employer setting:', error);
      alert('Fehler beim Speichern der Einstellung');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Lade...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Employer */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">📋 Neuen Arbeitgeber hinzufügen</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Name des Arbeitgebers"
              value={newEmployerName}
              onChange={(e) => setNewEmployerName(e.target.value)}
              className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-700"
            />
            <button
              onClick={addEmployer}
              disabled={!newEmployerName.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users className="h-4 w-4 mr-2" />
              Hinzufügen
            </button>
          </div>
        </div>
      </div>

      {/* Employers List with Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">👥 Arbeitgeber verwalten ({employers.length})</h3>
          
          {employers.length === 0 ? (
            <div className="text-center py-8 text-gray-700">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Keine Arbeitgeber gefunden</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={employers.map(e => String(e.id))} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {employers.map((employer, idx) => (
                    <EmployerCard
                      key={employer.id}
                      employer={employer}
                      idx={idx}
                      totalEmployers={employers.length}
                      expandedEmployer={expandedEmployer}
                      setExpandedEmployer={setExpandedEmployer}
                      moveToTop={moveToTop}
                      moveUp={moveUp}
                      moveDown={moveDown}
                      moveToBottom={moveToBottom}
                      updateEmployer={updateEmployer}
                      deleteEmployer={deleteEmployer}
                      employerSettings={employerSettings}
                      editingSettings={editingSettings}
                      setEditingSettings={setEditingSettings}
                      savingId={savingId}
                      saveEmployerSetting={saveEmployerSetting}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab() {
  const [employerSettings, setEmployerSettings] = useState<EmployerSetting[]>([]);
  const [globalSettings, setGlobalSettings] = useState<Record<string, { value: string; source: 'DB' | 'ENV' }>>({});
  const [simpleSettings, setSimpleSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    smtp: false,
    email: false,
    app: false,
    file: false,
    retention: false,
    security: false,
    instructions: false
  });

  useEffect(() => {
    loadEmployerSettings();
    loadGlobalSettings();
  }, []);

  const loadEmployerSettings = async () => {
    try {
      const response = await fetch('/api/employer-settings');
      const data = await response.json();
      if (data.success) {
        setEmployerSettings(data.data);
      }
    } catch (error) {
      console.error('Error loading employer settings:', error);
    }
  };

  const loadGlobalSettings = async () => {
    try {
      const response = await fetch('/api/global-settings');
      const data = await response.json();
      if (data.success && data.data) {
        setGlobalSettings(data.data);
        // Create simplified version for posting back to API
        const simplified: Record<string, string> = {};
        for (const [key, item] of Object.entries(data.data)) {
          const settingItem = item as { value: string; source: 'DB' | 'ENV' };
          simplified[key] = settingItem.value || '';
        }
        setSimpleSettings(simplified);
        console.log('Global settings loaded:', simplified);
      } else {
        console.error('API response error:', data);
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
    }
  };

  const saveEmployerSetting = async (employer: string, sbEmails: string[] | string, subjectPrefix: string, sendGlobalCopy: boolean) => {
    setLoading(true);
    try {
      const emailArray = Array.isArray(sbEmails) ? sbEmails.filter(e => e.trim()) : sbEmails.split(',').map(s=>s.trim()).filter(Boolean);

      const response = await fetch('/api/employer-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer, sb_emails: emailArray, subject_prefix: subjectPrefix, send_global_copy: !!sendGlobalCopy }),
      });
      const data = await response.json();
      if (data.success) {
        loadEmployerSettings();
      } else {
        alert('Fehler beim Speichern der Einstellung');
      }
    } catch (error) {
      console.error('Error saving employer setting:', error);
      alert('Fehler beim Speichern der Einstellung');
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/global-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simpleSettings),
      });
      const data = await response.json();
      if (data.success) {
        loadGlobalSettings();
        alert('Globale Einstellungen gespeichert');
      } else {
        alert('Fehler beim Speichern der globalen Einstellungen');
      }
    } catch (error) {
      console.error('Error saving global settings:', error);
      alert('Fehler beim Speichern der globalen Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get source badge
  const getSourceBadge = (key: string) => {
    const setting = globalSettings[key];
    if (!setting) return null;
    return (
      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded ${
        setting.source === 'DB' 
          ? 'bg-blue-100 text-blue-800' 
          : 'bg-amber-100 text-amber-800'
      }`}>
        {setting.source}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* SMTP Configuration Section */}
      <div className="bg-white  shadow rounded-lg border border-gray-200  overflow-hidden">
        <div 
          onClick={() => setExpandedSections(prev => ({ ...prev, smtp: !prev.smtp }))}
          className="px-4 py-4 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100   cursor-pointer hover:from-gray-100 hover:to-gray-200   transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-600 ">
                {expandedSections.smtp ? '▼' : '▶'}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 ">📧 SMTP Konfiguration</h3>
            </div>
          </div>
        </div>
        
        {expandedSections.smtp && (
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200  bg-white ">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  SMTP Host
                  {getSourceBadge('SMTP_HOST')}
                </label>
                <input
                  type="text"
                  value={simpleSettings.SMTP_HOST || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, SMTP_HOST: e.target.value }))}
                  placeholder="mail.example.com"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  SMTP Port
                  {getSourceBadge('SMTP_PORT')}
                </label>
                <input
                  type="text"
                  value={simpleSettings.SMTP_PORT || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, SMTP_PORT: e.target.value }))}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  SMTP User
                  {getSourceBadge('SMTP_USER')}
                </label>
                <input
                  type="text"
                  value={simpleSettings.SMTP_USER || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, SMTP_USER: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  SMTP Passwort
                  {getSourceBadge('SMTP_PASS')}
                </label>
                <input
                  type="password"
                  value={simpleSettings.SMTP_PASS || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, SMTP_PASS: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  SMTP From Email
                  {getSourceBadge('SMTP_FROM_EMAIL')}
                </label>
                <input
                  type="email"
                  value={simpleSettings.SMTP_FROM_EMAIL || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, SMTP_FROM_EMAIL: e.target.value }))}
                  placeholder="noreply@example.com"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Recipients Section */}
      <div className="bg-white  shadow rounded-lg border border-gray-200  overflow-hidden">
        <div 
          onClick={() => setExpandedSections(prev => ({ ...prev, email: !prev.email }))}
          className="px-4 py-4 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100   cursor-pointer hover:from-gray-100 hover:to-gray-200   transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-600 ">
                {expandedSections.email ? '▼' : '▶'}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 ">📩 E-Mail Empfänger</h3>
            </div>
          </div>
        </div>
        
        {expandedSections.email && (
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">
                Globale SB E-Mail
                {getSourceBadge('SB_EMAIL')}
              </label>
              <input
                type="email"
                value={simpleSettings.SB_EMAIL || ''}
                onChange={(e) => setSimpleSettings(prev => ({ ...prev, SB_EMAIL: e.target.value }))}
                placeholder="personal@example.com"
                className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">
                Standard Betreff-Präfix
                {getSourceBadge('EMAIL_SUBJECT_PREFIX')}
              </label>
              <input
                type="text"
                value={simpleSettings.EMAIL_SUBJECT_PREFIX || ''}
                onChange={(e) => setSimpleSettings(prev => ({ ...prev, EMAIL_SUBJECT_PREFIX: e.target.value }))}
                placeholder="Krankmeldung:"
                className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
              />
            </div>
          </div>
        )}
      </div>

      {/* App Configuration Section */}
      <div className="bg-white  shadow rounded-lg border border-gray-200  overflow-hidden">
        <div 
          onClick={() => setExpandedSections(prev => ({ ...prev, app: !prev.app }))}
          className="px-4 py-4 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100   cursor-pointer hover:from-gray-100 hover:to-gray-200   transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-600 ">
                {expandedSections.app ? '▼' : '▶'}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 ">🏢 App Konfiguration</h3>
            </div>
          </div>
        </div>
        
        {expandedSections.app && (
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">
                App Name
                {getSourceBadge('NEXT_PUBLIC_APP_NAME')}
              </label>
              <input
                type="text"
                value={simpleSettings.NEXT_PUBLIC_APP_NAME || ''}
                onChange={(e) => setSimpleSettings(prev => ({ ...prev, NEXT_PUBLIC_APP_NAME: e.target.value }))}
                placeholder="App Name"
                className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">
                App Slogan
                {getSourceBadge('NEXT_PUBLIC_APP_SLOGAN')}
              </label>
              <input
                type="text"
                value={simpleSettings.NEXT_PUBLIC_APP_SLOGAN || ''}
                onChange={(e) => setSimpleSettings(prev => ({ ...prev, NEXT_PUBLIC_APP_SLOGAN: e.target.value }))}
                placeholder="App Slogan"
                className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">
                Zeitzone
                {getSourceBadge('TIMEZONE')}
              </label>
              <input
                type="text"
                value={simpleSettings.TIMEZONE || ''}
                onChange={(e) => setSimpleSettings(prev => ({ ...prev, TIMEZONE: e.target.value }))}
                placeholder="Europe/Berlin"
                className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
              />
              <p className="text-xs text-gray-500 mt-1">Empfohlen: Europe/Berlin (MEZ/MESZ).</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700  mb-1">
                Public Access Token
                {getSourceBadge('PUBLIC_ACCESS_TOKEN')}
              </label>
              <input
                type="text"
                value={simpleSettings.PUBLIC_ACCESS_TOKEN || ''}
                onChange={(e) => setSimpleSettings(prev => ({ ...prev, PUBLIC_ACCESS_TOKEN: e.target.value }))}
                placeholder="Secret token for public access"
                className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
              />
              <p className="text-xs text-gray-500 mt-1">Wenn gesetzt, kann die Seite mit ?access_token=TOKEN aufgerufen werden.</p>
            </div>
          </div>
        )}
      </div>

      {/* File Upload Settings Section */}
      <div className="bg-white  shadow rounded-lg border border-gray-200  overflow-hidden">
        <div 
          onClick={() => setExpandedSections(prev => ({ ...prev, file: !prev.file }))}
          className="px-4 py-4 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100   cursor-pointer hover:from-gray-100 hover:to-gray-200   transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-600 ">
                {expandedSections.file ? '▼' : '▶'}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 ">📁 Datei Upload</h3>
            </div>
          </div>
        </div>
        
        {expandedSections.file && (
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200  bg-white ">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  Max. Dateigröße (Bytes)
                  {getSourceBadge('MAX_FILE_SIZE')}
                </label>
                <input
                  type="text"
                  value={simpleSettings.MAX_FILE_SIZE || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, MAX_FILE_SIZE: e.target.value }))}
                  placeholder="10485760"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  Upload Verzeichnis
                  {getSourceBadge('UPLOAD_DIR')}
                </label>
                <input
                  type="text"
                  value={simpleSettings.UPLOAD_DIR || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, UPLOAD_DIR: e.target.value }))}
                  placeholder="./uploads"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  Erlaubte Dateitypen
                  {getSourceBadge('ALLOWED_FILE_TYPES')}
                </label>
                <input
                  type="text"
                  value={simpleSettings.ALLOWED_FILE_TYPES || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, ALLOWED_FILE_TYPES: e.target.value }))}
                  placeholder="pdf,jpg,jpeg,png"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Retention Settings Section */}
      <div className="bg-white  shadow rounded-lg border border-gray-200  overflow-hidden">
        <div 
          onClick={() => setExpandedSections(prev => ({ ...prev, retention: !prev.retention }))}
          className="px-4 py-4 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100   cursor-pointer hover:from-gray-100 hover:to-gray-200   transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-600 ">
                {expandedSections.retention ? '▼' : '▶'}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 ">🗑️ Aufbewahrung</h3>
            </div>
          </div>
        </div>
        
        {expandedSections.retention && (
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200  bg-white ">
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">
                Aufbewahrung (Tage)
                {getSourceBadge('FILE_RETENTION_DAYS')}
              </label>
              <input
                type="text"
                value={simpleSettings.FILE_RETENTION_DAYS || ''}
                onChange={(e) => setSimpleSettings(prev => ({ ...prev, FILE_RETENTION_DAYS: e.target.value }))}
                placeholder="365"
                className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
              />
            </div>
          </div>
        )}
      </div>

      {/* Security Settings Section */}
      <div className="bg-white shadow rounded-lg border border-red-200 overflow-hidden">
        <div 
          onClick={() => setExpandedSections(prev => ({ ...prev, security: !prev.security }))}
          className="px-4 py-4 sm:px-6 bg-gradient-to-r from-red-50 to-red-100   cursor-pointer hover:from-red-100 hover:to-red-200   transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-red-600 ">
                {expandedSections.security ? '▼' : '▶'}
              </span>
              <h3 className="text-lg font-semibold text-red-900 ">🔐 Sicherheit</h3>
            </div>
          </div>
        </div>
        
        {expandedSections.security && (
          <div className="px-4 py-5 sm:p-6 border-t border-red-200  bg-white  space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">
                Public Password
                {getSourceBadge('PUBLIC_PASSWORD')}
              </label>
              <input
                type="text"
                value={simpleSettings.PUBLIC_PASSWORD || ''}
                onChange={(e) => setSimpleSettings(prev => ({ ...prev, PUBLIC_PASSWORD: e.target.value }))}
                placeholder="Public Password (visible)"
                className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  Dashboard Username
                  {getSourceBadge('DASHBOARD_USER')}
                </label>
                <input
                  type="text"
                  value={simpleSettings.DASHBOARD_USER || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, DASHBOARD_USER: e.target.value }))}
                  placeholder="admin"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">
                  Dashboard Passwort
                  {getSourceBadge('DASHBOARD_PASSWORD')}
                </label>
                <input
                  type="password"
                  value={simpleSettings.DASHBOARD_PASSWORD || ''}
                  onChange={(e) => setSimpleSettings(prev => ({ ...prev, DASHBOARD_PASSWORD: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Markdown Editor for Instructions Section */}
      <div className="bg-white  shadow rounded-lg border border-gray-200  overflow-hidden">
        <div 
          onClick={() => setExpandedSections(prev => ({ ...prev, instructions: !prev.instructions }))}
          className="px-4 py-4 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100   cursor-pointer hover:from-gray-100 hover:to-gray-200   transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-600 ">
                {expandedSections.instructions ? '▼' : '▶'}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 ">📝 Anleitungstext</h3>
            </div>
          </div>
        </div>
        
        {expandedSections.instructions && (
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200  bg-white ">
            <MarkdownEditor slug="instructions" />
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={saveGlobalSettings}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600  text-white rounded-md hover:bg-blue-700  disabled:opacity-50 text-base font-semibold shadow-md transition-colors"
      >
        {loading ? '⏳ Speichert...' : '💾 Alle Einstellungen speichern'}
      </button>
    </div>
  );
}

// Debug Tab Component
function DebugTab({ formatDateTime }: { formatDateTime: (value: string | Date) => string }) {
  const [debugHistory, setDebugHistory] = useState<any[]>([]);
  const [submissionEmailLogs, setSubmissionEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debugTo, setDebugTo] = useState('');
  const [debugSubject, setDebugSubject] = useState('');
  const [debugHtml, setDebugHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [warningConfirmCount, setWarningConfirmCount] = useState(0);

  useEffect(() => {
    fetchDebugHistory();
    fetchSubmissionEmailLogs();
  }, []);

  const fetchDebugHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/debug/emails');
      const json = await res.json();
      if (json.success) setDebugHistory(json.data);
    } catch (err) {
      console.error('Error fetching email history', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionEmailLogs = async () => {
    try {
      const res = await fetch('/api/debug/submission-emails');
      const json = await res.json();
      if (json.success) setSubmissionEmailLogs(json.data);
    } catch (err) {
      console.error('Error fetching submission email logs', err);
    }
  };

  const handleDebugSendTest = async () => {
    if (!debugTo) return alert('Bitte Empfänger eingeben');
    setSending(true);
    try {
      const res = await fetch('/api/debug/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: debugTo, subject: debugSubject, html: debugHtml }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Test-E-Mail gesendet');
        setDebugTo(''); setDebugSubject(''); setDebugHtml('');
        fetchDebugHistory();
      } else {
        alert('Fehler beim Senden der Test-E-Mail');
      }
    } catch (err) {
      console.error(err);
      alert('Fehler beim Senden der Test-E-Mail');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteAllClick = () => {
    setShowDeleteWarning(true);
    setWarningConfirmCount(0);
  };

  const handleWarningConfirm = async () => {
    if (warningConfirmCount < 2) {
      setWarningConfirmCount(prev => prev + 1);
      return;
    }

    setShowDeleteWarning(false);
    setLoading(true);
    try {
      const res = await fetch('/api/debug/delete-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchDebugHistory();
        fetchSubmissionEmailLogs();
      } else {
        alert(`Fehler: ${json.error}`);
      }
    } catch (err) {
      console.error('Error deleting all:', err);
      alert(`Fehler: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">⚠️</div>
              <h3 className="text-3xl font-bold text-red-600 mb-2">EXTREM KRITISCH!</h3>
              <p className="text-lg text-gray-700 font-semibold mb-4">Sie sind im Begriff, das UNIVERSUM AUSZULÖSCHEN!</p>
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-900 font-mono">
                  🗑️ Alle Meldungen werden VERNICHTET<br />
                  🔥 Alle hochgeladenen Dateien werden VERBRANNT<br />
                  💥 Diese Aktion ist UNUMKEHRBAR<br />
                  🚀 Es gibt KEINEN UNDO-Knopf<br />
                  👻 Nicht einmal IT-Gurus können das wiederherstellen
                </p>
              </div>
              <p className="text-gray-800 font-semibold mb-6">
                Sind Sie {warningConfirmCount === 0 ? 'WIRKLICH' : 'ABSOLUT'} sicher? Klicken Sie {warningConfirmCount === 0 ? 'nochmal' : 'noch einmal'} zur Bestätigung.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteWarning(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 bg-white hover:bg-gray-50"
                >
                  Abbrechen (Vernunft siegt!)
                </button>
                <button
                  onClick={handleWarningConfirm}
                  className={`px-6 py-3 rounded-lg font-semibold text-white ${
                    warningConfirmCount < 2
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-red-600 hover:bg-red-700 animate-pulse'
                  }`}
                >
                  {warningConfirmCount === 0 ? '🔥 JA, LÖSCHEN!' : warningConfirmCount === 1 ? '⚡ Wirklich JA!' : '💣 DEFINITIV LÖSCHEN!'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Data */}
      <div className="bg-white shadow rounded-lg border-2 border-red-300">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-red-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Nur für IT-Experten: Atomare Datenvernichtung
          </h3>
          <p className="text-sm text-gray-700 mb-4">Löscht buchstäblich ALLES. Meldungen? Weg. Dateien? Verbrannt. Einstellungen? Bleiben (aus Barmherzigkeit).</p>
          <button
            onClick={handleDeleteAllClick}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ☢️ KERNFUSION STARTEN
          </button>
        </div>
      </div>

      {/* Submission Email Logs */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Versendete E-Mails ({submissionEmailLogs.length})
            </h3>
            <button
              onClick={fetchSubmissionEmailLogs}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Aktualisieren
            </button>
          </div>

          {submissionEmailLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-700">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Keine E-Mails verschickt</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {submissionEmailLogs.map((log, index) => {
                // Determine label and color based on action
                let label = '';
                let colorClass = 'text-blue-600';
                let icon = '📧';

                if (log.action === 'email_sent_sb') {
                  label = 'Meldung an Sachbearbeiter versendet';
                  colorClass = 'text-green-600';
                  icon = '✓';
                } else if (log.action === 'email_sent_employee') {
                  label = 'Meldung an Mitarbeiter versendet';
                  colorClass = 'text-green-600';
                  icon = '✓';
                } else if (log.action === 'email_failed_sb') {
                  label = 'Fehler beim Versand an Sachbearbeiter';
                  colorClass = 'text-red-600';
                  icon = '✗';
                } else if (log.action === 'email_failed_employee') {
                  label = 'Fehler beim Versand an Mitarbeiter';
                  colorClass = 'text-red-600';
                  icon = '✗';
                } else if (log.action === 'password_request_sent') {
                  label = 'Passwortanforderung versendet';
                  colorClass = 'text-green-600';
                  icon = '✓';
                } else if (log.action === 'password_request_failed') {
                  label = 'Passwortanforderung: Ungültige E-Mail';
                  colorClass = 'text-orange-600';
                  icon = '⚠️';
                } else if (log.action === 'password_request_error') {
                  label = 'Fehler bei Passwortanforderung';
                  colorClass = 'text-red-600';
                  icon = '✗';
                }

                return (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        {log.submission_id ? (
                          <p className="font-semibold text-gray-900">
                            Meldung #{log.submission_id}
                          </p>
                        ) : (
                          <p className="font-semibold text-gray-900">
                            🔐 Passwortanforderung
                          </p>
                        )}
                        <p className="text-gray-600 text-xs">
                          {formatDateTime(log.timestamp)}
                        </p>
                      </div>
                      <div>
                        <p className={`font-medium flex items-center gap-1 ${colorClass}`}>
                          {icon} {label}
                        </p>
                      </div>
                    </div>
                    {log.details && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                        {log.details.to && (
                          <p>📧 An: {Array.isArray(log.details.to) ? log.details.to.join(', ') : log.details.to}</p>
                        )}
                        {log.details.globalEmail && (
                          <p>🌐 Erwartet: {log.details.globalEmail}</p>
                        )}
                        {log.details.subject && (
                          <p className="truncate">📝 Betreff: {log.details.subject}</p>
                        )}
                        {log.details.error && (
                          <p className="text-red-600">⚠️ Error: {log.details.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test-E-Mail senden
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">Empfänger</label>
                <input
                  type="email"
                  value={debugTo}
                  onChange={(e) => setDebugTo(e.target.value)}
                  placeholder="test@example.com"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">Betreff</label>
                <input
                  type="text"
                  value={debugSubject}
                  onChange={(e) => setDebugSubject(e.target.value)}
                  placeholder="Test Betreff"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-1">HTML-Inhalt</label>
              <textarea
                value={debugHtml}
                onChange={(e) => setDebugHtml(e.target.value)}
                rows={8}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-500"
                placeholder="<h1>Test E-Mail</h1><p>Dies ist eine Test-E-Mail.</p>"
              />
            </div>
            <button
              onClick={handleDebugSendTest}
              disabled={sending || !debugTo}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sende...' : 'Test-E-Mail senden'}
            </button>
          </div>
        </div>
      </div>

      {/* Email History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              E-Mail-Verlauf ({debugHistory.length})
            </h3>
            <button
              onClick={fetchDebugHistory}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Aktualisieren
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Lade...</span>
            </div>
          ) : debugHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-700">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Keine E-Mails im Verlauf</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debugHistory.map((email, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{email.subject}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          email.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {email.success ? 'Erfolgreich' : 'Fehlgeschlagen'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">An: {email.to}</p>
                      <p className="text-sm text-gray-700">
                        {formatDateTime(email.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Separate component for each employer card to handle useSortable hook properly
function EmployerCard({
  employer,
  idx,
  totalEmployers,
  expandedEmployer,
  setExpandedEmployer,
  moveToTop,
  moveUp,
  moveDown,
  moveToBottom,
  updateEmployer,
  deleteEmployer,
  employerSettings,
  editingSettings,
  setEditingSettings,
  savingId,
  saveEmployerSetting
}: any) {
  const settings = employerSettings.find((s: EmployerSetting) => s.employer === employer.name);
  const editing = editingSettings[employer.name] || {
    emails: settings?.sb_emails || [],
    prefix: settings?.subject_prefix || '',
    sendGlobalCopy: settings?.send_global_copy || false,
    requiresRemarks: settings?.requires_remarks || false
  };

  // Now hooks can be called at the top level
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(employer.id) });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-2 rounded-lg overflow-hidden transition-colors ${isDragging ? 'opacity-60' : ''} border-gray-200 hover:border-blue-300`}
    >
      {/* Header */}
      <div 
        onClick={() => setExpandedEmployer(expandedEmployer === employer.id ? null : employer.id)}
        className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-4 sm:px-6 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors"
      >
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div 
              className="text-lg font-bold text-gray-600 "
            >
              {expandedEmployer === employer.id ? '▼' : '▶'}
            </div>
            <div 
              className="w-6 h-6 rounded-lg border-2 border-gray-300 shadow-sm flex-shrink-0" 
              style={{ backgroundColor: employer.color }}
            />
            <div className="flex-1">
              <h4 className={`text-lg font-bold ${employer.active ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                {employer.name}
              </h4>
              <p className="text-xs text-gray-600 font-mono">{employer.color}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Drag handle: attach dnd-kit listeners/attributes here to avoid swallowing header clicks */}
            <button
              {...attributes}
              {...listeners}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              title="Drag"
              className="px-2 py-2 mr-2 text-sm border rounded-md bg-gray-50 hover:bg-gray-100 cursor-grab"
            >
              ≡
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveToTop(employer.id); }}
              disabled={idx === 0}
              title="Ganz nach oben"
              className="px-2 py-2 text-sm border rounded-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
            >
              ⤒
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveUp(employer.id); }}
              disabled={idx === 0}
              title="Nach oben"
              className="px-2 py-2 text-sm border rounded-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
            >
              ↑
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveDown(employer.id); }}
              disabled={idx === totalEmployers - 1}
              title="Nach unten"
              className="px-2 py-2 text-sm border rounded-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
            >
              ↓
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveToBottom(employer.id); }}
              disabled={idx === totalEmployers - 1}
              title="Ganz nach unten"
              className="px-2 py-2 text-sm border rounded-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
            >
              ⤓
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expandedEmployer === employer.id && (
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6 space-y-6 bg-gray-50">
          {/* Employer Settings */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">⚙️ Arbeitgeber-Einstellungen</h5>
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => updateEmployer(employer.id, employer.name, !employer.active, employer.color)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    employer.active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {employer.active ? '✓ Aktiv' : '✗ Inaktiv'}
                </button>
                <EmployerColorRow 
                  employer={employer} 
                  updateEmployer={updateEmployer}
                />
                <button
                  onClick={() => deleteEmployer(employer.id)}
                  className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 font-medium"
                >
                  🗑️ Löschen
                </button>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">📧 E-Mail-Einstellungen für Sachbearbeiter</h5>
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              {/* Email List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Empfänger-Adressen</label>
                <div className="space-y-2">
                  {editing.emails.map((email: string, emailIdx: number) => (
                    <div key={emailIdx} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          const newEmails = [...editing.emails];
                          newEmails[emailIdx] = e.target.value;
                          setEditingSettings((prev: any) => ({
                            ...prev,
                            [employer.name]: { ...editing, emails: newEmails }
                          }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newEmails = editing.emails.filter((_: string, i: number) => i !== emailIdx);
                          setEditingSettings((prev: any) => ({
                            ...prev,
                            [employer.name]: { ...editing, emails: newEmails }
                          }));
                        }}
                        className="px-2 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50"
                      >
                        −
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newEmails = [...editing.emails, ''];
                      setEditingSettings((prev: any) => ({
                        ...prev,
                        [employer.name]: { ...editing, emails: newEmails }
                      }));
                    }}
                    className="w-full px-3 py-2 text-green-600 border border-green-300 rounded hover:bg-green-50 font-medium text-sm"
                  >
                    + Weitere E-Mail hinzufügen
                  </button>
                </div>
              </div>

              {/* Subject Prefix */}
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-1">Betreff-Präfix</label>
                <input
                  type="text"
                  value={editing.prefix}
                  onChange={(e) => {
                    setEditingSettings((prev: any) => ({
                      ...prev,
                      [employer.name]: { ...editing, prefix: e.target.value }
                    }));
                  }}
                  placeholder="z.B. [Krankmeldung]"
                  className="w-full px-3 py-2 border border-gray-300  rounded-md text-sm text-gray-900  bg-white  focus:ring-blue-500 focus:border-blue-500 "
                />
              </div>

              {/* Send to Global SB */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id={`send-global-${employer.id}`}
                  checked={editing.sendGlobalCopy || false}
                  onChange={(e) => {
                    setEditingSettings((prev: any) => ({
                      ...prev,
                      [employer.name]: { ...editing, sendGlobalCopy: e.target.checked }
                    }));
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor={`send-global-${employer.id}`} className="text-sm text-gray-700 cursor-pointer">
                  Kopie auch an globale SB-Adresse senden
                </label>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                <input
                  type="checkbox"
                  id={`requires-remarks-${employer.id}`}
                  checked={editing.requiresRemarks || false}
                  onChange={(e) => {
                    setEditingSettings((prev: any) => ({
                      ...prev,
                      [employer.name]: { ...editing, requiresRemarks: e.target.checked }
                    }));
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor={`requires-remarks-${employer.id}`} className="text-sm text-gray-700 cursor-pointer">
                  Freies Bemerkungsfeld im Formular anzeigen (optional)
                </label>
              </div>

              {/* Save Button */}
              <button
                onClick={() => {
                  saveEmployerSetting(
                    employer.name,
                    editing.emails,
                    editing.prefix,
                    editing.sendGlobalCopy,
                    editing.requiresRemarks
                  );
                }}
                disabled={savingId === employer.id}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {savingId === employer.id ? 'Speichert...' : '💾 Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
