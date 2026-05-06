'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Search, Users, Mail, Phone, School, BookOpen, 
  ChevronRight, BarChart3, Calendar, MessageSquare, 
  ClipboardCheck, Clock, Star, ArrowLeft,
  Loader2, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const CONVERSION_STATUSES = [
  'DNP', 'CALL_LATER', 'WRONG_NUMBER', 'INTERESTED', 'NOT_INTERESTED', 'CONVERTED', 'IRRELEVANT'
];

const CONVERSION_REASONS = [
  'EXPENSIVE', 'CONTENT_QUALITY', 'NOT_RIGHT_NOW', 'NEED_MORE_TIME_TO_THINK', 'NEED_MORE_FEATURES', 'USING_OTHER_PLATFORM', 'OTHERS'
];

export default function DeepDivePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const fadeInStyle = {
    animation: 'fadeIn 0.4s ease-out forwards'
  };

  const keyframes = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Dive Data
  const [diveResult, setDiveResult] = useState<any | null>(null);
  const [loadingDive, setLoadingDive] = useState(false);
  const [diveError, setDiveError] = useState('');
  const [diveUsage, setDiveUsage] = useState<any | null>(null);
  const [loadingDiveUsage, setLoadingDiveUsage] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [expandSubjects, setExpandSubjects] = useState(false);

  const performSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoadingSearch(true);
    setHasSearched(true);
    setSearchResults([]);
    setDiveResult(null);

    try {
      const res = await fetch(`/api/teachers?limit=20&search=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectInstructor = async (instructor: any) => {
    setLoadingDive(true);
    setDiveError('');
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
            } catch (e) {}
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
        setDiveError(data.error || 'Failed to retrieve deep dive analytics.');
      }
    } catch (err) {
      setDiveError('Connection error while fetching instructor profile.');
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
      console.error('Usage fetch failed:', error);
    } finally {
      setLoadingDiveUsage(false);
    }
  };

  const updateDiveField = async (field: string, value: any, autoSave = false) => {
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
      notes: result.notes || ''
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
          conversionFeedback: { ...(prev?.conversionFeedback || {}), feedback: feedbackStr }
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
        } catch (e) {}
      } else {
        originalNotes = fb;
      }
    }
    return diveResult.notes !== originalNotes;
  };

  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />
      <div className="page-content" style={{ maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
        <div className="page-header" style={{ marginBottom: '2.5rem' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
              Deep Dive <span style={{ color: 'var(--primary)' }}>Researcher</span>
            </h1>
            <p className="page-description">Search for any instructor to analyze their full platform engagement and sales conversion status.</p>
          </div>
        </div>

        {/* Search Experience */}
        {!diveResult && (
          <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
             <form onSubmit={performSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                <input 
                  type="text" 
                  placeholder="Enter instructor name or email address..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    flex: 1, padding: '0.75rem 1rem', 
                    borderRadius: '0.75rem', border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)', fontSize: '0.875rem', outline: 'none'
                  }} 
                />
                <button 
                  type="submit" 
                  disabled={loadingSearch || !searchQuery.trim()}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 600 }}
                >
                  {loadingSearch ? 'Searching...' : 'Search Instructor'}
                </button>
             </form>

             {loadingSearch ? (
                <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--muted)', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                   <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1.25rem' }} />
                   <div style={{ fontWeight: 600 }}>Scanning instructor records...</div>
                </div>
             ) : hasSearched && searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', ...fadeInStyle }}>
                   {searchResults.map(instructor => (
                     <div key={instructor.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                              {instructor.name.charAt(0)}
                           </div>
                           <div>
                              <div style={{ fontWeight: 600 }}>{instructor.name}</div>
                              <div style={{ fontSize: '0.825rem', color: 'var(--muted)' }}>{instructor.email} • {instructor.schoolName}</div>
                           </div>
                        </div>
                        <button onClick={() => handleSelectInstructor(instructor)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                           Open Deep Dive
                        </button>
                     </div>
                   ))}
                </div>
             ) : hasSearched && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                   No instructors found matching "{searchQuery}"
                </div>
             )}
          </div>
        )}

        {/* Loading State for Dive */}
        {loadingDive && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10rem 0', minHeight: '500px' }}>
            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Assembling Instructor Analytics...</h3>
            <p style={{ color: 'var(--muted)' }}>Fetching usage metrics and sales history.</p>
          </div>
        )}

        {/* Dive Result Rendering (REVERTED UI) */}
        {diveResult && !loadingDive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', ...fadeInStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <button 
                onClick={() => { setDiveResult(null); }}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', 
                  border: 'none', cursor: 'pointer', color: 'var(--muted)', fontWeight: 600, fontSize: '0.875rem' 
                }}
              >
                <ArrowLeft size={16} /> Back to Search
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Profile Overview */}
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '1.25rem', 
                    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', 
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '1.75rem', fontWeight: 800, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' 
                  }}>
                    {diveResult.user.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{diveResult.user.name}</h2>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Mail size={14} /> {diveResult.user.email}
                      </span>
                      {diveResult.teacher?.phone && (
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Phone size={14} /> {diveResult.teacher.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>School Affiliation</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <School size={16} style={{ color: 'var(--primary)' }} />
                      {diveResult.teacher?.schoolName || 'N/A'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Taught Grades</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Zap size={16} style={{ color: '#f59e0b' }} />
                      {diveResult.teacher?.grade || 'N/A'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Primary Subjects</span>
                    <div 
                      onClick={() => diveResult.teacher?.subject?.length > 40 && setExpandSubjects(!expandSubjects)}
                      style={{ 
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontWeight: 600, 
                        cursor: diveResult.teacher?.subject?.length > 40 ? 'pointer' : 'default',
                        transition: 'all 0.2s'
                      }}
                    >
                      <BookOpen size={16} style={{ color: '#10b981', marginTop: '3px', flexShrink: 0 }} />
                      <div style={{ wordBreak: 'break-word', fontSize: '0.875rem' }}>
                        {expandSubjects 
                          ? diveResult.teacher?.subject 
                          : (diveResult.teacher?.subject?.length > 40 
                              ? diveResult.teacher?.subject.substring(0, 40) + '...' 
                              : diveResult.teacher?.subject) || 'N/A'
                        }
                        {diveResult.teacher?.subject?.length > 40 && (
                          <span style={{ color: 'var(--primary)', fontSize: '0.7rem', marginLeft: '0.5rem', display: 'inline-block', verticalAlign: 'middle' }}>
                            {expandSubjects ? '(Show less)' : '(Show more)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Subscription Plan</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge" style={{ 
                        background: diveResult.subscription.plan === 'max' ? '#eff6ff' : diveResult.subscription.plan === 'pro' ? '#f5f3ff' : '#f8fafc',
                        color: diveResult.subscription.plan === 'max' ? 'var(--primary)' : diveResult.subscription.plan === 'pro' ? '#7c3aed' : 'var(--muted)',
                        fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem'
                      }}>
                        {diveResult.subscription.plan}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Product Usage Velocity</h3>
                </div>
                
                {loadingDiveUsage ? (
                  <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                    Calculating engagement...
                  </div>
                ) : diveUsage ? (
                  <div style={{ height: '180px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={diveUsage.chartData}>
                        <defs>
                          <linearGradient id="usageColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#usageColor)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                      <span>30 DAYS AGO</span>
                      <span>TODAY</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: '0.75rem' }}>
                    No usage velocity data available
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
               {/* Sales Management Card */}
               <div className="card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <ClipboardCheck size={20} style={{ color: '#15803d' }} />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Sales Conversion Management</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Funnel Stage</label>
                        <select 
                          value={diveResult.status}
                          onChange={(e) => updateDiveField('status', e.target.value, true)}
                          style={{ 
                            width: '100%', padding: '0.75rem', borderRadius: '0.75rem', 
                            border: '1px solid var(--card-border)', background: 'white', fontSize: '0.875rem',
                            fontWeight: 600, outline: 'none', cursor: 'pointer'
                          }}
                        >
                          <option value="">Select Status</option>
                          {CONVERSION_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      {diveResult.status && diveResult.status !== 'CONVERTED' && (
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Drop-off Reason</label>
                          <select 
                            value={diveResult.reason}
                            onChange={(e) => updateDiveField('reason', e.target.value, true)}
                            style={{ 
                              width: '100%', padding: '0.75rem', borderRadius: '0.75rem', 
                              border: '1px solid var(--card-border)', background: 'white', fontSize: '0.875rem',
                              fontWeight: 600, outline: 'none', cursor: 'pointer'
                            }}
                          >
                            <option value="">Select Reason</option>
                            {CONVERSION_REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Outreach Notes</label>
                      <textarea 
                        value={diveResult.notes}
                        onChange={(e) => updateDiveField('notes', e.target.value)}
                        placeholder="Log call details, specific needs, or follow-up timelines..."
                        style={{ 
                          width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '1rem', 
                          border: '1px solid var(--card-border)', background: 'white', fontSize: '0.875rem',
                          resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: '1.6'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        {isNotesDirty() && (
                          <button 
                            onClick={() => saveFeedbackToServer(diveResult)}
                            disabled={savingFeedback}
                            className="btn btn-primary"
                            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 700 }}
                          >
                            {savingFeedback ? 'Saving...' : 'Sync Notes to CRM'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
               </div>

               {/* Feedback History Card */}
               <div className="card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <MessageSquare size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Product Feedback Log</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {diveResult.allFeedbacks && diveResult.allFeedbacks.length > 0 ? (
                      diveResult.allFeedbacks.map((fb: any, idx: number) => (
                        <div key={idx} style={{ padding: '1.25rem', borderRadius: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', gap: '1px' }}>
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={12} fill={i < (fb.rating || 0) ? '#f59e0b' : 'none'} color={i < (fb.rating || 0) ? '#f59e0b' : '#cbd5e1'} />
                                ))}
                              </div>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                                {fb.artifactType || fb.promptKind}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                              <Clock size={12} />
                              {new Date(fb.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--foreground)', lineHeight: '1.5', fontWeight: 500 }}>
                            {fb.message || 'Rating provided without comments.'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', background: '#f8fafc', borderRadius: '1rem', border: '1px dashed #e2e8f0' }}>
                        <MessageSquare size={32} style={{ opacity: 0.1, margin: '0 auto 1rem auto' }} />
                        <div style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>No platform feedback recorded.</div>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* All-Time Content Breakdown */}
            <div className="card" style={{ padding: '2rem' }}>
               <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Content Generation Breakdown</h3>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
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
                      <div key={i} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{item.label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>{item.value}</div>
                        <div style={{ height: '4px', width: '100%', background: '#e2e8f0', borderRadius: '2px', marginTop: '0.75rem', overflow: 'hidden' }}>
                           <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '2px' }} />
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
