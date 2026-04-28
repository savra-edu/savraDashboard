'use client';

import { useEffect, useState, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  MessageSquare, Star, User, Calendar, ChevronLeft, ChevronRight, X, Phone, School, GraduationCap, Search,
  ChevronDown, ChevronUp, BarChart3 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface FeedbackItem {
  id: string;
  rating: number;
  message: string;
  promptKind: string;
  artifactType: string | null;
  createdAt: string;
  teacher: {
    id: string;
    name: string;
    email: string;
    schoolName: string;
    phone: string | null;
    grade: string;
  };
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [distribution, setDistribution] = useState<any>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

  // Individual usage states
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<Record<string, {
    breakdown: { worksheets: number; questionPapers: number; quizzes: number; lessons: number; presentations: number; total: number };
    chartData: Array<{ date: string; count: number }>;
  }>>({});
  const [loadingUsage, setLoadingUsage] = useState<string | null>(null);
  const [graphScopes, setGraphScopes] = useState<Record<string, '30d' | 'ytd'>>({});

  const fetchUsageData = async (feedbackId: string, teacherId: string) => {
    if (expandedFeedbackId === feedbackId) {
      setExpandedFeedbackId(null);
      return;
    }

    setExpandedFeedbackId(feedbackId);

    if (usageData[teacherId]) {
      return;
    }
    
    setLoadingUsage(feedbackId);
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
    fetchFeedback(page, ratingFilter, debouncedSearch);
  }, [page, ratingFilter, debouncedSearch]);

  const fetchFeedback = async (pageNum: number, rating: number | null, search: string) => {
    setLoading(true);
    try {
      const url = `/api/feedback?page=${pageNum}${rating ? `&rating=${rating}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFeedback(data.data);
        setDistribution(data.distribution);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            size={14} 
            fill={s <= rating ? "#f59e0b" : "none"} 
            stroke={s <= rating ? "#f59e0b" : "var(--muted)"} 
          />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ marginBottom: '2.5rem' }}>
          <h1 className="page-title">User Feedback</h1>
          <p className="page-description">Direct sentiment and qualitative responses from teachers across the platform.</p>
        </div>

        {distribution && (
          <div className="card" style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '2rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', minWidth: '150px' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{distribution.average}</div>
              <div style={{ margin: '0.75rem 0' }}>{renderStars(Math.round(distribution.average))}</div>
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>{distribution.total} global ratings</div>
            </div>

            <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] || 0;
                const percentage = distribution.total > 0 ? (count / distribution.total) * 100 : 0;
                const isActive = ratingFilter === star;

                return (
                  <div 
                    key={star} 
                    onClick={() => setRatingFilter(isActive ? null : star)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
                      padding: '4px 8px', borderRadius: '6px', 
                      background: isActive ? '#f1f5f9' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <span style={{ minWidth: '45px', fontSize: '0.875rem', fontWeight: 600, color: isActive ? 'var(--primary)' : 'var(--foreground)' }}>{star} star</span>
                    <div style={{ flex: 1, height: '14px', background: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: isActive ? 'var(--primary)' : '#ff6b00', borderRadius: '7px' }}></div>
                    </div>
                    <span style={{ minWidth: '35px', fontSize: '0.875rem', textAlign: 'right', color: 'var(--muted)' }}>{Math.round(percentage)}%</span>
                  </div>
                );
              })}
            </div>
            
            {ratingFilter && (
              <div style={{ minWidth: '200px' }}>
                <button 
                  onClick={() => setRatingFilter(null)}
                  className="action-btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                >
                  <X size={16} />
                  Clear {ratingFilter} Star Filter
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', width: '16px', color: 'var(--muted)' }} />
            <input 
              type="text" 
              placeholder="Search by teacher name..." 
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
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading feedback...</div>
            ) : feedback.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>No feedback received yet.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Rating</th>
                    <th>Message</th>
                    <th>Kind</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((f) => (
                    <Fragment key={f.id}>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{f.teacher.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.8rem' }}>{f.teacher.schoolName}</div>
                        </td>
                        <td>{renderStars(f.rating || 0)}</td>
                        <td>
                          <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                            {f.message || <span className="text-muted italic">No comment provided</span>}
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ textTransform: 'capitalize' }}>{f.promptKind}</span>
                        </td>
                        <td className="text-muted" style={{ fontSize: '0.875rem' }}>
                          {new Date(f.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => fetchUsageData(f.id, f.teacher.id)} 
                              className="action-btn"
                              style={{ 
                                borderColor: expandedFeedbackId === f.id ? 'var(--primary)' : 'var(--card-border)',
                                fontSize: '0.75rem',
                                padding: '0.375rem 0.5rem'
                              }}
                            >
                              {loadingUsage === f.id ? 'Loading...' : 'Usage'}
                              {expandedFeedbackId === f.id ? <ChevronUp size={14} style={{ marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
                            </button>
                            <button className="action-btn" onClick={() => setSelectedFeedback(f)} style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}>
                              <User size={14} />
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedFeedbackId === f.id && (
                        <tr>
                          <td colSpan={6} style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
                            {usageData[f.teacher.id] ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* Usage Breakdown */}
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BarChart3 size={16} style={{ color: 'var(--primary)' }} />
                                    Content Generation Breakdown
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[
                                      { label: 'Worksheets', value: usageData[f.teacher.id].breakdown.worksheets, color: 'var(--primary)' },
                                      { label: 'Quizzes', value: usageData[f.teacher.id].breakdown.quizzes, color: '#8b5cf6' },
                                      { label: 'Question Papers', value: usageData[f.teacher.id].breakdown.questionPapers, color: '#0ea5e9' },
                                      { label: 'Lesson Plans', value: usageData[f.teacher.id].breakdown.lessons, color: 'var(--success)' },
                                      { label: 'Presentations', value: usageData[f.teacher.id].breakdown.presentations, color: '#f59e0b' },
                                    ].map((item, i) => {
                                      const total = usageData[f.teacher.id].breakdown.total;
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
                                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <Calendar size={16} style={{ color: 'var(--primary)' }} />
                                      {(graphScopes[f.teacher.id] || '30d') === '30d' ? '30-Day Generation Velocity' : 'Year-to-Date Velocity'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem', background: '#e2e8f0', padding: '2px', borderRadius: '4px' }}>
                                      <button 
                                        onClick={() => setGraphScopes(prev => ({ ...prev, [f.teacher.id]: '30d' }))}
                                        style={{ 
                                          border: 'none', 
                                          background: (graphScopes[f.teacher.id] || '30d') === '30d' ? 'white' : 'transparent', 
                                          fontSize: '0.7rem', 
                                          padding: '2px 6px', 
                                          borderRadius: '3px', 
                                          fontWeight: 600, 
                                          cursor: 'pointer',
                                          boxShadow: (graphScopes[f.teacher.id] || '30d') === '30d' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                      >
                                        30D
                                      </button>
                                      <button 
                                        onClick={() => setGraphScopes(prev => ({ ...prev, [f.teacher.id]: 'ytd' }))}
                                        style={{ 
                                          border: 'none', 
                                          background: graphScopes[f.teacher.id] === 'ytd' ? 'white' : 'transparent', 
                                          fontSize: '0.7rem', 
                                          padding: '2px 6px', 
                                          borderRadius: '3px', 
                                          fontWeight: 600, 
                                          cursor: 'pointer',
                                          boxShadow: graphScopes[f.teacher.id] === 'ytd' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                      >
                                        YTD
                                      </button>
                                    </div>
                                  </div>
                                  <div style={{ height: '160px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart 
                                        data={(() => {
                                          const fullData = usageData[f.teacher.id].chartData;
                                          if ((graphScopes[f.teacher.id] || '30d') === '30d') {
                                            return fullData.slice(-30);
                                          } else {
                                            const ytdStart = new Date(new Date().getFullYear(), 0, 1);
                                            return fullData.filter((item: any) => new Date(item.date) >= ytdStart);
                                          }
                                        })()} 
                                        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                                      >
                                        <defs>
                                          <linearGradient id={`usageColor-f-${f.teacher.id}`} x1="0" y1="0" x2="0" y2="1">
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
                                        <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill={`url(#usageColor-f-${f.teacher.id})`} />
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

      {/* Teacher Details Modal */}
      {selectedFeedback && (
        <div className="modal-overlay" onClick={() => setSelectedFeedback(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Feedback Details</h3>
              <button onClick={() => setSelectedFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {selectedFeedback.teacher.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{selectedFeedback.teacher.name}</h4>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>{selectedFeedback.teacher.email}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                     <Phone size={14} className="text-muted" />
                     <span>{selectedFeedback.teacher.phone || 'N/A'}</span>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                     <School size={14} className="text-muted" />
                     <span>{selectedFeedback.teacher.schoolName}</span>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                     <GraduationCap size={14} className="text-muted" />
                     <span>Grade: {selectedFeedback.teacher.grade}</span>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                     <Calendar size={14} className="text-muted" />
                     <span>{new Date(selectedFeedback.createdAt).toLocaleDateString()}</span>
                   </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Rating</span>
                  {renderStars(selectedFeedback.rating || 0)}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Message</div>
                <div style={{ padding: '1rem', background: 'white', border: '1px solid var(--card-border)', borderRadius: '0.75rem', fontSize: '0.925rem', lineHeight: 1.5 }}>
                  {selectedFeedback.message || <span className="text-muted italic">No comment provided.</span>}
                </div>
              </div>

              {selectedFeedback.artifactType && (
                <div className="badge badge-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                  <MessageSquare size={14} />
                  Context: {selectedFeedback.artifactType}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
