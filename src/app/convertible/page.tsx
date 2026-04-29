'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Zap, BarChart3, Calendar, Users, 
  ChevronDown, ChevronUp, Phone, Mail, ArrowUpRight,
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

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

  const ITEMS_PER_PAGE = 10;
  const listTotalPages = Math.max(1, Math.ceil(leads.length / ITEMS_PER_PAGE));
  const paginatedLeads = leads.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/convertible');
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
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

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Convertible Users</h1>
            <p className="page-description">Identified free users exhibiting continuous feature usage signals suitable for target conversions.</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', padding: '0.75rem 1.25rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #7dd3fc' }}>
            <ArrowUpRight color="#0369a1" size={24} />
            <span style={{ fontWeight: 700, color: '#0369a1' }}>Target Leads</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid var(--card-border)', borderRadius: '0.75rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--foreground)' }}>Scoring Criteria:</strong> Conversion scores identify continuous high engagement. 
          Anything above <strong style={{ color: '#15803d' }}>110</strong> is highly convertible, above <strong style={{ color: 'var(--primary)' }}>80</strong> is primed for conversion, and above <strong style={{ color: '#b45309' }}>40</strong> shows growing adoption signals.
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {paginatedLeads.map((lead) => (
              <div key={lead.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Lead Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `hsl(${(lead.name.charCodeAt(0) * 13) % 360}, 70%, 90%)`, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem' }}>
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{lead.name}</h3>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          <Mail size={14} /> {lead.email}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          <Phone size={14} /> {lead.phone}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Conversion Score
                    </div>
                    <div style={{ 
                      fontSize: '1.25rem', fontWeight: 800, 
                      color: lead.conversionScore > 100 ? '#15803d' : lead.conversionScore > 50 ? 'var(--primary)' : '#b45309',
                      background: lead.conversionScore > 100 ? '#f0fdf4' : lead.conversionScore > 50 ? '#eef2ff' : '#fffbeb',
                      padding: '0.25rem 0.75rem', borderRadius: '0.5rem', border: '1px solid currentColor',
                      display: 'inline-block'
                    }}>
                      {lead.conversionScore}
                    </div>
                  </div>
                </div>

                {/* Summary Metrics Row */}
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '-0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} /> Usage metrics across the last 14 days:
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

                {/* Collapsible Action Button */}
                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="action-btn"
                    onClick={() => toggleUsage(lead)}
                    style={{ 
                      padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                      background: 'white', border: '1px solid var(--card-border)', borderRadius: '0.5rem',
                      fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer', color: 'var(--foreground)'
                    }}
                  >
                    {expandedLeadId === lead.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {expandedLeadId === lead.id ? 'Collapse View' : 'Analyze Detailed Usage'}
                  </button>
                </div>

                {/* Expanded Usage Data Breakdown */}
                {expandedLeadId === lead.id && (
                  <div style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
                    {loadingUsage === lead.id ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 0.5rem auto', width: '20px', height: '20px' }}></div>
                        Fetching timeline metrics...
                      </div>
                    ) : usageData[lead.id] ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        
                        {/* Usage Distribution */}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart3 size={16} style={{ color: 'var(--primary)' }} />
                            All-Time Generation Breakdown
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

                        {/* Graph */}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} style={{ color: 'var(--primary)' }} />
                            30-Day Activity Heatmap
                          </div>
                          <div style={{ height: '160px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={usageData[lead.id].chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                  <linearGradient id={`colorUsage-${lead.id}`} x1="0" y1="0" x2="0" y2="1">
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
                )}
              </div>
            ))}

            {leads.length > ITEMS_PER_PAGE && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '1rem 1.5rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)', marginTop: '1.5rem' }}>
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
