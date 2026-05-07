'use client';

import { useState, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Search, Users, Mail, Phone, School, BookOpen,
  BarChart3, Calendar, MessageSquare,
  ClipboardCheck, Clock, Star, ArrowLeft,
  Loader2, Zap, Layers, AlertCircle,
  ChevronRight, X,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const CONVERSION_STATUSES = [
  'DNP',
  'CALL_LATER',
  'WRONG_NUMBER',
  'INTERESTED',
  'NOT_INTERESTED',
  'CONVERTED',
  'IRRELEVANT',
];

const CONVERSION_REASONS = [
  'EXPENSIVE',
  'CONTENT_QUALITY',
  'NOT_RIGHT_NOW',
  'NEED_MORE_TIME_TO_THINK',
  'NEED_MORE_FEATURES',
  'USING_OTHER_PLATFORM',
  'OTHERS',
];

const EMPTY_SELECT_SENTINEL = '__none__';

function formatJoinedDate(iso: string | Date | undefined | null) {
  if (iso == null) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatGenerationTimestamp(iso: string | Date) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function generationKindLabel(kind: string) {
  const map: Record<string, string> = {
    lesson: 'Lesson',
    quiz: 'Quiz',
    worksheet: 'Worksheet',
    question_paper: 'Question paper',
    presentation: 'Presentation',
  };
  return map[kind] || kind;
}

const diveCss = `
  @keyframes diveFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .dive-fade-in { animation: diveFadeIn 0.42s ease-out forwards; }
  .dive-shell {
    width:100%;
    max-width:1320px;
    margin:0 auto;
    min-height:72vh;
  }
  .dive-search-card {
    background:var(--card-bg);
    border:1px solid var(--card-border);
    border-radius:1rem;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(15,23,42,0.06);
  }
  .dive-sidebar-search-inner {
    padding:1rem 1.1rem 0.85rem;
  }
  .dive-input-wrap {
    position:relative;
    flex:1;
    min-width:0;
  }
  .dive-input-wrap svg {
    position:absolute;
    left:14px;
    top:50%;
    transform:translateY(-50%);
    color:var(--muted);
    pointer-events:none;
  }
  .dive-input-wrap input {
    width:100%;
    padding:0.8rem 1rem 0.8rem 2.65rem;
    border-radius:0.75rem;
    border:1px solid var(--card-border);
    background:#f8fafc;
    font-size:0.9rem;
    outline:none;
    transition:border-color .15s, background .15s;
  }
  .dive-input-wrap input:focus {
    border-color:var(--primary);
    background:var(--card-bg);
    box-shadow:0 0 0 3px rgba(37,99,235,0.12);
  }
  .dive-pill-row {
    display:flex;
    flex-wrap:wrap;
    gap:0.5rem;
    margin-top:0.875rem;
  }
  .dive-pill {
    display:inline-flex;
    align-items:center;
    gap:0.35rem;
    padding:0.35rem 0.65rem;
    border-radius:999px;
    font-size:0.72rem;
    font-weight:700;
    letter-spacing:0.02em;
    text-transform:uppercase;
    border:1px solid var(--card-border);
    background:#f8fafc;
    color:var(--foreground);
  }
  .dive-section-head {
    display:flex;
    align-items:flex-start;
    gap:0.65rem;
    margin-bottom:1.25rem;
    padding-bottom:1rem;
    border-bottom:1px solid var(--card-border);
  }
  .dive-scroll {
    max-height:400px;
    overflow-y:auto;
    padding-right:0.35rem;
  }
  .dive-layout {
    display:grid;
    grid-template-columns:1fr;
    gap:1.25rem;
    align-items:start;
  }
  @media (min-width: 920px) {
    .dive-layout {
      grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
      gap:1.5rem;
    }
  }
  .dive-sidebar-shell {
    position:sticky;
    top:1rem;
  }
  .dive-results-list {
    max-height:min(52vh, 440px);
    overflow-y:auto;
    border-radius:0 0 0.85rem 0.85rem;
    margin:0 -1px -1px -1px;
    border:1px solid var(--card-border);
    border-top:none;
    background:#fafafa;
  }
  .dive-result-row {
    width:100%;
    display:flex;
    align-items:center;
    gap:0.65rem;
    padding:0.65rem 0.75rem;
    border:none;
    border-bottom:1px solid #e8edf3;
    background:transparent;
    cursor:pointer;
    text-align:left;
    font:inherit;
    transition: background .12s ease;
  }
  .dive-result-row:last-child { border-bottom:none; }
  .dive-result-row:hover { background:#f1f5f9; }
  .dive-result-row:focus-visible {
    outline:2px solid var(--primary);
    outline-offset:-2px;
  }
  .dive-result-row--active {
    background:#eef2ff;
    border-left:3px solid var(--primary);
    padding-left:calc(0.75rem - 3px);
  }
  .dive-result-row--busy { opacity:0.65; pointer-events:none; }
  .dive-skel {
    border-radius:0.65rem;
    background:linear-gradient(90deg, #f1f5f9 25%, #e8eef4 40%, #f1f5f9 55%);
    background-size:200% 100%;
    animation:diveSkel 1.1s ease-in-out infinite;
  }
  @keyframes diveSkel {
    0% { background-position:100% 0; }
    100% { background-position:-100% 0; }
  }
`;

type UsageBreakdown = {
  worksheets: number;
  questionPapers: number;
  quizzes: number;
  lessons: number;
  presentations: number;
  total: number;
};

const emptyBreakdown: UsageBreakdown = {
  worksheets: 0,
  questionPapers: 0,
  quizzes: 0,
  lessons: 0,
  presentations: 0,
  total: 0,
};

export default function DeepDivePage() {
  const searchAbortRef = useRef<AbortController | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [openingInstructorId, setOpeningInstructorId] = useState<string | null>(null);
  const [diveResult, setDiveResult] = useState<any | null>(null);
  const [loadingDive, setLoadingDive] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [diveUsage, setDiveUsage] = useState<any | null>(null);
  const [loadingDiveUsage, setLoadingDiveUsage] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [expandSubjects, setExpandSubjects] = useState(false);
  /** Query that the current `searchResults` correspond to (set when you run Search / Enter). */
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');

  const runDirectorySearch = useCallback(async (raw: string) => {
    const q = raw.trim();
    searchAbortRef.current?.abort();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    const ac = new AbortController();
    searchAbortRef.current = ac;
    setLoadingSearch(true);
    setSearchError('');
    try {
      const res = await fetch(
        `/api/teachers?limit=30&search=${encodeURIComponent(q)}`,
        { signal: ac.signal }
      );
      const data = await res.json();
      if (data.success) setSearchResults(data.data || []);
      else setSearchError(data.error || 'Search failed');
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setSearchError('Unable to reach the server. Try again.');
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  const submitDirectorySearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const q = searchQuery.trim();
      if (q.length < 2) {
        setSearchError('Enter at least 2 characters, then press Search or Enter.');
        return;
      }
      setSearchError('');
      setLastSubmittedQuery(q);
      void runDirectorySearch(q);
    },
    [searchQuery, runDirectorySearch]
  );

  const clearDirectorySearch = useCallback(() => {
    searchAbortRef.current?.abort();
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setLastSubmittedQuery('');
  }, []);

  const handleSelectInstructor = async (instructor: any) => {
    setOpeningInstructorId(instructor.id);
    setLoadingDive(true);
    setDetailError('');
    setDiveResult(null);
    setDiveUsage(null);
    setExpandSubjects(false);

    try {
      const res = await fetch(`/api/teachers/dive?email=${encodeURIComponent(instructor.email)}`);
      const data = await res.json();
      if (data.success) {
        let status = '';
        let reason = '';
        let notes = '';

        if (data.data.conversionFeedback?.feedback) {
          const fb = data.data.conversionFeedback.feedback;
          if (fb.startsWith('{')) {
            try {
              const parsed = JSON.parse(fb);
              status = parsed.status || '';
              reason = parsed.reason || '';
              notes = parsed.notes || '';
            } catch {
              /* ignore */
            }
          } else {
            notes = fb;
          }
        }

        const fullResult = { ...data.data, status, reason, notes };
        setDiveResult(fullResult);

        if (data.data.teacher?.id) {
          fetchDiveUsage(data.data.teacher.id);
        }
      } else {
        setDetailError(data.error || 'Failed to retrieve deep dive analytics.');
      }
    } catch {
      setDetailError('Connection error while fetching instructor profile.');
    } finally {
      setOpeningInstructorId(null);
      setLoadingDive(false);
    }
  };

  const fetchDiveUsage = async (teacherId: string) => {
    setLoadingDiveUsage(true);
    try {
      const res = await fetch(`/api/subscriptions/usage?teacherId=${teacherId}`);
      const data = await res.json();
      if (data.success) setDiveUsage(data.data);
    } catch (error) {
      console.error('Usage fetch failed:', error);
    } finally {
      setLoadingDiveUsage(false);
    }
  };

  const updateDiveField = async (field: string, value: unknown, autoSave = false) => {
    if (!diveResult) return;
    const updated = { ...diveResult, [field]: value };
    setDiveResult(updated);
    if (autoSave) saveFeedbackToServer(updated);
  };

  const saveFeedbackToServer = async (result: any) => {
    if (!result.user?.id) return;
    setSavingFeedback(true);

    const feedbackStr = JSON.stringify({
      status: result.status || '',
      reason: result.reason || '',
      notes: result.notes || '',
    });

    try {
      const res = await fetch('/api/convertible/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: result.user.id, feedback: feedbackStr }),
      });
      const data = await res.json();
      if (data.success) {
        setDiveResult((prev: any) => ({
          ...prev,
          conversionFeedback: { ...(prev?.conversionFeedback || {}), feedback: feedbackStr },
        }));
      }
    } catch (err) {
      console.error('Feedback save failed:', err);
    } finally {
      setSavingFeedback(false);
    }
  };

  const isNotesDirty = () => {
    if (!diveResult) return false;
    let originalNotes = '';
    const fb = diveResult.conversionFeedback?.feedback;
    if (fb) {
      if (fb.startsWith('{')) {
        try {
          const parsed = JSON.parse(fb);
          originalNotes = parsed.notes || '';
        } catch {
          /* ignore */
        }
      } else {
        originalNotes = fb;
      }
    }
    return diveResult.notes !== originalNotes;
  };

  const clearProfile = () => {
    setDiveResult(null);
    setDiveUsage(null);
    setDetailError('');
    setOpeningInstructorId(null);
    setExpandSubjects(false);
  };

  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: diveCss }} />

      <div className="page-content dive-shell dive-fade-in">
        {/* Page intro */}
        <header className="page-header" style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h1 className="page-title" style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                Deep Dive <span style={{ color: 'var(--primary)' }}>Researcher</span>
              </h1>
              <p className="page-description" style={{ maxWidth: '36rem', marginTop: '0.4rem' }}>
                Search instructors, inspect engagement, conversion notes, feedback, and generation history in one layout.
              </p>
            </div>
          </div>
        </header>

        {/* Directory + detail */}
        <div className="dive-layout">
          <aside className="dive-sidebar-shell">
            <div className="dive-search-card">
              <div className="dive-sidebar-search-inner">
                <label
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    marginBottom: '0.55rem',
                  }}
                >
                  Instructor directory
                </label>
                <form
                  onSubmit={submitDirectorySearch}
                  style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <div className="dive-input-wrap" style={{ flex: 1, minWidth: 140 }}>
                    <Search size={18} aria-hidden />
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Name or email…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search by instructor name or email"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') clearDirectorySearch();
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingSearch || searchQuery.trim().length < 2}
                    className="btn btn-primary"
                    style={{
                      flexShrink: 0,
                      padding: '0.65rem 1rem',
                      borderRadius: '0.65rem',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      whiteSpace: 'nowrap',
                      opacity: loadingSearch || searchQuery.trim().length < 2 ? 0.55 : 1,
                    }}
                  >
                    {loadingSearch ? (
                      <>
                        <Loader2 size={15} className="animate-spin" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                        Search
                      </>
                    ) : (
                      'Search'
                    )}
                  </button>
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={clearDirectorySearch}
                      className="btn btn-secondary"
                      style={{
                        flexShrink: 0,
                        padding: '0.65rem',
                        borderRadius: '0.65rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Clear search"
                    >
                      <X size={18} />
                    </button>
                  ) : null}
                </form>
                <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.55rem', lineHeight: 1.45 }}>
                  The directory loads only when you press Search or Enter (min. 2 characters). Editing the field does not run a query.
                </p>

                {searchError ? (
                  <div
                    role="alert"
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.55rem 0.7rem',
                      borderRadius: '0.55rem',
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#991b1b',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      display: 'flex',
                      gap: '0.45rem',
                      alignItems: 'center',
                    }}
                  >
                    <AlertCircle size={16} aria-hidden /> {searchError}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.35rem 0.75rem',
                  borderTop: '1px solid var(--card-border)',
                  background: '#f8fafc',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--muted)',
                }}
              >
                <span>{loadingSearch ? 'Searching…' : 'Matches'}</span>
                {loadingSearch ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--primary)' }} aria-hidden /> : <span>{searchResults.length}</span>}
              </div>

              <div className="dive-results-list" role="listbox" aria-label="Search results">
                {!lastSubmittedQuery && !loadingSearch ? (
                  <div style={{ padding: '1.25rem 0.85rem', color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 500, textAlign: 'center' }}>
                    Enter a name or email, then Search or Enter. Nothing runs as you type.
                  </div>
                ) : loadingSearch && searchResults.length === 0 ? (
                  <div style={{ padding: '2rem 0.85rem', textAlign: 'center', color: 'var(--muted)' }}>
                    <Loader2 size={22} className="animate-spin" style={{ color: 'var(--primary)', display: 'block', margin: '0 auto 0.65rem' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Searching…</span>
                  </div>
                ) : !loadingSearch && lastSubmittedQuery && searchResults.length === 0 ? (
                  <div style={{ padding: '1.25rem 0.85rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>
                    No instructors matched <strong style={{ color: 'var(--foreground)' }}>“{lastSubmittedQuery}”</strong>. Try email or a shorter fragment.
                  </div>
                ) : (
                  searchResults.map((inst) => {
                    const active =
                      diveResult?.user?.email === inst.email || openingInstructorId === inst.id;
                    const busy = openingInstructorId === inst.id;
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`dive-result-row${active ? ' dive-result-row--active' : ''}${busy ? ' dive-result-row--busy' : ''}`}
                        onClick={() => void handleSelectInstructor(inst)}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: '#eef2ff',
                            color: 'var(--primary)',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {(inst.name || '?').charAt(0)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', lineHeight: 1.25 }}>{inst.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inst.email}
                            {inst.schoolName ? ` · ${inst.schoolName}` : ''}
                          </div>
                        </div>
                        <ChevronRight size={18} style={{ flexShrink: 0, opacity: 0.35 }} aria-hidden />
                      </button>
                    );
                  })
                )}
              </div>

              <div style={{ padding: '0.65rem 0.85rem', borderTop: '1px solid var(--card-border)', fontSize: '0.72rem', color: 'var(--muted)' }}>
                Showing up to 30 rows per query · refine to narrow results
              </div>
            </div>
          </aside>

          {/* Detail column */}
          <div style={{ minWidth: 0 }}>
            {loadingDive && !diveResult ? (
              <div className="card dive-fade-in" style={{ padding: '1.35rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <div className="dive-skel" style={{ width: 56, height: 56, borderRadius: 14 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dive-skel" style={{ height: 18, width: '55%', marginBottom: 10 }} />
                    <div className="dive-skel" style={{ height: 12, width: '82%' }} />
                  </div>
                </div>
                <div className="dive-skel" style={{ height: 220, width: '100%', marginBottom: '1rem' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div className="dive-skel" style={{ height: 100 }} />
                  <div className="dive-skel" style={{ height: 100 }} />
                </div>
                <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)' }} />
                  Loading profile, usage, and history…
                </p>
              </div>
            ) : null}

            {detailError && !loadingDive && !diveResult ? (
              <div
                role="alert"
                className="card"
                style={{
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#991b1b',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <AlertCircle size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 6 }}>Could not open this profile</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '1rem' }}>{detailError}</div>
                    <button type="button" onClick={clearProfile} className="btn btn-secondary" style={{ borderRadius: 10, fontWeight: 600 }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {!loadingDive && !diveResult && !detailError ? (
              <div
                className="card"
                style={{
                  padding: '2.25rem 1.5rem',
                  borderRadius: '1rem',
                  textAlign: 'center',
                  borderStyle: 'dashed',
                  color: 'var(--muted)',
                }}
              >
                <Users size={36} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--foreground)', marginBottom: 6 }}>Select an instructor</div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
                  Use the directory on the left. One click opens the full deep dive; you can keep searching without losing the list.
                </p>
              </div>
            ) : null}

            {diveResult && !loadingDive
              ? (() => {
          const ub: UsageBreakdown = diveResult.usageBreakdown ?? emptyBreakdown;
          const teacher = diveResult.teacher;
          const user = diveResult.user;
          const chartId = typeof user?.id === 'string' ? user.id.replace(/-/g, '').slice(0, 12) : 'usage';

          return (
            <div className="dive-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Top bar */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem 1rem',
                  paddingBottom: '0.35rem',
                }}
              >
                <button
                  type="button"
                  onClick={clearProfile}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.65rem',
                    border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={16} /> Clear detail
                </button>
                <div className="text-muted" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                  {user?.email}
                </div>
              </div>

              {!teacher && (
                <div
                  role="status"
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #fcd34d',
                    background: '#fffbeb',
                    color: '#92400e',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertCircle size={18} aria-hidden /> This account has no linked instructor profile yet. Subscription-only view.
                </div>
              )}

              {/* Row: identity + velocity */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                  gap: '1.25rem',
                }}
              >
                <section className="card" style={{ padding: '1.5rem', borderRadius: '1rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.1rem', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 16,
                        background: 'linear-gradient(142deg, #2563eb 0%, #7c3aed 100%)',
                        color: 'white',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 10px 30px rgba(37,99,235,0.25)',
                      }}
                    >
                      {user?.name?.charAt(0) ?? '?'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                        {user?.name ?? 'Unknown'}
                      </h2>
                      <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={14} /> {user?.email}
                        </span>
                        {teacher?.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={14} /> {teacher.phone}
                          </span>
                        ) : null}
                      </div>
                      <div className="dive-pill-row">
                        {formatJoinedDate(user?.createdAt) ? (
                          <span className="dive-pill">
                            <Calendar size={13} aria-hidden /> Account · {formatJoinedDate(user.createdAt)}
                          </span>
                        ) : null}
                        {teacher?.createdAt && formatJoinedDate(teacher.createdAt) ? (
                          <span className="dive-pill" style={{ background: '#f5f3ff', borderColor: '#ddd6fe' }}>
                            <Users size={13} aria-hidden /> Instructor · {formatJoinedDate(teacher.createdAt)}
                          </span>
                        ) : null}
                        <span
                          className="dive-pill"
                          style={{
                            background:
                              diveResult.subscription?.plan === 'max'
                                ? '#eff6ff'
                                : diveResult.subscription?.plan === 'pro'
                                  ? '#faf5ff'
                                  : '#f8fafc',
                          }}
                        >
                          Plan · {String(diveResult.subscription?.plan ?? 'free')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--card-border)',
                    }}
                  >
                    <div>
                      <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        School
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 4, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <School size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        {teacher?.schoolName ?? '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Grades
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 4, fontSize: '0.88rem', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <Zap size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                        {teacher?.grade ?? '—'}
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
                      <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Subjects
                      </div>
                      <button
                        type="button"
                        onClick={() => teacher?.subject?.length > 40 && setExpandSubjects(!expandSubjects)}
                        style={{
                          marginTop: 4,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          cursor: teacher?.subject?.length > 40 ? 'pointer' : 'default',
                          color: 'var(--foreground)',
                          display: 'inline-flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          width: '100%',
                        }}
                      >
                        <BookOpen size={15} style={{ color: '#10b981', flexShrink: 0, marginTop: 3 }} />
                        <span style={{ wordBreak: 'break-word' }}>
                          {expandSubjects || !teacher?.subject || teacher.subject.length <= 40
                            ? teacher?.subject ?? '—'
                            : `${teacher.subject.slice(0, 40)}…`}
                          {teacher?.subject?.length > 40 ? (
                            <span style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: 6 }}>
                              {expandSubjects ? 'Show less' : 'Show more'}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </div>
                  </div>
                </section>

                <section className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                  <div className="dive-section-head" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.5rem' }}>
                    <BarChart3 size={22} style={{ color: 'var(--primary)', marginTop: 2 }} />
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>30-day creation pace</h3>
                      <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>Artifacts created per day (rolling window).</p>
                    </div>
                  </div>

                  {!teacher ? (
                    <div
                      style={{
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--muted)',
                        borderRadius: 12,
                        background: '#f8fafc',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      No teacher profile · chart unavailable
                    </div>
                  ) : loadingDiveUsage ? (
                    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                      <Loader2 className="animate-spin" style={{ marginRight: 10 }} /> Loading chart…
                    </div>
                  ) : diveUsage?.chartData?.length ? (
                    <div style={{ height: 220, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={diveUsage.chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`dive-usage-fill-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: 'var(--muted)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(s) =>
                              new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            }
                            minTickGap={16}
                          />
                          <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={26} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid var(--card-border)', fontSize: 12 }}
                            labelFormatter={(l) =>
                              typeof l === 'string' ? new Date(l).toLocaleDateString() : ''
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#dive-usage-fill-${chartId})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ height: 200, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--muted)', fontSize: '0.875rem' }}>
                      No usage series for this period
                    </div>
                  )}
                </section>
              </div>

              {/* Sales + product feedback */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                  gap: '1.25rem',
                  alignItems: 'stretch',
                }}
              >
                <section className="card" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="dive-section-head">
                    <ClipboardCheck size={20} style={{ color: '#15803d', marginTop: 2 }} />
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Sales · conversion</h3>
                      <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>Synced to conversion feedback (same CRM as convertible leads).</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <label className="text-muted" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                          Stage
                        </label>
                        <select
                          value={diveResult.status ? diveResult.status : EMPTY_SELECT_SENTINEL}
                          onChange={(e) => {
                            const v = e.target.value === EMPTY_SELECT_SENTINEL ? '' : e.target.value;
                            const next =
                              !v.trim()
                                ? { ...diveResult, status: '', reason: '' }
                                : v === 'CONVERTED'
                                  ? { ...diveResult, status: v, reason: '' }
                                  : { ...diveResult, status: v };
                            setDiveResult(next);
                            saveFeedbackToServer(next);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            borderRadius: 10,
                            border: '1px solid var(--card-border)',
                            background: 'white',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                          }}
                        >
                          <option value={EMPTY_SELECT_SENTINEL}>Select status…</option>
                          {CONVERSION_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                      {diveResult.status && diveResult.status !== 'CONVERTED' ? (
                        <div>
                          <label className="text-muted" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                            Reason
                          </label>
                          <select
                            value={diveResult.reason ? diveResult.reason : EMPTY_SELECT_SENTINEL}
                            onChange={(e) => {
                              const v = e.target.value === EMPTY_SELECT_SENTINEL ? '' : e.target.value;
                              const next = { ...diveResult, reason: v };
                              setDiveResult(next);
                              if (next.status?.trim()) saveFeedbackToServer(next);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.65rem',
                              borderRadius: 10,
                              border: '1px solid var(--card-border)',
                              background: 'white',
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                            }}
                          >
                            <option value={EMPTY_SELECT_SENTINEL}>Select reason…</option>
                            {CONVERSION_REASONS.map((r) => (
                              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <label className="text-muted" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                        Notes
                      </label>
                      <textarea
                        value={diveResult.notes || ''}
                        onChange={(e) => updateDiveField('notes', e.target.value, false)}
                        placeholder="Calls, objections, next steps…"
                        style={{
                          width: '100%',
                          minHeight: 110,
                          padding: '0.75rem 0.85rem',
                          borderRadius: 10,
                          border: '1px solid var(--card-border)',
                          background: 'white',
                          fontSize: '0.875rem',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          lineHeight: 1.55,
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.65rem' }}>
                        {isNotesDirty() ? (
                          <button type="button" onClick={() => saveFeedbackToServer(diveResult)} disabled={savingFeedback} className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 700, padding: '0.55rem 1.1rem', fontSize: '0.8125rem' }}>
                            {savingFeedback ? 'Saving…' : 'Save notes'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="card" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="dive-section-head">
                    <MessageSquare size={20} style={{ color: 'var(--primary)', marginTop: 2 }} />
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Product feedback</h3>
                      <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>Ratings and comments from in-app prompts.</p>
                    </div>
                  </div>
                  <div className="dive-scroll" style={{ flex: 1 }}>
                    {(diveResult.allFeedbacks?.length ?? 0) === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: 12, border: '1px dashed var(--card-border)', fontWeight: 500, fontSize: '0.875rem' }}>
                        No submission history.
                      </div>
                    ) : (
                      diveResult.allFeedbacks.map((fb: any, idx: number) => (
                        <div key={fb?.id ?? idx} style={{ marginBottom: 10, padding: '1rem', borderRadius: 12, background: '#fafafa', border: '1px solid #e8edf3' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', gap: 3 }}>
                              {[0, 1, 2, 3, 4].map((i) => (
                                <Star
                                  key={`${fb?.id}-${i}`}
                                  size={12}
                                  fill={i < (fb.rating ?? 0) ? '#f59e0b' : 'none'}
                                  color={i < (fb.rating ?? 0) ? '#f59e0b' : '#cbd5e1'}
                                />
                              ))}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: '#eef2ff', padding: '2px 7px', borderRadius: 6 }}>
                                {(fb?.artifactType || fb?.promptKind || 'feedback') as string}
                              </span>
                              <span className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} />
                                {fb?.createdAt ? new Date(fb.createdAt).toLocaleDateString() : '—'}
                              </span>
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                            {(fb.message as string)?.trim()
                              ? fb.message
                              : 'Rating only'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              {/* Breakdown */}
              <section className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                <div className="dive-section-head">
                  <BarChart3 size={20} style={{ color: 'var(--primary)', marginTop: 2 }} />
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>All‑time artifact mix</h3>
                    <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>Lifetime counts · share of generated content.</p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))',
                    gap: '1rem',
                  }}
                >
                  {[
                    { label: 'Worksheets', value: ub.worksheets, color: 'var(--primary)' },
                    { label: 'Quizzes', value: ub.quizzes, color: '#8b5cf6' },
                    { label: 'Question papers', value: ub.questionPapers, color: '#0ea5e9' },
                    { label: 'Lessons', value: ub.lessons, color: 'var(--success)' },
                    { label: 'Presentations', value: ub.presentations, color: '#f59e0b' },
                  ].map((item) => {
                    const total = ub.total || 1;
                    const pct = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                      <div key={item.label} style={{ background: '#fafafa', padding: '1rem', borderRadius: 12, border: '1px solid #ebeff5' }}>
                        <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{item.value}</div>
                        <div style={{ marginTop: 10, height: 4, width: '100%', background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: item.color, transition: 'width .4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Generation log */}
              {teacher && Array.isArray(diveResult.generationHistory) ? (
                <section className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                  <div className="dive-section-head">
                    <Layers size={20} style={{ color: 'var(--primary)', marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Generation log</h3>
                      <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                        Newest activity first (≤ 300 rows). Lesson, quiz, worksheet, assessment, or deck.
                      </p>
                    </div>
                  </div>
                  <div className="dive-scroll" style={{ maxHeight: 380 }}>
                    {diveResult.generationHistory.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontWeight: 500 }}>Nothing generated yet.</div>
                    ) : (
                      diveResult.generationHistory.map((row: any) => {
                        const badgeColors: Record<string, { bg: string; fg: string }> = {
                          lesson: { bg: '#ecfdf5', fg: '#15803d' },
                          quiz: { bg: '#faf5ff', fg: '#6d28d9' },
                          worksheet: { bg: '#eef2ff', fg: '#4338ca' },
                          question_paper: { bg: '#e0f2fe', fg: '#0369a1' },
                          presentation: { bg: '#fffbeb', fg: '#b45309' },
                        };
                        const c = badgeColors[row.kind] || { bg: '#f1f5f9', fg: '#64748b' };
                        return (
                          <div key={`${row.kind}-${row.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '0.72rem 0.85rem', marginBottom: 8, borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.35, marginBottom: 6 }}>
                                {(row.title as string)?.trim() || 'Untitled'}
                              </div>
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em', background: c.bg, color: c.fg }}>
                                {(generationKindLabel(row.kind)).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.73rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} />
                              {formatGenerationTimestamp(row.createdAt)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          );
        })()
              : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
