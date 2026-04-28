'use client';

import { useEffect, useState, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Users, FileText, ChevronLeft, ChevronRight, X, ArrowUpDown,
  ChevronDown, ChevronUp, BarChart3, Calendar 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface Teacher {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  createdAt: string;
  artifactCounts: {
    lessons: number;
    quizzes: number;
    assessments: number;
    total: number;
  };
}

export default function TeachersDirectory() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortValue, setSortValue] = useState('joined_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherArtifacts, setTeacherArtifacts] = useState<any[]>([]);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'all' | 'dive'>('all');
  const [diveEmail, setDiveEmail] = useState('');
  const [diveResult, setDiveResult] = useState<any | null>(null);
  const [loadingDive, setLoadingDive] = useState(false);
  const [diveError, setDiveError] = useState('');
  const [diveUsage, setDiveUsage] = useState<any | null>(null);
  const [loadingDiveUsage, setLoadingDiveUsage] = useState(false);
  const [diveGraphScope, setDiveGraphScope] = useState<'30d' | 'ytd'>('30d');

  const handleDeepDiveSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!diveEmail.trim()) return;

    setLoadingDive(true);
    setDiveError('');
    setDiveResult(null);
    setDiveUsage(null);

    try {
      const res = await fetch(`/api/teachers/dive?email=${encodeURIComponent(diveEmail.trim())}`);
      const data = await res.json();
      if (data.success) {
        setDiveResult(data.data);
        // Fetch usage charts for this teacher if present
        if (data.data.teacher?.id) {
          fetchDiveUsage(data.data.teacher.id);
        }
      } else {
        setDiveError(data.error || 'Instructor search failed.');
      }
    } catch (err) {
      setDiveError('Network breakdown triggering deep dive search.');
    } finally {
      setLoadingDive(false);
    }
  };

  const fetchDiveUsage = async (teacherId: string) => {
    setLoadingDiveUsage(true);
    try {
      const res = await fetch(`/api/subscriptions/usage?teacherId=${teacherId}`);
      const data = await res.json();
      if (data.success) {
        setDiveUsage(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dive usage', error);
    } finally {
      setLoadingDiveUsage(false);
    }
  };

  // Individual usage states
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<Record<string, {
    breakdown: { worksheets: number; questionPapers: number; quizzes: number; lessons: number; presentations: number; total: number };
    chartData: Array<{ date: string; count: number }>;
  }>>({});
  const [loadingUsage, setLoadingUsage] = useState<string | null>(null);

  const fetchUsageData = async (teacherId: string) => {
    if (expandedTeacherId === teacherId) {
      setExpandedTeacherId(null);
      return;
    }

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
    fetchTeachers(page, sortValue, debouncedSearch);
  }, [page, sortValue, debouncedSearch]);

  const fetchTeachers = async (pageNum: number, sortMode: string, search: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers?page=${pageNum}&sort=${sortMode}&search=${encodeURIComponent(search)}`);
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
          
          <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem', alignSelf: 'center' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{ border: 'none', background: activeTab === 'all' ? 'white' : 'transparent', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: activeTab === 'all' ? 'var(--foreground)' : 'var(--muted)' }}
            >
              All Instructors
            </button>
            <button
              onClick={() => setActiveTab('dive')}
              style={{ border: 'none', background: activeTab === 'dive' ? 'white' : 'transparent', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'dive' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: activeTab === 'dive' ? 'var(--foreground)' : 'var(--muted)' }}
            >
              Deep Dive Search
            </button>
          </div>

          {activeTab === 'all' && (
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
        )}
      </div>

        {activeTab === 'all' && (
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
                      <th>Teacher</th>
                      <th>Phone</th>
                      <th>School</th>
                      <th>Grade</th>
                      <th>Joined</th>
                      <th>Last Active</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher: any) => (
                      <Fragment key={teacher.id}>
                        <tr>
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
                            <span className="badge" style={{ background: '#f8fafc', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
                              {teacher.grade}
                            </span>
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
                              <button className="action-btn" onClick={() => showArtifacts(teacher)} style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}>
                                <FileText size={14} />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedTeacherId === teacher.id && (
                          <tr>
                            <td colSpan={7} style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
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
                                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
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
        )}

        {activeTab === 'dive' && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Find Instructor Deep-Dive Analytics</h2>
              <form onSubmit={handleDeepDiveSearch} style={{ display: 'flex', gap: '0.75rem', maxWidth: '600px' }}>
                <input 
                  type="email" 
                  placeholder="Enter instructor's registered email address..."
                  value={diveEmail}
                  onChange={(e) => setDiveEmail(e.target.value)}
                  style={{ 
                    flex: 1, padding: '0.75rem 1rem', 
                    borderRadius: '0.75rem', border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)', fontSize: '0.875rem', outline: 'none'
                  }} 
                />
                <button 
                  type="submit" 
                  disabled={loadingDive || !diveEmail.trim()}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 600 }}
                >
                  {loadingDive ? 'Searching...' : 'Search Email'}
                </button>
              </form>
              
              {diveError && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', color: '#991b1b', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  {diveError}
                </div>
              )}
            </div>

            {diveResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* 1. Account Summary & Subscription Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  
                  {/* Account Summary */}
                  <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {diveResult.user.name.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>{diveResult.user.name}</h3>
                        <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{diveResult.user.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>School Affiliation:</span>
                        <span style={{ fontWeight: 600 }}>{diveResult.teacher?.schoolName || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Instructor Account ID:</span>
                        <span style={{ fontWeight: 600 }}>{diveResult.teacher?.id || 'No profile created'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Joined Date:</span>
                        <span style={{ fontWeight: 600 }}>
                          {diveResult.teacher?.createdAt ? new Date(diveResult.teacher.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Taught Grades:</span>
                        <span style={{ fontWeight: 600 }}>{diveResult.teacher?.grade || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Details */}
                  <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Subscription Plan</h3>
                      <span className="badge" style={{ 
                        textTransform: 'uppercase', 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        background: diveResult.subscription.plan === 'max' ? '#eff6ff' : diveResult.subscription.plan === 'pro' ? '#f5f3ff' : '#f8fafc',
                        color: diveResult.subscription.plan === 'max' ? 'var(--primary)' : diveResult.subscription.plan === 'pro' ? '#7c3aed' : 'var(--muted)',
                        border: '1px solid currentColor'
                      }}>
                        {diveResult.subscription.plan}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Billing Frequency:</span>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{diveResult.subscription.billingCycle}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Last Activation Date:</span>
                        <span style={{ fontWeight: 600 }}>
                          {diveResult.subscription.activatedOn ? new Date(diveResult.subscription.activatedOn).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'None'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Cycle Renewal Date:</span>
                        <span style={{ fontWeight: 600 }}>
                          {diveResult.subscription.endsAt ? new Date(diveResult.subscription.endsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Usage Stats Breakdowns */}
                {diveResult.teacher && (
                  <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      
                      {/* Breakdown Stats */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
                          All-Time Content Generation Breakdown
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {[
                            { label: 'Worksheets', value: diveResult.usageBreakdown.worksheets, color: 'var(--primary)' },
                            { label: 'Quizzes', value: diveResult.usageBreakdown.quizzes, color: '#8b5cf6' },
                            { label: 'Question Papers', value: diveResult.usageBreakdown.questionPapers, color: '#0ea5e9' },
                            { label: 'Lesson Plans', value: diveResult.usageBreakdown.lessons, color: 'var(--success)' },
                            { label: 'Presentations', value: diveResult.usageBreakdown.presentations, color: '#f59e0b' },
                          ].map((item, i) => {
                            const total = diveResult.usageBreakdown.total;
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

                      {/* Velocity Graph */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={18} style={{ color: 'var(--primary)' }} />
                            {diveGraphScope === '30d' ? '30-Day Velocity' : 'Year-to-Date Velocity'}
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem', background: '#e2e8f0', padding: '2px', borderRadius: '4px' }}>
                            <button 
                              onClick={() => setDiveGraphScope('30d')}
                              style={{ 
                                border: 'none', 
                                background: diveGraphScope === '30d' ? 'white' : 'transparent', 
                                fontSize: '0.7rem', 
                                padding: '2px 8px', 
                                borderRadius: '3px', 
                                fontWeight: 600, 
                                cursor: 'pointer',
                                boxShadow: diveGraphScope === '30d' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                              }}
                            >
                              30D
                            </button>
                            <button 
                              onClick={() => setDiveGraphScope('ytd')}
                              style={{ 
                                border: 'none', 
                                background: diveGraphScope === 'ytd' ? 'white' : 'transparent', 
                                fontSize: '0.7rem', 
                                padding: '2px 8px', 
                                borderRadius: '3px', 
                                fontWeight: 600, 
                                cursor: 'pointer',
                                boxShadow: diveGraphScope === 'ytd' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                              }}
                            >
                              YTD
                            </button>
                          </div>
                        </div>

                        {loadingDiveUsage ? (
                          <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
                            Loading timeline data...
                          </div>
                        ) : diveUsage ? (
                          <div style={{ height: '160px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart 
                                data={(() => {
                                  const fullData = diveUsage.chartData || [];
                                  if (diveGraphScope === '30d') {
                                    return fullData.slice(-30);
                                  } else {
                                    const ytdStart = new Date(new Date().getFullYear(), 0, 1);
                                    return fullData.filter((item: any) => new Date(item.date) >= ytdStart);
                                  }
                                })()} 
                                margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id="usageColor-dive" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
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
                                          <div style={{ fontWeight: 600 }}>{new Date(payload[0].payload.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                          <div style={{ color: 'var(--primary)' }}>{payload[0].value} Created</div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#usageColor-dive)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
                            Timeline data unavailable.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
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
