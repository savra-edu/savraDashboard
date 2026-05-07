'use client';

import { useEffect, useState, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Zap, BarChart3, Calendar, Users, Filter,
  ChevronDown, ChevronUp, Phone, Mail, ArrowUpRight,
  ChevronLeft, ChevronRight, MessageSquare, ClipboardCheck,
  PhoneOff, Clock, PhoneMissed, ThumbsUp, ThumbsDown, CheckCircle, Trash2,
  School, BookOpen, Book, LayoutGrid, List,
  UserRound,
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

import type { AssignedToValue } from '@/lib/assigned-to';
import { ASSIGNED_TO_LABELS, ASSIGNED_TO_VALUES, parseAssignedTo } from '@/lib/assigned-to';

interface ConvertibleLead {
  id: string;
  teacherId: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  metrics: {
    distinctDays: number;
    totalArtifacts: number;
    worksheets: number;
    questionPapers: number;
    quizzes: number;
    lessons: number;
    presentations: number;
  };
  conversionScore: number;
  assignedTo: AssignedToValue;
  feedback: string;
  status?: string;
  reason?: string;
  notes?: string;
  schoolName: string;
  grade: string;
  subject: string;
}

const CONVERSION_STATUSES = [
  'DNP',
  'CALL_LATER',
  'WRONG_NUMBER',
  'INTERESTED',
  'NOT_INTERESTED',
  'CONVERTED',
  'IRRELEVANT'
];

const CONVERSION_REASONS = [
  'EXPENSIVE',
  'CONTENT_QUALITY',
  'NOT_RIGHT_NOW',
  'NEED_MORE_TIME_TO_THINK',
  'NEED_MORE_FEATURES',
  'USING_OTHER_PLATFORM',
  'OTHERS'
];

const UI_DENSITY_KEY = 'convertible-ui-density';

function readUiDensity(): 'comfortable' | 'compact' {
  if (typeof window === 'undefined') return 'comfortable';
  return window.localStorage.getItem(UI_DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable';
}

export default function ConvertibleLeadsPage() {
  const [leads, setLeads] = useState<ConvertibleLead[]>([]);
  const [loading, setLoading] = useState(true);

  // Individual usage states
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<Record<string, {
    breakdown: { worksheets: number; questionPapers: number; quizzes: number; lessons: number; presentations: number; total: number };
    chartData: Array<{ date: string; count: number }>;
  }>>({});
  const [loadingUsage, setLoadingUsage] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null);
  const [filterScore, setFilterScore] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('');
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>(readUiDensity);
  /** Compact layout: expanded Sales panel (notes, reason). */
  const [compactCrmOpenId, setCompactCrmOpenId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;
  const compact = uiDensity === 'compact';

  useEffect(() => {
    if (!compact) setCompactCrmOpenId(null);
  }, [compact]);

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_DENSITY_KEY, uiDensity);
    } catch {
      /* ignore */
    }
  }, [uiDensity]);

  const countLeadsNoStatus = () =>
    leads.filter((l) => !(l.status && String(l.status).trim())).length;
  const countLeadsWithStatus = (status: string) =>
    leads.filter((l) => (l.status || '') === status).length;
  const countLeadsWithAssignedTo = (assignee: AssignedToValue) =>
    leads.filter((l) => l.assignedTo === assignee).length;

  const filteredLeads = leads.filter((l) => {
    if (filterScore !== null && l.conversionScore < filterScore) return false;

    if (filterStatus === '_none') {
      if (l.status && String(l.status).trim()) return false;
    } else if (filterStatus) {
      if ((l.status || '') !== filterStatus) return false;
    }

    if (filterAssignedTo && l.assignedTo !== filterAssignedTo) return false;

    return true;
  });

  const listTotalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setListPage((p) => Math.min(p, listTotalPages));
  }, [listTotalPages]);

  const paginatedLeads = filteredLeads.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE);

  const updateLeadField = async (leadId: string, field: keyof ConvertibleLead, value: any, autoSave = false) => {
    setLeads(prev => {
      const updatedLeads = prev.map(l => {
        if (l.id !== leadId) return l;
        const updatedLead = { ...l, [field]: value };
        
        if (autoSave) {
          // Trigger save in the background
          saveFeedback(updatedLead);
        }
        
        return updatedLead;
      });
      return updatedLeads;
    });
  };

  const saveFeedback = async (lead: ConvertibleLead) => {
    setSavingFeedback(lead.id);
    const feedbackStr = JSON.stringify({
      status: lead.status || '',
      reason: lead.reason || '',
      notes: lead.notes || ''
    });

    try {
      const res = await fetch('/api/convertible/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: lead.id,
          feedback: feedbackStr,
          assignedTo: lead.assignedTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const assignedToSaved = parseAssignedTo(data.data?.assignedTo);
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, feedback: feedbackStr, assignedTo: assignedToSaved } : l
          )
        );
      }
    } catch (err) {
      console.error('Failed to save feedback:', err);
    } finally {
      setSavingFeedback(null);
    }
  };

  const isNotesDirty = (lead: ConvertibleLead) => {
    let originalNotes = lead.feedback || '';
    if (lead.feedback && lead.feedback.startsWith('{')) {
      try {
        const parsed = JSON.parse(lead.feedback);
        originalNotes = parsed.notes || '';
      } catch (e) {}
    }
    return lead.notes !== originalNotes;
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/convertible');
      const data = await res.json();
      if (data.success) {
        const parsedLeads = data.data.map((lead: any) => {
          let status = '';
          let reason = '';
          let notes = lead.feedback || '';
          
          if (lead.feedback && (lead.feedback.startsWith('{') || lead.feedback.startsWith('['))) {
            try {
              const parsed = JSON.parse(lead.feedback);
              if (parsed && typeof parsed === 'object') {
                status = parsed.status || '';
                reason = parsed.reason || '';
                notes = parsed.notes || '';
              }
            } catch (e) {
              // Not valid JSON, keep as notes
            }
          }
          
          return {
            ...lead,
            status,
            reason,
            notes,
            assignedTo: parseAssignedTo(lead.assignedTo),
          };
        });
        setLeads(parsedLeads);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUsage = async (lead: ConvertibleLead) => {
    if (expandedLeadId === lead.id) {
      setExpandedLeadId(null);
      return;
    }

    if (usageData[lead.id]) {
      setExpandedLeadId(lead.id);
      return;
    }

    setLoadingUsage(lead.id);
    setExpandedLeadId(lead.id);

    try {
      const res = await fetch(`/api/subscriptions/usage?teacherId=${lead.teacherId}`);
      const data = await res.json();
      if (data.success) {
        setUsageData(prev => ({ ...prev, [lead.id]: data.data }));
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
    } finally {
      setLoadingUsage(null);
    }
  };

  function scoreTone(score: number) {
    return score > 100
      ? { fg: '#15803d', bg: '#f0fdf4', border: '#15803d' }
      : score > 50
        ? { fg: 'var(--primary)', bg: '#eef2ff', border: 'var(--primary)' }
        : { fg: '#b45309', bg: '#fffbeb', border: '#b45309' };
  }

  /** Shared usage breakdown + chart (used by standard cards and compact rows). */
  function renderUsagePanel(lead: ConvertibleLead, opts?: { embed?: boolean }) {
    const embed = opts?.embed === true;
    if (expandedLeadId !== lead.id) return null;
    return (
      <div
        style={{
          marginTop: embed ? 0 : '0.5rem',
          background: '#f8fafc',
          padding: embed ? '1rem 1rem' : '1.5rem',
          borderRadius: embed ? '0.5rem' : '0.75rem',
          border: embed ? '1px solid #e2e8f0' : '1px solid var(--card-border)',
        }}
      >
        {loadingUsage === lead.id ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
            <div className="spinner" style={{ margin: '0 auto 0.5rem auto', width: '20px', height: '20px' }} />
            Fetching timeline metrics...
          </div>
        ) : usageData[lead.id] ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={16} style={{ color: 'var(--primary)' }} aria-hidden />
                All-time generation breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Worksheets', value: usageData[lead.id].breakdown.worksheets, color: 'var(--primary)' },
                  { label: 'Quizzes', value: usageData[lead.id].breakdown.quizzes, color: '#8b5cf6' },
                  { label: 'Question Papers', value: usageData[lead.id].breakdown.questionPapers, color: '#0ea5e9' },
                  { label: 'Lesson Plans', value: usageData[lead.id].breakdown.lessons, color: 'var(--success)' },
                  { label: 'Presentations', value: usageData[lead.id].breakdown.presentations, color: '#f59e0b' },
                ].map((item, i) => {
                  const total = usageData[lead.id].breakdown.total;
                  const pct = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 500 }}>{item.label}</span>
                        <span style={{ fontWeight: 600 }}>
                          {item.value} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: '3px', transition: 'width 0.5s ease-out' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: 'var(--primary)' }} aria-hidden />
                30-day activity
              </div>
              <div style={{ height: 160, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageData[lead.id].chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`colorUsage-${lead.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted)', fontSize: 10 }}
                      tickFormatter={(str) => {
                        const d = new Date(str);
                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                      minTickGap={20}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      content={(props: any) => {
                        const { active, payload } = props;
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background: 'white', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                              <div style={{ fontWeight: 600 }}>
                                {new Date(payload[0].payload.date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              <div style={{ color: 'var(--primary)' }}>{payload[0].value} Actions</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill={`url(#colorUsage-${lead.id})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>Timeline unavailable</div>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: compact ? '0.75rem' : undefined }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: compact ? 4 : undefined }}>Convertible Users</h1>
            <p className="page-description" style={{ ...(compact ? { fontSize: '0.8125rem', marginTop: 0 } : {}) }}>
              Identified free users exhibiting continuous feature usage signals suitable for target conversions.
            </p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', padding: compact ? '0.45rem 0.95rem' : '0.75rem 1.25rem', borderRadius: compact ? '0.65rem' : '1rem', display: 'flex', alignItems: 'center', gap: compact ? '0.5rem' : '0.75rem', border: '1px solid #7dd3fc' }}>
            <ArrowUpRight color="#0369a1" size={compact ? 18 : 24} />
            <span style={{ fontWeight: 700, color: '#0369a1', fontSize: compact ? '0.8125rem' : '1rem' }}>Target Leads</span>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: compact ? '0.55rem 0.85rem' : '1rem 1.5rem',
            marginBottom: compact ? '0.75rem' : '1.5rem',
            background: '#f8fafc',
            border: '1px solid var(--card-border)',
            borderRadius: '0.75rem',
            fontSize: compact ? '0.76rem' : '0.875rem',
            color: 'var(--muted)',
          }}
        >
          <strong style={{ color: 'var(--foreground)' }}>Scoring:</strong>{' '}
          {compact
            ? '>110 highly convertible · >80 primed · >40 growing adoption.'
            : <>
                Conversion scores identify continuous high engagement. Anything above{' '}
                <strong style={{ color: '#15803d' }}>110</strong> is highly convertible, above{' '}
                <strong style={{ color: 'var(--primary)' }}>80</strong> is primed for conversion, and above{' '}
                <strong style={{ color: '#b45309' }}>40</strong> shows growing adoption signals.
              </>}
        </div>

        {/* Filtering Options */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: compact ? '0.5rem 0.65rem' : '1rem', marginBottom: compact ? '0.75rem' : '1.5rem', background: 'white', padding: compact ? '0.55rem 0.85rem' : '1rem 1.5rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: compact ? '0.5rem 0.65rem' : '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: compact ? '0.75rem' : '0.875rem', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Score:</span>
              <select
                value={filterScore === null ? '' : filterScore}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterScore(val === '' ? null : Number(val));
                  setListPage(1);
                }}
                aria-label="Filter by conversion score"
                style={{
                  padding: compact ? '0.35rem 0.6rem' : '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--card-border)',
                  background: '#f8fafc',
                  fontSize: compact ? '0.75rem' : '0.875rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All scores</option>
                <option value="200">&ge; 200 ({leads.filter((l) => l.conversionScore >= 200).length})</option>
                <option value="100">&ge; 100 ({leads.filter((l) => l.conversionScore >= 100).length})</option>
                <option value="70">&ge; 70 ({leads.filter((l) => l.conversionScore >= 70).length})</option>
                <option value="50">&ge; 50 ({leads.filter((l) => l.conversionScore >= 50).length})</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={compact ? 14 : 16} className="text-muted" aria-hidden />
              <span style={{ fontSize: compact ? '0.75rem' : '0.875rem', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Call status:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setListPage(1);
                }}
                aria-label="Filter by call status"
                style={{
                  padding: compact ? '0.35rem 0.6rem' : '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--card-border)',
                  background: '#f8fafc',
                  fontSize: compact ? '0.75rem' : '0.875rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: 'min(260px, 85vw)',
                }}
              >
                <option value="">All statuses ({leads.length})</option>
                <option value="_none">No status ({countLeadsNoStatus()})</option>
                {CONVERSION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')} ({countLeadsWithStatus(s)})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserRound size={compact ? 14 : 16} className="text-muted" aria-hidden />
              <span style={{ fontSize: compact ? '0.75rem' : '0.875rem', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Assigned:</span>
              <select
                value={filterAssignedTo}
                onChange={(e) => {
                  setFilterAssignedTo(e.target.value);
                  setListPage(1);
                }}
                aria-label="Filter by assignee"
                style={{
                  padding: compact ? '0.35rem 0.6rem' : '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--card-border)',
                  background: '#f8fafc',
                  fontSize: compact ? '0.75rem' : '0.875rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: 'min(220px, 80vw)',
                }}
              >
                <option value="">Everyone ({leads.length})</option>
                {ASSIGNED_TO_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {ASSIGNED_TO_LABELS[v]} ({countLeadsWithAssignedTo(v)})
                  </option>
                ))}
              </select>
            </div>
            <div
              role="group"
              aria-label="Row density"
              style={{
                display: 'flex',
                border: '1px solid var(--card-border)',
                borderRadius: '0.45rem',
                overflow: 'hidden',
                alignSelf: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => setUiDensity('comfortable')}
                aria-pressed={!compact}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: compact ? '0.35rem 0.55rem' : '0.4rem 0.65rem',
                  border: 'none',
                  background: !compact ? 'var(--primary)' : '#f8fafc',
                  color: !compact ? 'white' : 'var(--foreground)',
                  fontSize: compact ? '0.7rem' : '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <LayoutGrid size={compact ? 12 : 14} aria-hidden />
                Standard
              </button>
              <button
                type="button"
                onClick={() => setUiDensity('compact')}
                aria-pressed={compact}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: compact ? '0.35rem 0.55rem' : '0.4rem 0.65rem',
                  border: 'none',
                  borderLeft: '1px solid var(--card-border)',
                  background: compact ? 'var(--primary)' : '#f8fafc',
                  color: compact ? 'white' : 'var(--foreground)',
                  fontSize: compact ? '0.7rem' : '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <List size={compact ? 12 : 14} aria-hidden />
                Compact
              </button>
            </div>
          </div>
          <div style={{ fontSize: compact ? '0.75rem' : '0.875rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            Showing <strong style={{ color: 'var(--foreground)' }}>{filteredLeads.length}</strong> leads
          </div>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ height: '60vh' }}>
            <div className="spinner"></div>
            <div className="text-muted font-medium">Scanning engagement signals...</div>
          </div>
        ) : leads.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <Zap size={48} style={{ color: 'var(--muted)', opacity: 0.2, margin: '0 auto 1.5rem auto' }} />
            <p className="text-muted">No high-probability leads identified in the past 14 days.</p>
          </div>
        ) : (
          <>
            {compact ? (
              <div className="card" style={{ padding: '14px 18px 18px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginLeft: 0, marginRight: 0 }}>
                  <div style={{ minWidth: 1188, paddingBottom: 4 }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(200px, 1.5fr) minmax(228px, 1.2fr) minmax(244px, 1.12fr) minmax(68px, max-content) minmax(164px, max-content)',
                        columnGap: '1.35rem',
                        rowGap: '0.65rem',
                        alignItems: 'start',
                        padding: '12px 18px',
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.055em',
                        color: 'var(--muted)',
                        borderBottom: '1px solid var(--card-border)',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ paddingTop: 3 }}>Lead</span>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          paddingTop: 2,
                          paddingRight: '1.25rem',
                          marginRight: '0.6rem',
                          borderRight: '1px solid rgba(148,163,184,0.38)',
                          boxShadow: '1px 0 0 rgba(255,255,255,0.9)',
                          minWidth: 0,
                        }}
                      >
                        <span>Usage · last 14 days</span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            letterSpacing: 0,
                            color: '#64748b',
                            lineHeight: 1.35,
                          }}
                        >
                          How often they logged in and how much they created in that window — same numbers as Standard view.
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2, paddingLeft: 2, minWidth: 0 }}>
                        <span>Outreach</span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            letterSpacing: 0,
                            color: '#64748b',
                            lineHeight: 1.35,
                          }}
                        >
                          Who owns the lead and where the call stands — updates save like Standard view.
                        </span>
                      </div>
                      <span style={{ paddingTop: 3, justifySelf: 'end', textAlign: 'right' }}>Score</span>
                      <span style={{ paddingTop: 3, justifySelf: 'end', textAlign: 'right' }}>Details</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {paginatedLeads.map((lead) => {
                        const st = scoreTone(lead.conversionScore);
                        return (
                          <Fragment key={lead.id}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  'minmax(200px, 1.5fr) minmax(228px, 1.2fr) minmax(244px, 1.12fr) minmax(68px, max-content) minmax(164px, max-content)',
                                columnGap: '1.35rem',
                                rowGap: '0.85rem',
                                padding: '14px 18px',
                                alignItems: 'start',
                                border: '1px solid #eef2f6',
                                borderRadius: '10px',
                                background: 'var(--card-bg)',
                                boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                              }}
                            >
                              <div style={{ minWidth: 0, display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    background: `hsl(${(lead.name.charCodeAt(0) * 13) % 360}, 70%, 90%)`,
                                    color: '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.825rem',
                                  }}
                                >
                                  {lead.name.charAt(0)}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.865rem', lineHeight: 1.25 }}>{lead.name}</span>
                                    {lead.status && (
                                      <span
                                        style={{
                                          fontSize: '0.58rem',
                                          fontWeight: 800,
                                          color: lead.status === 'CONVERTED' ? '#15803d' : '#64748b',
                                          background: lead.status === 'CONVERTED' ? '#f0fdf4' : '#f8fafc',
                                          padding: '0.12rem 0.38rem',
                                          borderRadius: '0.35rem',
                                          border: '1px solid currentColor',
                                          textTransform: 'uppercase',
                                        }}
                                      >
                                        {lead.status.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.695rem', color: 'var(--muted)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                      <Mail size={12} aria-hidden />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</span>
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <Phone size={12} aria-hidden />
                                      {lead.phone}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, color: 'var(--foreground)', fontWeight: 500 }}>
                                      <School size={12} className="text-muted" aria-hidden />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.schoolName}</span>
                                      <span className="text-muted" style={{ flexShrink: 0 }}>· Grade {lead.grade}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                style={{
                                  minWidth: 0,
                                  paddingRight: '1.25rem',
                                  marginRight: '0.6rem',
                                  borderRight: '1px solid rgba(148,163,184,0.28)',
                                  boxShadow: '1px 0 0 rgba(255,255,255,1)',
                                  alignSelf: 'stretch',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                                    <span className="text-muted" style={{ fontSize: '0.71rem', fontWeight: 600 }}>
                                      Days active
                                    </span>
                                    <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                                      {lead.metrics.distinctDays}
                                      <span className="text-muted" style={{ fontWeight: 500, fontSize: '0.72rem', marginLeft: 3 }}>
                                        / 14
                                      </span>
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                                    <span className="text-muted" style={{ fontSize: '0.71rem', fontWeight: 600 }}>
                                      Artifacts
                                    </span>
                                    <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                                      {lead.metrics.totalArtifacts}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.665rem',
                                    color: '#64748b',
                                    marginTop: 10,
                                    lineHeight: 1.45,
                                    paddingTop: 10,
                                    borderTop: '1px dashed #e2e8f0',
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: 'var(--muted)' }}>By type:</span>{' '}
                                  {lead.metrics.worksheets} worksheets · {lead.metrics.quizzes} quizzes · {lead.metrics.lessons} lessons ·{' '}
                                  {lead.metrics.questionPapers} papers · {lead.metrics.presentations} decks
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.subject}>
                                  <Book size={11} className="text-muted" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden />
                                  {lead.subject}
                                </div>
                              </div>
                              <div
                                style={{
                                  minWidth: 0,
                                  paddingLeft: '0.35rem',
                                  alignSelf: 'stretch',
                                }}
                              >
                              <div
                                style={{
                                  padding: '11px 11px 12px',
                                  borderRadius: 9,
                                  background: 'linear-gradient(180deg, #fafbfd 0%, #f4f6f9 100%)',
                                  border: '1px dashed #e2e8f0',
                                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                                  height: '100%',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                                  <div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 7,
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: 'var(--muted)',
                                      }}
                                    >
                                      <UserRound size={13} className="text-muted" aria-hidden />
                                      Assigned to
                                    </div>
                                    <select
                                      value={lead.assignedTo}
                                      onChange={(e) =>
                                        updateLeadField(lead.id, 'assignedTo', e.target.value as AssignedToValue, true)
                                      }
                                      aria-label={`Assign ${lead.name}`}
                                      style={{
                                        width: '100%',
                                        padding: '9px 10px',
                                        borderRadius: '0.45rem',
                                        border: '1px solid #e2e8f0',
                                        background: '#fff',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        color: 'var(--foreground)',
                                        boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.04)',
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {ASSIGNED_TO_VALUES.map((v) => (
                                        <option key={v} value={v}>
                                          {ASSIGNED_TO_LABELS[v]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div
                                    style={{
                                      paddingTop: 11,
                                      borderTop: '1px dashed #e2e8f0',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 7,
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: 'var(--muted)',
                                      }}
                                    >
                                      <Phone size={13} className="text-muted" aria-hidden />
                                      Call status
                                    </div>
                                    <select
                                      value={lead.status}
                                      onChange={(e) => updateLeadField(lead.id, 'status', e.target.value, true)}
                                      aria-label={`Call status for ${lead.name}`}
                                      style={{
                                        width: '100%',
                                        padding: '9px 10px',
                                        borderRadius: '0.45rem',
                                        border: '1px solid #e2e8f0',
                                        background: '#fff',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        color: lead.status ? 'var(--foreground)' : '#94a3b8',
                                        boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.04)',
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      <option value="">Select status…</option>
                                      {CONVERSION_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                          {status.replace(/_/g, ' ')}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                              </div>
                              <div style={{ textAlign: 'right', alignSelf: 'center', justifySelf: 'end', minWidth: 0 }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    color: st.fg,
                                    background: st.bg,
                                    border: `1px solid ${st.border}`,
                                    padding: '0.16rem 0.45rem',
                                    borderRadius: '0.4rem',
                                    lineHeight: 1.15,
                                  }}
                                >
                                  {lead.conversionScore}
                                </span>
                              </div>
                              <div
                                style={{
                                  justifySelf: 'end',
                                  alignSelf: 'stretch',
                                  minWidth: 0,
                                  paddingLeft: '0.85rem',
                                  marginLeft: '0.35rem',
                                  borderLeft: '1px solid rgba(148,163,184,0.22)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    width: '100%',
                                    padding: '9px 10px 11px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(226,232,240,0.95)',
                                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                                    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                                  }}
                                >
                                  <span
                                    className="text-muted"
                                    style={{
                                      fontSize: '0.58rem',
                                      fontWeight: 800,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.065em',
                                      textAlign: 'right',
                                      lineHeight: 1.35,
                                      marginBottom: 1,
                                      borderBottom: '1px solid rgba(226,232,240,0.75)',
                                      paddingBottom: 7,
                                    }}
                                  >
                                    Sales · usage detail
                                  </span>
                                  <button
                                  type="button"
                                  className="action-btn"
                                  aria-expanded={compactCrmOpenId === lead.id}
                                  aria-label={
                                    compactCrmOpenId === lead.id ? 'Hide Sales notes for this lead' : 'Open Sales notes & deal detail'
                                  }
                                  onClick={() => setCompactCrmOpenId((id) => (id === lead.id ? null : lead.id))}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: 7,
                                    width: '100%',
                                    padding: '0.52rem 0.72rem',
                                    borderRadius: '0.48rem',
                                    border: compactCrmOpenId === lead.id ? '1px solid #818cf8' : '1px solid var(--card-border)',
                                    background: compactCrmOpenId === lead.id ? 'linear-gradient(180deg,#eef2ff 0%,#e0e7ff 100%)' : '#fff',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    color: '#312e81',
                                    boxShadow: compactCrmOpenId === lead.id ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'inset 0 1px 2px rgba(15,23,42,0.04)',
                                  }}
                                >
                                  <MessageSquare size={15} aria-hidden />
                                  Sales
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  aria-label={
                                    expandedLeadId === lead.id ? 'Collapse product usage breakdown' : 'Open product usage & charts'
                                  }
                                  onClick={() => toggleUsage(lead)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: 7,
                                    width: '100%',
                                    padding: '0.52rem 0.72rem',
                                    borderRadius: '0.48rem',
                                    border:
                                      expandedLeadId === lead.id ? '1px solid #86efac' : '1px solid var(--card-border)',
                                    background:
                                      expandedLeadId === lead.id
                                        ? 'linear-gradient(180deg,#ecfdf5 0%,#d1fae5 100%)'
                                        : '#fff',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    color: '#14532d',
                                    boxShadow:
                                      expandedLeadId === lead.id
                                        ? 'inset 0 1px 0 rgba(255,255,255,0.5)'
                                        : 'inset 0 1px 2px rgba(15,23,42,0.04)',
                                  }}
                                >
                                  {expandedLeadId === lead.id ? <ChevronUp size={15} aria-hidden /> : <BarChart3 size={15} aria-hidden />}
                                  Usage
                                </button>
                              </div>
                              </div>
                            </div>
                            {compactCrmOpenId === lead.id && (
                              <div
                                style={{
                                  padding: '14px 14px 16px',
                                  marginTop: 8,
                                  background: '#fafafa',
                                  border: '1px solid #eef2f6',
                                  borderRadius: 10,
                                }}
                              >
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <ClipboardCheck size={14} style={{ color: 'var(--primary)' }} aria-hidden />
                                  Sales — notes & outcome
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.55rem' }}>
                                  {lead.status && lead.status !== 'CONVERTED' && (
                                    <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                                      <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>REASON</label>
                                      <select
                                        value={lead.reason}
                                        onChange={(e) => updateLeadField(lead.id, 'reason', e.target.value, true)}
                                        style={{
                                          width: '100%',
                                          padding: '0.4rem',
                                          borderRadius: '0.4rem',
                                          border: '1px solid var(--card-border)',
                                          background: 'white',
                                          fontSize: '0.8rem',
                                        }}
                                      >
                                        <option value="">Select reason</option>
                                        {CONVERSION_REASONS.map((reason) => (
                                          <option key={reason} value={reason}>
                                            {reason.replace(/_/g, ' ')}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                  <div style={{ flex: '1 1 280px', minWidth: 200 }}>
                                    <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>NOTES & FEEDBACK</label>
                                    <textarea
                                      value={lead.notes}
                                      onChange={(e) => updateLeadField(lead.id, 'notes', e.target.value)}
                                      placeholder="Call details, follow-up…"
                                      rows={3}
                                      style={{
                                        width: '100%',
                                        minHeight: 72,
                                        padding: '0.5rem',
                                        borderRadius: '0.4rem',
                                        border: '1px solid var(--card-border)',
                                        background: 'white',
                                        fontSize: '0.8rem',
                                        fontFamily: 'inherit',
                                        resize: 'vertical',
                                      }}
                                    />
                                  </div>
                                  {isNotesDirty(lead) && (
                                    <button
                                      type="button"
                                      onClick={() => saveFeedback(lead)}
                                      disabled={savingFeedback === lead.id}
                                      style={{
                                        padding: '0.5rem 0.95rem',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.4rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        alignSelf: 'flex-end',
                                        opacity: savingFeedback === lead.id ? 0.7 : 1,
                                      }}
                                    >
                                      {savingFeedback === lead.id ? 'Saving...' : 'Save notes'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                            {renderUsagePanel(lead, { embed: true })}
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {paginatedLeads.map((lead) => (
                  <div key={lead.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Lead Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: `hsl(${(lead.name.charCodeAt(0) * 13) % 360}, 70%, 90%)`,
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '1.25rem',
                          }}
                        >
                          {lead.name.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.2 }}>{lead.name}</h3>
                            {lead.status && (
                              <div
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  color: lead.status === 'CONVERTED' ? '#15803d' : '#64748b',
                                  background: lead.status === 'CONVERTED' ? '#f0fdf4' : '#f8fafc',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '0.375rem',
                                  border: '1px solid currentColor',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.025em',
                                }}
                              >
                                {lead.status.replace(/_/g, ' ')}
                              </div>
                            )}
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: lead.assignedTo === 'NONE' ? '#64748b' : '#3730a3',
                                background: lead.assignedTo === 'NONE' ? '#f1f5f9' : '#e0e7ff',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '0.375rem',
                                border: `1px solid ${lead.assignedTo === 'NONE' ? '#e2e8f0' : '#c7d2fe'}`,
                                textTransform: 'none',
                              }}
                              title="Who owns outreach for this lead"
                            >
                              <UserRound size={14} aria-hidden />
                              <span>{ASSIGNED_TO_LABELS[lead.assignedTo]}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--muted)', minWidth: 0 }}>
                              <Mail size={14} aria-hidden /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.email}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                              <Phone size={14} aria-hidden /> {lead.phone}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: '1rem',
                              marginTop: '0.4rem',
                              flexWrap: 'wrap',
                              borderTop: '1px dashed #e2e8f0',
                              paddingTop: '0.4rem',
                              fontSize: '0.8rem',
                              color: 'var(--foreground)',
                              fontWeight: 500,
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                              <School size={14} className="text-muted" aria-hidden />{' '}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.schoolName}</span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <BookOpen size={14} className="text-muted" aria-hidden /> Grade {lead.grade}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0, flex: '1 1 180px' }}>
                              <Book size={14} className="text-muted" aria-hidden />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.subject}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Conversion Score</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: lead.conversionScore > 100 ? '#15803d' : lead.conversionScore > 50 ? 'var(--primary)' : '#b45309', background: lead.conversionScore > 100 ? '#f0fdf4' : lead.conversionScore > 50 ? '#eef2ff' : '#fffbeb', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', border: '1px solid currentColor', display: 'inline-block', lineHeight: 1 }}>
                          {lead.conversionScore}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '-0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} aria-hidden /> Usage metrics across the last 14 days:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Days active in the last 14d</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{lead.metrics.distinctDays}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Total Artifacts</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{lead.metrics.totalArtifacts}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Worksheets</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{lead.metrics.worksheets}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Lessons</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{lead.metrics.lessons}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Quizzes</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{lead.metrics.quizzes}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Question Papers</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{lead.metrics.questionPapers}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Presentations</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{lead.metrics.presentations}</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MessageSquare size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} aria-hidden />
                        Conversion Feedback & Sales Call Notes
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1', minWidth: '170px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem' }}>ASSIGNED TO</label>
                            <select
                              value={lead.assignedTo}
                              onChange={(e) =>
                                updateLeadField(lead.id, 'assignedTo', e.target.value as AssignedToValue, true)
                              }
                              aria-label={`Assign ${lead.name}`}
                              style={{
                                width: '100%',
                                padding: '0.6rem',
                                borderRadius: '0.45rem',
                                border: '1px solid var(--card-border)',
                                background: 'white',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {ASSIGNED_TO_VALUES.map((v) => (
                                <option key={v} value={v}>
                                  {ASSIGNED_TO_LABELS[v]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={{ flex: '1', minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem' }}>CALL STATUS</label>
                            <select
                              value={lead.status}
                              onChange={(e) => updateLeadField(lead.id, 'status', e.target.value, true)}
                              style={{
                                width: '100%',
                                padding: '0.6rem',
                                borderRadius: '0.45rem',
                                border: '1px solid var(--card-border)',
                                background: 'white',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">Select Status</option>
                              {CONVERSION_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                          </div>

                          {lead.status && lead.status !== 'CONVERTED' && (
                            <div style={{ flex: '1', minWidth: '200px' }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem' }}>REASON</label>
                              <select
                                value={lead.reason}
                                onChange={(e) => updateLeadField(lead.id, 'reason', e.target.value, true)}
                                style={{
                                  width: '100%',
                                  padding: '0.6rem',
                                  borderRadius: '0.45rem',
                                  border: '1px solid var(--card-border)',
                                  background: 'white',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  outline: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="">Select Reason</option>
                                {CONVERSION_REASONS.map((reason) => (
                                  <option key={reason} value={reason}>
                                    {reason.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem' }}>NOTES & FEEDBACK</label>
                            <textarea
                              value={lead.notes}
                              onChange={(e) => updateLeadField(lead.id, 'notes', e.target.value)}
                              placeholder="Call details, pain points, follow-up…"
                              style={{
                                width: '100%',
                                minHeight: 100,
                                padding: '0.75rem',
                                borderRadius: '0.45rem',
                                border: '1px solid var(--card-border)',
                                background: 'white',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                outline: 'none',
                                lineHeight: 1.45,
                              }}
                            />
                          </div>
                          {isNotesDirty(lead) && (
                            <div style={{ alignSelf: 'flex-end', marginBottom: '4px' }}>
                              <button
                                type="button"
                                onClick={() => saveFeedback(lead)}
                                disabled={savingFeedback === lead.id}
                                style={{
                                  padding: '0.75rem 1.25rem',
                                  background: 'var(--primary)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.45rem',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  opacity: savingFeedback === lead.id ? 0.7 : 1,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                }}
                              >
                                {savingFeedback === lead.id ? 'Saving...' : 'Save Notes'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => toggleUsage(lead)}
                        style={{
                          padding: '0.5rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'white',
                          border: '1px solid var(--card-border)',
                          borderRadius: '0.45rem',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'var(--foreground)',
                        }}
                      >
                        {expandedLeadId === lead.id ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                        {expandedLeadId === lead.id ? 'Collapse usage' : 'Analyze Detailed Usage'}
                      </button>
                    </div>

                    {renderUsagePanel(lead)}
                  </div>
                ))}
              </div>
            )}

            {filteredLeads.length > ITEMS_PER_PAGE && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: compact ? '0.5rem 0.85rem' : '1rem 1.5rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)', marginTop: compact ? '0.5rem' : '1.5rem' }}>
                <button 
                  className="action-btn" 
                  disabled={listPage === 1} 
                  onClick={() => setListPage(p => Math.max(1, p - 1))}
                  style={{ opacity: listPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--card-border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div className="page-info" style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>
                  Page {listPage} of {listTotalPages}
                </div>
                <button 
                  className="action-btn" 
                  disabled={listPage >= listTotalPages} 
                  onClick={() => setListPage(p => Math.min(listTotalPages, p + 1))}
                  style={{ opacity: listPage >= listTotalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--card-border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
