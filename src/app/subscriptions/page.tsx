'use client';

import { useEffect, useState, Fragment } from 'react';
import { 
  Users, CreditCard, Search, Calendar, Check, 
  AlertCircle, RefreshCw, PlusCircle, ArrowUpDown, X, ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';

interface SubscribedTeacher {
  teacherId: string;
  userId: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'max';
  planBillingCycle: 'monthly' | 'annual';
  activatedOn: string | null;
  endsAt: string | null;
  schoolName: string | null;
}

interface SearchedUser {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'max';
  planBillingCycle: 'monthly' | 'annual';
  activatedOn: string | null;
}

export default function SubscriptionManagement() {
  const [teachers, setTeachers] = useState<SubscribedTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Grant subscription states
  const [emailSearch, setEmailSearch] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [grantPlan, setGrantPlan] = useState<'free' | 'pro' | 'max'>('pro');
  const [grantBilling, setGrantBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Edit plan states
  const [editingTeacher, setEditingTeacher] = useState<SubscribedTeacher | null>(null);
  const [editPlan, setEditPlan] = useState<'free' | 'pro' | 'max'>('pro');
  const [editBilling, setEditBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [editLoading, setEditLoading] = useState(false);

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
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      if (data.success) {
        setTeachers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTeachers();
  };

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSearch.trim()) return;
    
    setSearchingUsers(true);
    setSelectedUser(null);
    setGrantSuccess(false);
    try {
      const res = await fetch(`/api/subscriptions?email=${encodeURIComponent(emailSearch)}`);
      const data = await res.json();
      if (data.success) {
        setSearchedUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleGrantSubscription = async () => {
    if (!selectedUser) return;
    setGrantLoading(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          plan: grantPlan,
          billingCycle: grantBilling
        })
      });
      const data = await res.json();
      if (data.success) {
        setGrantSuccess(true);
        setSelectedUser(null);
        setEmailSearch('');
        setSearchedUsers([]);
        fetchTeachers(); // Refresh list
      } else {
        alert(data.error || 'Failed to grant subscription');
      }
    } catch (error) {
      console.error('Grant subscription error:', error);
      alert('An unexpected error occurred');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!editingTeacher) return;
    setEditLoading(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST', // Reusing the same POST endpoint for update
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingTeacher.userId,
          plan: editPlan,
          billingCycle: editBilling
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingTeacher(null);
        fetchTeachers(); // Refresh list
      } else {
        alert(data.error || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Update subscription error:', error);
      alert('An unexpected error occurred');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = (teacher: SubscribedTeacher) => {
    setEditingTeacher(teacher);
    setEditPlan(teacher.plan);
    setEditBilling(teacher.planBillingCycle === 'annual' ? 'yearly' : 'monthly');
  };

  const filteredTeachers = teachers
    .filter(t => t.plan === 'pro' || t.plan === 'max')
    .filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.schoolName && t.schoolName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case 'max': return 'badge-success';
      case 'pro': return 'badge-primary';
      default: return 'badge';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-screen">
          <div className="spinner"></div>
          <div className="text-muted font-medium">Loading subscription engine...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Subscription Manager</h1>
            <p className="page-description">Manage licenses, upgrade user tiers, and grant administrative access keys.</p>
          </div>
          <button 
            onClick={handleRefresh} 
            className="action-btn"
            style={{ borderColor: refreshing ? 'var(--primary)' : 'var(--card-border)' }}
          >
            <RefreshCw size={16} className={refreshing ? 'spinner' : ''} />
            <span>Sync DB</span>
          </button>
        </div>

        {/* Top Grid: Grant & Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Grant Subscription Card */}
          <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>
              <div className="card-title" style={{ fontSize: '1rem' }}>
                <PlusCircle size={20} style={{ color: 'var(--success)' }} />
                Provisioning Wizard
              </div>
              
              {/* Wizard Step Indicators */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                {[1, 2, 3].map((step) => (
                  <div 
                    key={step}
                    style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      background: wizardStep >= step ? 'var(--primary)' : '#e2e8f0', 
                      color: wizardStep >= step ? 'white' : 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.3s'
                    }}
                  >
                    {wizardStep > step ? <Check size={12} /> : step}
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 1: Find User */}
            {wizardStep === 1 && (
              <>
                <p className="text-muted" style={{ fontSize: '0.825rem', marginBottom: '1.25rem' }}>
                  Search for any user in the ecosystem by their primary email address.
                </p>

                <form onSubmit={handleUserSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '12px', width: '16px', color: 'var(--muted)' }} />
                    <input 
                      type="email" 
                      placeholder="teacher@school.edu"
                      value={emailSearch}
                      onChange={(e) => setEmailSearch(e.target.value)}
                      style={{ 
                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', 
                        borderRadius: '0.5rem', border: '1px solid var(--card-border)',
                        background: '#f8fafc', fontSize: '0.875rem', outline: 'none'
                      }} 
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="action-btn" 
                    disabled={searchingUsers}
                    style={{ padding: '0 1.25rem', background: 'var(--foreground)', color: 'var(--background)', border: 'none' }}
                  >
                    {searchingUsers ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {/* Search Results */}
                {searchedUsers.length > 0 && (
                  <div style={{ border: '1px solid var(--card-border)', borderRadius: '0.5rem', maxHeight: '150px', overflowY: 'auto', marginBottom: '1rem', background: '#f8fafc' }}>
                    {searchedUsers.map(user => (
                      <div 
                        key={user.id} 
                        onClick={() => {
                          setSelectedUser(user);
                          setWizardStep(2);
                          setGrantSuccess(false);
                        }}
                        style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--card-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{user.email}</div>
                        </div>
                        <span className={`badge ${getPlanBadgeClass(user.plan)}`}>{user.plan}</span>
                      </div>
                    ))}
                  </div>
                )}

                {grantSuccess && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Check size={18} />
                    Subscription updated successfully!
                  </div>
                )}
              </>
            )}

            {/* STEP 2: Choose Plan */}
            {wizardStep === 2 && selectedUser && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <p className="text-muted" style={{ fontSize: '0.825rem', marginBottom: '1rem' }}>
                  Assign commercial features and limits for <strong>{selectedUser.name}</strong>.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.375rem' }}>PLAN TYPE</label>
                    <select 
                      value={grantPlan} 
                      onChange={(e: any) => setGrantPlan(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--card-border)', background: 'white', outline: 'none', fontWeight: 500 }}
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="max">Max</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.375rem' }}>BILLING CYCLE</label>
                    <select 
                      value={grantBilling} 
                      onChange={(e: any) => setGrantBilling(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--card-border)', background: 'white', outline: 'none', fontWeight: 500 }}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button 
                    onClick={() => { setWizardStep(1); setSelectedUser(null); }} 
                    className="action-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setWizardStep(3)} 
                    className="action-btn"
                    style={{ flex: 2, justifyContent: 'center', background: 'var(--foreground)', color: 'var(--background)', border: 'none' }}
                  >
                    Review
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Confirm & Provision */}
            {wizardStep === 3 && selectedUser && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <p className="text-muted" style={{ fontSize: '0.825rem', marginBottom: '1rem' }}>
                  Review configuration variables prior to backend submission.
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid var(--card-border)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.825rem', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.5rem 1rem' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Assignee:</span>
                    <span style={{ fontWeight: 600 }}>{selectedUser.name}</span>
                    
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Email:</span>
                    <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{selectedUser.email}</span>
                    
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Tier:</span>
                    <span><span className={`badge ${getPlanBadgeClass(grantPlan)}`}>{grantPlan.toUpperCase()}</span></span>
                    
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Interval:</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{grantBilling}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button 
                    onClick={() => setWizardStep(2)} 
                    className="action-btn"
                    disabled={grantLoading}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Back
                  </button>
                  <button 
                    onClick={async () => {
                      await handleGrantSubscription();
                      setWizardStep(1);
                    }}
                    disabled={grantLoading}
                    style={{ 
                      flex: 2, padding: '0.75rem', background: 'var(--primary)', 
                      color: 'white', border: 'none', borderRadius: '0.5rem', 
                      fontWeight: 600, cursor: 'pointer', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center' 
                    }}
                  >
                    {grantLoading ? 'Provisioning...' : 'Provision Access'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="stat-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6', width: '48px', height: '48px' }}><CreditCard size={24} /></div>
              <div>
                <div className="stat-label">Pro Subscribers</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{teachers.filter(t => t.plan === 'pro').length}</div>
              </div>
            </div>
            
            <div className="stat-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981', width: '48px', height: '48px' }}><CreditCard size={24} /></div>
              <div>
                <div className="stat-label">Max Subscribers</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{teachers.filter(t => t.plan === 'max').length}</div>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="stat-icon" style={{ background: '#f1f5f9', color: 'var(--muted)', width: '48px', height: '48px' }}><Users size={24} /></div>
              <div>
                <div className="stat-label">Total Instructors</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{teachers.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Directory Table */}
        <div className="card">
          <div className="card-header" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="card-title">
              <Users size={20} />
              Active Subscriptions
            </div>
            <div style={{ position: 'relative', width: '300px', marginLeft: 'auto' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '10px', width: '16px', color: 'var(--muted)' }} />
              <input 
                type="text" 
                placeholder="Filter by name, email, school..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', 
                  borderRadius: '9999px', border: '1px solid var(--card-border)',
                  background: '#f8fafc', fontSize: '0.875rem', outline: 'none'
                }} 
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Plan</th>
                  <th>Billing Cycle</th>
                  <th>Activation Date</th>
                  <th>Renewal Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <Fragment key={teacher.teacherId}>
                    <tr>
                      <td>
                        <div className="teacher-info">
                          <div className="avatar">{teacher.name.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{teacher.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{teacher.email}</div>
                            {teacher.schoolName && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px' }}>{teacher.schoolName}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getPlanBadgeClass(teacher.plan)}`}>
                          {teacher.plan.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                          {teacher.planBillingCycle === 'annual' ? 'Yearly' : 'Monthly'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--muted)' }}>
                          <Calendar size={14} />
                          {formatDate(teacher.activatedOn)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: teacher.endsAt ? 'var(--foreground)' : 'var(--muted)', fontWeight: teacher.endsAt ? 500 : 400 }}>
                          <Calendar size={14} />
                          {teacher.plan === 'free' ? 'Lifetime' : formatDate(teacher.endsAt)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => fetchUsageData(teacher.teacherId)} 
                          className="action-btn"
                          style={{ 
                            padding: '0.375rem 0.75rem', 
                            fontSize: '0.75rem', 
                            marginRight: '0.5rem',
                            borderColor: expandedTeacherId === teacher.teacherId ? 'var(--primary)' : 'var(--card-border)' 
                          }}
                        >
                          {loadingUsage === teacher.teacherId ? 'Loading...' : 'View Usage'}
                          {expandedTeacherId === teacher.teacherId ? <ChevronUp size={12} style={{ marginLeft: '4px' }} /> : <ChevronDown size={12} style={{ marginLeft: '4px' }} />}
                        </button>
                        <button 
                          onClick={() => openEditModal(teacher)} 
                          className="action-btn"
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Modify Plan
                        </button>
                      </td>
                    </tr>
                    
                    {expandedTeacherId === teacher.teacherId && (
                      <tr>
                        <td colSpan={6} style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
                          {usageData[teacher.teacherId] ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                              {/* Usage Breakdown */}
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <BarChart3 size={16} style={{ color: 'var(--primary)' }} />
                                  Content Generation Breakdown
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {[
                                    { label: 'Worksheets', value: usageData[teacher.teacherId].breakdown.worksheets, color: 'var(--primary)' },
                                    { label: 'Quizzes', value: usageData[teacher.teacherId].breakdown.quizzes, color: '#8b5cf6' },
                                    { label: 'Question Papers', value: usageData[teacher.teacherId].breakdown.questionPapers, color: '#0ea5e9' },
                                    { label: 'Lesson Plans', value: usageData[teacher.teacherId].breakdown.lessons, color: 'var(--success)' },
                                    { label: 'Presentations', value: usageData[teacher.teacherId].breakdown.presentations, color: '#f59e0b' },
                                  ].map((item, i) => {
                                    const total = usageData[teacher.teacherId].breakdown.total;
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
                                    <AreaChart data={usageData[teacher.teacherId].chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id={`usageColor-${teacher.teacherId}`} x1="0" y1="0" x2="0" y2="1">
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
                                      <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill={`url(#usageColor-${teacher.teacherId})`} />
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
                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                      <AlertCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                      <div>No active subscriptions found matching criteria.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modify Plan Modal */}
        {editingTeacher && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <div className="modal-title">Modify Plan: {editingTeacher.name}</div>
                <button 
                  onClick={() => setEditingTeacher(null)} 
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                  Adjust the billing settings for {editingTeacher.email}. Changes apply immediately.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>PLAN TIER</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {['free', 'pro', 'max'].map((p: any) => (
                        <button
                          key={p}
                          onClick={() => setEditPlan(p)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid',
                            borderColor: editPlan === p ? 'var(--primary)' : 'var(--card-border)',
                            background: editPlan === p ? '#eff6ff' : 'white',
                            color: editPlan === p ? 'var(--primary)' : 'var(--foreground)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>BILLING INTERVAL</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {['monthly', 'yearly'].map((b: any) => (
                        <button
                          key={b}
                          onClick={() => setEditBilling(b)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid',
                            borderColor: editBilling === b ? 'var(--primary)' : 'var(--card-border)',
                            background: editBilling === b ? '#eff6ff' : 'white',
                            color: editBilling === b ? 'var(--primary)' : 'var(--foreground)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                          }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={() => setEditingTeacher(null)} 
                    className="action-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateSubscription}
                    disabled={editLoading}
                    style={{ 
                      flex: 2, padding: '0.75rem', background: 'var(--foreground)', 
                      color: 'var(--background)', border: 'none', borderRadius: '0.5rem', 
                      fontWeight: 600, cursor: 'pointer', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center' 
                    }}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
