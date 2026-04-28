'use client';

import { useEffect, useState, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Users, FileText, Zap, Clock, List, Filter,
  ChevronDown, ChevronUp, BarChart3, Calendar,
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface TodayTeacher {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  createdAt: string;
  isNewToday: boolean;
  generatedToday: boolean;
  totalArtifacts: number;
}

interface TodayStats {
  newTeachersToday: number;
  totalArtifactsToday: number;
  lessonsToday: number;
  quizzesToday: number;
  presentationsToday?: number;
  assessmentsToday: number;
  assessmentsWorksheetToday?: number;
  assessmentsQuestionPaperToday?: number;
  activeUsersToday: number;
  teachersList: TodayTeacher[];
}

export default function TodayPage() {
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'new' | 'returning'>('new');
  const [listPage, setListPage] = useState(1);

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
    const fetchTodayStats = async () => {
      try {
        const res = await fetch(`/api/today`);
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTodayStats();
  }, []);

  if (!stats) return (
    <DashboardLayout>
      <div className="loading-screen" style={{ height: '80vh' }}>
        <div className="spinner"></div>
        <div className="text-muted font-medium">Loading metrics...</div>
      </div>
    </DashboardLayout>
  );

  // Derive strictly filtered array
  const activeDirectory = stats.teachersList.filter(t => {
    if (filterMode === 'new') return t.isNewToday;
    if (filterMode === 'returning') return t.generatedToday && !t.isNewToday;
    return true; // 'all'
  });

  const ITEMS_PER_PAGE = 10;
  const listTotalPages = Math.max(1, Math.ceil(activeDirectory.length / ITEMS_PER_PAGE));
  const paginatedList = activeDirectory.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <h1 className="page-title">Today's Pulse</h1>
          <p className="page-description">
            Objective metrics covering registration volume, generating user scale, and raw artifact distribution strictly occurring today.
          </p>
        </div>

        {/* Core Metrics Row */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Active Users</div>
                <div className="stat-value">{stats.activeUsersToday}</div>
              </div>
              <div className="stat-icon"><Zap /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Unique users generating currently</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">New Accounts</div>
                <div className="stat-value">{stats.newTeachersToday}</div>
              </div>
              <div className="stat-icon"><Clock /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Registrations created today</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Total Volume</div>
                <div className="stat-value">{stats.totalArtifactsToday}</div>
              </div>
              <div className="stat-icon"><FileText /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Items generated today</span>
            </div>
          </div>
        </section>

        {/* Generation Volume Row */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
          <div className="card-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', marginBottom: 0 }}>
            <div className="card-title">
              <List size={20} />
              Item Distribution
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: 'var(--card-bg)' }}>
            <div style={{ borderRight: '1px solid var(--card-border)', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Lesson Plans</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.lessonsToday}</div>
            </div>
            <div style={{ borderRight: '1px solid var(--card-border)', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Quizzes</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.quizzesToday}</div>
            </div>
            <div style={{ borderRight: '1px solid var(--card-border)', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Question Papers</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.assessmentsQuestionPaperToday ?? 0}</div>
            </div>
            <div style={{ borderRight: '1px solid var(--card-border)', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Assignments</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.assessmentsWorksheetToday ?? 0}</div>
            </div>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Presentations</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.presentationsToday ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Tabular Teachers List Array */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={20} />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Live Teacher Cohort</h2>
              <div className="badge">{activeDirectory.length} showing</div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem' }}>
              <button
                onClick={() => { setFilterMode('all'); setListPage(1); }}
                style={{ border: 'none', background: filterMode === 'all' ? 'white' : 'transparent', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: filterMode === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: filterMode === 'all' ? 'var(--foreground)' : 'var(--muted)' }}
              >
                All Context
              </button>
              <button
                onClick={() => { setFilterMode('new'); setListPage(1); }}
                style={{ border: 'none', background: filterMode === 'new' ? 'white' : 'transparent', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: filterMode === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: filterMode === 'new' ? 'var(--foreground)' : 'var(--muted)' }}
              >
                New Signups
              </button>
              <button
                onClick={() => { setFilterMode('returning'); setListPage(1); }}
                style={{ border: 'none', background: filterMode === 'returning' ? 'white' : 'transparent', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: filterMode === 'returning' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: filterMode === 'returning' ? 'var(--foreground)' : 'var(--muted)' }}
              >
                Returning Actives
              </button>
            </div>
          </div>

          <div className="table-container">
            {activeDirectory.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>No instructor activity matches the selected filter status.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Phone</th>
                    <th>School</th>
                    <th>Joined</th>
                    <th>Artifacts</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((teacher: any) => (
                    <Fragment key={teacher.id}>
                      <tr>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `hsl(${(teacher.name.charCodeAt(0) * 13) % 360}, 70%, 90%)`, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                              {teacher.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{teacher.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.8rem' }}>{teacher.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted" style={{ fontSize: '0.875rem' }}>{teacher.phoneNumber || '—'}</td>
                        <td>{teacher.schoolName}</td>
                        <td>{new Date(teacher.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{teacher.totalArtifacts}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            onClick={() => fetchUsageData(teacher.id)} 
                            className="action-btn"
                            style={{ 
                              borderColor: expandedTeacherId === teacher.id ? 'var(--primary)' : 'var(--card-border)',
                              fontSize: '0.75rem',
                              padding: '0.375rem 0.5rem',
                              marginLeft: 'auto'
                            }}
                          >
                            {loadingUsage === teacher.id ? 'Loading...' : 'Usage'}
                            {expandedTeacherId === teacher.id ? <ChevronUp size={14} style={{ marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
                          </button>
                        </td>
                      </tr>

                      {expandedTeacherId === teacher.id && (
                        <tr>
                          <td colSpan={6} style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
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
                                    Full Lifetime Generation Velocity
                                  </div>
                                  <div style={{ height: '160px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={usageData[teacher.id].chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                          <linearGradient id={`usageColor-today-${teacher.id}`} x1="0" y1="0" x2="0" y2="1">
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
                                          minTickGap={25}
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
                                        <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill={`url(#usageColor-today-${teacher.id})`} />
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

          {activeDirectory.length > ITEMS_PER_PAGE && (
            <div className="pagination" style={{ borderTop: '1px solid var(--card-border)', padding: '1rem 1.5rem' }}>
              <button 
                className="action-btn" 
                disabled={listPage === 1} 
                onClick={() => setListPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="page-info">
                Page {listPage} of {listTotalPages}
              </div>
              <button 
                className="action-btn" 
                disabled={listPage >= listTotalPages} 
                onClick={() => setListPage(p => Math.min(listTotalPages, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
