'use client';

import { useEffect, useState, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Users, FileText, ChevronLeft, ChevronRight, X, ArrowUpDown,
  ChevronDown, ChevronUp, BarChart3, Calendar,
  MessageSquare, ClipboardCheck, Clock, Star, ThumbsUp, ThumbsDown, CheckCircle
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
