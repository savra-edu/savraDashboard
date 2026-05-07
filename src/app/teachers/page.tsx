'use client';

import { useEffect, useState, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Users, FileText, ChevronLeft, ChevronRight, X, ArrowUpDown,
  ChevronDown, ChevronUp, BarChart3, Calendar,
  MessageSquare, GraduationCap, BookOpen,
  Filter,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface Teacher {
  id: string;
  userId: string;
  name: string;
  email: string;
  schoolName: string;
  createdAt: string;
  callingStatus: string;
  callingReason: string;
  callingNotes: string;
  subjects?: string;
  artifactCounts: {
    lessons: number;
    quizzes: number;
    assessments: number;
    total: number;
  };
}

const CONVERSION_STATUSES = [
  'DNP', 'CALL_LATER', 'WRONG_NUMBER', 'INTERESTED', 'NOT_INTERESTED', 'CONVERTED', 'IRRELEVANT'
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

/** Lets users pick "no selection" reliably in controlled selects (browser quirk with `value=""`). */
const EMPTY_SELECT_SENTINEL = '__none__';

/** Comma-separated values from API; empty, "—", and "N/A" mean no items. */
function parseTeacherListField(value: unknown): string[] {
  const s = value != null ? String(value).trim() : '';
  if (!s || s === '—' || /^n\/a$/i.test(s)) return [];
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : [s];
}


export default function TeachersDirectory() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortValue, setSortValue] = useState('joined_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [callingStatusFilter, setCallingStatusFilter] = useState('');

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherArtifacts, setTeacherArtifacts] = useState<any[]>([]);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  // Individual usage states
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<Record<string, {
    breakdown: { worksheets: number; questionPapers: number; quizzes: number; lessons: number; presentations: number; total: number };
    chartData: Array<{ date: string; count: number }>;
  }>>({});
  const [loadingUsage, setLoadingUsage] = useState<string | null>(null);
  const [expandedSalesId, setExpandedSalesId] = useState<string | null>(null);
  const [salesFormData, setSalesFormData] = useState<Record<string, { status: string; reason: string; notes: string }>>({});
  const [savingSales, setSavingSales] = useState<string | null>(null);
  const [expandedGradeId, setExpandedGradeId] = useState<string | null>(null);

  const toggleGradeExpand = (teacher: { id: string }) => {
    if (expandedGradeId === teacher.id) {
      setExpandedGradeId(null);
      return;
    }
    setExpandedTeacherId(null);
    setExpandedSalesId(null);
    setExpandedGradeId(teacher.id);
  };

  const openSalesForm = (teacher: Teacher) => {
    if (expandedSalesId === teacher.id) {
      setExpandedSalesId(null);
      return;
    }
    setExpandedTeacherId(null);
    setExpandedGradeId(null);
    setSalesFormData(prev => ({
      ...prev,
      [teacher.id]: {
        status: teacher.callingStatus || '',
        reason: teacher.callingReason || '',
        notes: teacher.callingNotes || ''
      }
    }));
    setExpandedSalesId(teacher.id);
  };

  const saveSalesFeedback = async (teacher: Teacher, fields: { status: string; reason: string; notes: string }) => {
    setSavingSales(teacher.id);
    const feedbackStr = JSON.stringify({
      status: fields.status,
      reason: fields.reason,
      notes: fields.notes
    });
    try {
      const res = await fetch('/api/convertible/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: teacher.userId, feedback: feedbackStr }),
      });
      const data = await res.json();
      if (data.success) {
        setTeachers(prev =>
          prev.map(t =>
            t.id === teacher.id
              ? { ...t, callingStatus: fields.status, callingReason: fields.reason, callingNotes: fields.notes }
              : t
          )
        );
      }
    } catch (err) {
      console.error('Failed to save sales feedback:', err);
    } finally {
      setSavingSales(null);
    }
  };

  const updateSalesField = (teacher: Teacher, field: 'status' | 'reason' | 'notes', value: string, autoSave = false) => {
    setSalesFormData(prev => {
      const cur = prev[teacher.id] || {
        status: teacher.callingStatus || '',
        reason: teacher.callingReason || '',
        notes: teacher.callingNotes || ''
      };
      let next = { ...cur, [field]: value };
      if (field === 'status') {
        if (!value.trim()) {
          next = { ...next, reason: '', status: '' };
        } else if (value === 'CONVERTED') {
          next = { ...next, reason: '' };
        }
      }
      if (autoSave) {
        if (field === 'status') {
          saveSalesFeedback(teacher, next);
        } else if (field === 'reason' && next.status.trim()) {
          saveSalesFeedback(teacher, next);
        }
      }
      return { ...prev, [teacher.id]: next };
    });
  };

  const saveSalesNotesOnly = (teacher: Teacher) => {
    const form = salesFormData[teacher.id];
    if (!form) return;
    saveSalesFeedback(teacher, form);
  };

  const isSalesNotesDirty = (teacher: Teacher) => {
    const form = salesFormData[teacher.id];
    if (!form) return false;
    return form.notes !== (teacher.callingNotes || '');
  };

  const fetchUsageData = async (teacherId: string) => {
    if (expandedTeacherId === teacherId) {
      setExpandedTeacherId(null);
      return;
    }

    setExpandedSalesId(null);
    setExpandedGradeId(null);

    if (usageData[teacherId]) {
      setExpandedTeacherId(teacherId);
      return;
    }

    setLoadingUsage(teacherId);
    setExpandedTeacherId(teacherId);
    try {
      const res = await fetch(`/api/subscriptions/usage?teacherId=${teacherId}`);
      const data = await res.json();
      if (data.success) {
        setUsageData(prev => ({ ...prev, [teacherId]: data.data }));
      }
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
    } finally {
      setLoadingUsage(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchTeachers(page, sortValue, debouncedSearch, selectedDate, callingStatusFilter);
  }, [page, sortValue, debouncedSearch, selectedDate, callingStatusFilter]);

  const fetchTeachers = async (
    pageNum: number,
    sortMode: string,
    search: string,
    date: string,
    callingStatus: string
  ) => {
    setLoading(true);
    try {
      const statusQ =
        callingStatus && callingStatus !== '' ? `&callingStatus=${encodeURIComponent(callingStatus)}` : '';
      const res = await fetch(
        `/api/teachers?page=${pageNum}&sort=${sortMode}&search=${encodeURIComponent(search)}&date=${date}${statusQ}`
      );
      const data = await res.json();
      if (data.success) {
        setTeachers(data.data);
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showArtifacts = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setLoadingArtifacts(true);
    setTeacherArtifacts([]);
    try {
      const res = await fetch(`/api/teachers/${teacher.id}/artifacts`);
      const data = await res.json();
      if (data.success) setTeacherArtifacts(data.data.artifacts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingArtifacts(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">Instructor Directory</h1>
            <p className="page-description">Global overview of all registered teachers and their platform artifacts.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Users style={{ position: 'absolute', left: '12px', top: '10px', width: '16px', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search by instructor name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem',
                  borderRadius: '0.75rem', border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)', fontSize: '0.875rem', outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
              <Filter size={16} className="text-muted" aria-hidden />
              <select
                value={callingStatusFilter}
                onChange={(e) => {
                  setCallingStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by call status"
                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--foreground)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}
              >
                <option value="">All call statuses</option>
                <option value="_none">No status</option>
                {CONVERSION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
              <Calendar size={16} className="text-muted" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--foreground)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
              <ArrowUpDown size={16} className="text-muted" />
              <select
                value={sortValue}
                onChange={(e) => {
                  setSortValue(e.target.value);
                  setPage(1); // Reset page on sort branch shift
                }}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--foreground)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}
              >
                <option value="joined_desc">Newest First</option>
                <option value="joined_asc">Oldest First</option>
                <option value="artifacts_desc">Most Artifacts Generated</option>
                <option value="artifacts_asc">Least Artifacts Generated</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading records...</div>
            ) : teachers.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>No records found.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Teacher</th>
                    <th>Phone</th>
                    <th>School</th>
                    <th>Status</th>
                    <th style={{ width: '4.75rem', maxWidth: '5.25rem' }}>Grade</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher: any, index: number) => (
                    <Fragment key={teacher.id}>
                      <tr>
                        <td style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600 }}>
                          {(page - 1) * 20 + index + 1}
                        </td>
                        <td>
                          <div className="teacher-info">
                            <div className="avatar" style={{ background: `hsl(${(teacher.name.charCodeAt(0) * 13) % 360}, 70%, 90%)`, color: '#0f172a' }}>
                              {teacher.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{teacher.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.8rem' }}>{teacher.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted">{teacher.phoneNumber || '—'}</td>
                        <td>{teacher.schoolName}</td>
                        <td>
                          {teacher.callingStatus ? (
                            <div style={{
                              fontSize: '0.7rem', fontWeight: 800,
                              color: teacher.callingStatus === 'CONVERTED' ? '#15803d' : '#64748b',
                              background: teacher.callingStatus === 'CONVERTED' ? '#f0fdf4' : '#f8fafc',
                              padding: '0.2rem 0.5rem', borderRadius: '0.375rem', border: '1px solid currentColor',
                              textTransform: 'uppercase', letterSpacing: '0.025em', display: 'inline-block'
                            }}>
                              {teacher.callingStatus.replace(/_/g, ' ')}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>No Status</span>
                          )}
                        </td>
                        <td style={{ maxWidth: '5.25rem', width: '4.75rem', paddingLeft: '0.35rem', paddingRight: '0.35rem', verticalAlign: 'middle' }}>
                          {(() => {
                            const gradeItems = parseTeacherListField(teacher.grade);
                            const subjectItems = parseTeacherListField(teacher.subjects);
                            const canExpandTeaching = gradeItems.length > 0 || subjectItems.length > 0;
                            const compactLabel =
                              gradeItems.length > 0
                                ? teacher.grade
                                : subjectItems.length > 0
                                  ? 'Subjects'
                                  : '—';
                            if (!canExpandTeaching) {
                              return (
                                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>—</span>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => toggleGradeExpand(teacher)}
                                className="action-btn"
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.2rem',
                                  minWidth: 0,
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  padding: '0.2rem 0.35rem',
                                  borderColor: expandedGradeId === teacher.id ? 'var(--primary)' : 'var(--card-border)',
                                  background: '#f8fafc',
                                  color: 'var(--foreground)',
                                }}
                              >
                                <span
                                  style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                    minWidth: 0,
                                    textAlign: 'left',
                                    lineHeight: 1.25,
                                  }}
                                >
                                  {compactLabel}
                                </span>
                                {expandedGradeId === teacher.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            );
                          })()}
                        </td>
                        <td>{new Date(teacher.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{teacher.lastActiveAt ? new Date(teacher.lastActiveAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Never'}</span>
                            {teacher.lastActiveAt && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                                {Math.floor((new Date().getTime() - new Date(teacher.lastActiveAt).getTime()) / (1000 * 3600 * 24))}d ago
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => fetchUsageData(teacher.id)}
                              className="action-btn"
                              style={{
                                borderColor: expandedTeacherId === teacher.id ? 'var(--primary)' : 'var(--card-border)',
                                fontSize: '0.75rem',
                                padding: '0.375rem 0.5rem'
                              }}
                            >
                              {loadingUsage === teacher.id ? 'Loading...' : 'Usage'}
                              {expandedTeacherId === teacher.id ? <ChevronUp size={14} style={{ marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
                            </button>

                            <button
                              onClick={() => openSalesForm(teacher)}
                              className="action-btn"
                              style={{
                                borderColor: expandedSalesId === teacher.id ? 'var(--primary)' : 'var(--card-border)',
                                fontSize: '0.75rem',
                                padding: '0.375rem 0.5rem',
                                background: teacher.callingStatus === 'CONVERTED' ? '#f0fdf4' : teacher.callingStatus ? '#f8fafc' : 'white'
                              }}
                            >
                              Sales
                              {expandedSalesId === teacher.id ? <ChevronUp size={14} style={{ marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedGradeId === teacher.id && (
                        <tr>
                          <td colSpan={9} style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--foreground)' }}>
                                  <GraduationCap size={16} style={{ color: 'var(--primary)' }} />
                                  Grades & subjects — {teacher.name}
                                </div>
                                <button
                                  type="button"
                                  className="action-btn"
                                  onClick={() => setExpandedGradeId(null)}
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                                >
                                  Close
                                </button>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  Grades
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {parseTeacherListField(teacher.grade).length === 0 ? (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>None on file</span>
                                  ) : (
                                    parseTeacherListField(teacher.grade).map((g, gi) => (
                                      <span
                                        key={`${g}-${gi}`}
                                        className="badge"
                                        style={{
                                          background: 'white',
                                          border: '1px solid var(--card-border)',
                                          color: 'var(--foreground)',
                                          fontSize: '0.8rem',
                                          fontWeight: 600,
                                          padding: '0.35rem 0.65rem',
                                        }}
                                      >
                                        {g}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  <BookOpen size={12} aria-hidden />
                                  Subjects
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {parseTeacherListField(teacher.subjects).length === 0 ? (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>None on file</span>
                                  ) : (
                                    parseTeacherListField(teacher.subjects).map((s, si) => (
                                      <span
                                        key={`${s}-${si}`}
                                        className="badge"
                                        style={{
                                          background: 'white',
                                          border: '1px solid var(--card-border)',
                                          color: 'var(--foreground)',
                                          fontSize: '0.8rem',
                                          fontWeight: 600,
                                          padding: '0.35rem 0.65rem',
                                        }}
                                      >
                                        {s}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {expandedTeacherId === teacher.id && (
                        <tr>
                          <td colSpan={9} style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
                            {usageData[teacher.id] ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* Usage Breakdown */}
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BarChart3 size={16} style={{ color: 'var(--primary)' }} />
                                    Content Generation Breakdown
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[
                                      { label: 'Worksheets', value: usageData[teacher.id].breakdown.worksheets, color: 'var(--primary)' },
                                      { label: 'Quizzes', value: usageData[teacher.id].breakdown.quizzes, color: '#8b5cf6' },
                                      { label: 'Question Papers', value: usageData[teacher.id].breakdown.questionPapers, color: '#0ea5e9' },
                                      { label: 'Lesson Plans', value: usageData[teacher.id].breakdown.lessons, color: 'var(--success)' },
                                      { label: 'Presentations', value: usageData[teacher.id].breakdown.presentations, color: '#f59e0b' },
                                    ].map((item, i) => {
                                      const total = usageData[teacher.id].breakdown.total;
                                      const pct = total > 0 ? (item.value / total) * 100 : 0;
                                      return (
                                        <div key={i}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 500 }}>{item.label}</span>
                                            <span style={{ fontWeight: 600 }}>{item.value} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({pct.toFixed(0)}%)</span></span>
                                          </div>
                                          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: '3px', transition: 'width 0.5s ease-out' }}></div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Monthly Graph */}
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={16} style={{ color: 'var(--primary)' }} />
                                    30-Day Generation Velocity
                                  </div>
                                  <div style={{ height: '160px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={usageData[teacher.id].chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                          <linearGradient id={`usageColor-t-${teacher.id}`} x1="0" y1="0" x2="0" y2="1">
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
                                          content={({ active, payload }: any) => {
                                            if (active && payload && payload.length) {
                                              return (
                                                <div style={{ background: 'white', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                  <div style={{ fontWeight: 600 }}>{new Date(payload[0].payload.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                                  <div style={{ color: 'var(--primary)' }}>{payload[0].value} Created</div>
                                                </div>
                                              );
                                            }
                                            return null;
                                          }}
                                        />
                                        <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill={`url(#usageColor-t-${teacher.id})`} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', padding: '1rem' }}>
                                <div className="spinner" style={{ margin: '0 auto 0.5rem auto', width: '20px', height: '20px' }}></div>
                                Loading usage statistics...
                              </div>
                            )}
                          </td>
                        </tr>
                      )}

                      {expandedSalesId === teacher.id && (
                        <tr>
                          <td colSpan={9} style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <MessageSquare size={14} style={{ color: 'var(--primary)' }} />
                                  Conversion Feedback & Sales Call Notes
                                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>— {teacher.name}</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1', minWidth: '200px' }}>
                                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem' }}>
                                        CALL STATUS <span style={{ color: '#ef4444' }}>*</span>
                                      </label>
                                      <select
                                        value={(salesFormData[teacher.id]?.status ?? '') === '' ? EMPTY_SELECT_SENTINEL : (salesFormData[teacher.id]?.status ?? '')}
                                        onChange={(e) => {
                                          const v = e.target.value === EMPTY_SELECT_SENTINEL ? '' : e.target.value;
                                          updateSalesField(teacher, 'status', v, true);
                                        }}
                                        style={{
                                          width: '100%', padding: '0.6rem', borderRadius: '0.5rem',
                                          border: '1px solid var(--card-border)', background: 'white', fontSize: '0.875rem',
                                          fontWeight: 500, outline: 'none', cursor: 'pointer'
                                        }}
                                      >
                                        <option value={EMPTY_SELECT_SENTINEL}>Select Status</option>
                                        {CONVERSION_STATUSES.map((s) => (
                                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {!!(salesFormData[teacher.id]?.status) && salesFormData[teacher.id]?.status !== 'CONVERTED' && (
                                      <div style={{ flex: '1', minWidth: '200px' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem' }}>
                                          REASON <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select
                                          value={(salesFormData[teacher.id]?.reason ?? '') === '' ? EMPTY_SELECT_SENTINEL : (salesFormData[teacher.id]?.reason ?? '')}
                                          onChange={(e) => {
                                            const v = e.target.value === EMPTY_SELECT_SENTINEL ? '' : e.target.value;
                                            updateSalesField(teacher, 'reason', v, true);
                                          }}
                                          style={{
                                            width: '100%', padding: '0.6rem', borderRadius: '0.5rem',
                                            border: '1px solid var(--card-border)', background: 'white', fontSize: '0.875rem',
                                            fontWeight: 500, outline: 'none', cursor: 'pointer'
                                          }}
                                        >
                                          <option value={EMPTY_SELECT_SENTINEL}>Select Reason</option>
                                          {CONVERSION_REASONS.map((r) => (
                                            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '240px' }}>
                                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem' }}>
                                        NOTES & FEEDBACK <span style={{ color: '#ef4444' }}>*</span>
                                      </label>
                                      <textarea
                                        value={salesFormData[teacher.id]?.notes || ''}
                                        onChange={(e) => updateSalesField(teacher, 'notes', e.target.value)}
                                        placeholder="Add details about the call, teacher's pain points, or follow-up items..."
                                        style={{
                                          width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '0.5rem',
                                          border: '1px solid var(--card-border)', background: 'white', fontSize: '0.875rem',
                                          resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: '1.5'
                                        }}
                                      />
                                    </div>
                                    {isSalesNotesDirty(teacher) && (
                                      <div style={{ alignSelf: 'flex-end', marginBottom: '4px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button
                                          type="button"
                                          onClick={() => saveSalesNotesOnly(teacher)}
                                          disabled={savingSales === teacher.id}
                                          style={{
                                            padding: '0.75rem 1.25rem', background: 'var(--primary)', color: 'white',
                                            border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600,
                                            cursor: 'pointer', opacity: savingSales === teacher.id ? 0.7 : 1,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                          }}
                                        >
                                          {savingSales === teacher.id ? 'Saving...' : 'Save Notes'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedSalesId(null)}
                                    className="action-btn"
                                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pagination">
            <button
              className="action-btn"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <div className="page-info">
              Page {page} of {Math.max(1, totalPages)}
            </div>
            <button
              className="action-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Artifacts Modal */}
      {selectedTeacher && (
        <div className="modal-overlay" onClick={() => setSelectedTeacher(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Artifacts by {selectedTeacher.name}</h3>
              <button
                onClick={() => setSelectedTeacher(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingArtifacts ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', color: 'var(--muted)' }}>
                  Loading artifacts...
                </div>
              ) : teacherArtifacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)' }}>
                  <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                  <p>No artifacts generated yet.</p>
                </div>
              ) : (
                <div className="artifacts-list">
                  {teacherArtifacts.map((art, i) => (
                    <div key={i} className="artifact-item">
                      <div>
                        <div className="artifact-name">{art.title}</div>
                        <div className="artifact-meta">
                          <span>{new Date(art.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span style={{ textTransform: 'capitalize' }}>{art.status}</span>
                        </div>
                      </div>
                      <div className={`badge ${art.type === 'lesson' ? 'badge-primary' : art.type === 'assessment' ? 'badge-success' : ''}`} style={{ textTransform: 'capitalize' }}>
                        {art.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
