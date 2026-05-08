'use client';

import { useEffect, useState, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Link as LinkIcon, UserPlus, Search as SearchIcon, X, ChevronUp, ChevronDown, UserCheck
} from 'lucide-react';

export default function ReferralsPage() {
  // Referral states
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralSearchEmail, setReferralSearchEmail] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [expandedReferralId, setExpandedReferralId] = useState<string | null>(null);
  const [referredUsers, setReferredUsers] = useState<Record<string, any[]>>({});
  const [loadingReferredUsers, setLoadingReferredUsers] = useState<string | null>(null);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [selectedUserForReferral, setSelectedUserForReferral] = useState<any>(null);
  const [creatingReferral, setCreatingReferral] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const fetchReferrals = async () => {
    setLoadingReferrals(true);
    try {
      const res = await fetch('/api/referrals');
      const data = await res.json();
      if (data.success) setReferrals(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const searchUsersByEmail = async () => {
    if (!referralSearchEmail.trim()) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    setUserSearchResults([]);
    setSelectedUserForReferral(null);
    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(referralSearchEmail)}`);
      const data = await res.json();
      if (data.success) {
        setUserSearchResults(data.data);
        if (data.data.length === 0) {
          alert('No teachers found with that email.');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const createReferral = async () => {
    if (!selectedUserForReferral || !newReferralCode.trim()) return;
    setCreatingReferral(true);
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForReferral.id,
          code: newReferralCode.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'Referral created successfully!' });
        setNewReferralCode('');
        setSelectedUserForReferral(null);
        setReferralSearchEmail('');
        setUserSearchResults([]);
        fetchReferrals();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to create referral' });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setCreatingReferral(false);
    }
  };

  const fetchReferredUsers = async (referralId: string) => {
    if (expandedReferralId === referralId) {
      setExpandedReferralId(null);
      return;
    }

    if (referredUsers[referralId]) {
      setExpandedReferralId(referralId);
      return;
    }

    setLoadingReferredUsers(referralId);
    setExpandedReferralId(referralId);
    try {
      const res = await fetch(`/api/referrals/${referralId}/users`);
      const data = await res.json();
      if (data.success) {
        setReferredUsers(prev => ({ ...prev, [referralId]: data.data }));
      }
    } catch (error) {
      console.error('Failed to fetch referred users:', error);
    } finally {
      setLoadingReferredUsers(null);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">Referral Program</h1>
            <p className="page-description">Manage teacher ambassadors, generate referral codes, and track onboarding metrics.</p>
          </div>
        </div>

        {statusMessage && (
          <div style={{
            padding: '1rem',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            backgroundColor: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#15803d' : '#991b1b',
            border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{statusMessage.text}</span>
            <button 
              onClick={() => setStatusMessage(null)}
              style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Referral Management Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} style={{ color: 'var(--primary)' }} />
              Assign Teacher Ambassador
            </h2>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  SEARCH TEACHER BY EMAIL
                </label>
                <div style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <SearchIcon style={{ position: 'absolute', left: '12px', top: '12px', width: '16px', color: 'var(--muted)' }} />
                    <input
                      type="text"
                      placeholder="teacher@example.com"
                      value={referralSearchEmail}
                      onChange={(e) => setReferralSearchEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchUsersByEmail();
                        }
                      }}
                      style={{
                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                        borderRadius: '0.5rem', border: '1px solid var(--card-border)',
                        background: 'var(--card-bg)', fontSize: '0.875rem', outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    onClick={searchUsersByEmail}
                    disabled={searchingUsers || !referralSearchEmail.trim()}
                    style={{
                      padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#0f172a',
                      border: '1px solid var(--card-border)', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600,
                      cursor: 'pointer', opacity: (searchingUsers || !referralSearchEmail.trim()) ? 0.6 : 1
                    }}
                  >
                    {searchingUsers ? 'Searching...' : 'Search'}
                  </button>
                </div>
                
                {userSearchResults.length > 0 && !selectedUserForReferral && (
                  <div style={{
                    position: 'absolute', width: '100%', maxWidth: '500px', background: 'white',
                    border: '1px solid var(--card-border)', borderRadius: '0.5rem', marginTop: '0.25rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {userSearchResults.map(user => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUserForReferral(user)}
                        style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{user.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedUserForReferral && (
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.5rem' }}>
                    REFERRAL CODE
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="E.g. TEACHER20"
                      value={newReferralCode}
                      onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                      style={{
                        flex: 1, padding: '0.75rem 1rem',
                        borderRadius: '0.5rem', border: '1px solid var(--card-border)',
                        background: 'white', fontSize: '0.875rem', outline: 'none'
                      }}
                    />
                    <button
                      onClick={createReferral}
                      disabled={creatingReferral || !newReferralCode.trim()}
                      style={{
                        padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white',
                        border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600,
                        cursor: 'pointer', opacity: (creatingReferral || !newReferralCode.trim()) ? 0.6 : 1
                      }}
                    >
                      {creatingReferral ? 'Creating...' : 'Assign'}
                    </button>
                    <button
                      onClick={() => setSelectedUserForReferral(null)}
                      style={{ padding: '0.75rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '0.5rem' }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {selectedUserForReferral && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', background: '#0ea5e9', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                  {selectedUserForReferral.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Assigning to {selectedUserForReferral.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>{selectedUserForReferral.email}</div>
                </div>
              </div>
            )}
          </div>

          {/* Referrals List Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LinkIcon size={20} style={{ color: 'var(--primary)' }} />
                Active Referral Codes
              </h2>
            </div>
            
            <div className="table-container">
              {loadingReferrals ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading referrals...</div>
              ) : referrals.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <LinkIcon size={48} style={{ opacity: 0.1, margin: '0 auto 1rem auto' }} />
                  <p>No referral codes assigned yet.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ambassador</th>
                      <th>Code</th>
                      <th>Total Uses</th>
                      <th>Created At</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref: any) => (
                      <Fragment key={ref.id}>
                        <tr>
                          <td>
                            <div className="teacher-info">
                              <div className="avatar" style={{ background: `hsl(${(ref.user?.name?.charCodeAt(0) * 13) % 360}, 70%, 90%)`, color: '#0f172a' }}>
                                {ref.user?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{ref.user?.name || 'Unknown'}</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>{ref.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ 
                              background: '#f1f5f9', padding: '0.25rem 0.75rem', 
                              borderRadius: '0.375rem', fontWeight: 700, fontFamily: 'monospace',
                              color: 'var(--primary)', border: '1px solid var(--card-border)'
                            }}>
                              {ref.code}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>{ref.useCount}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>successful referrals</span>
                            </div>
                          </td>
                          <td className="text-muted">
                            {new Date(ref.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => fetchReferredUsers(ref.id)}
                              className="action-btn"
                              style={{
                                borderColor: expandedReferralId === ref.id ? 'var(--primary)' : 'var(--card-border)',
                                fontSize: '0.75rem',
                                padding: '0.375rem 0.75rem'
                              }}
                            >
                              {loadingReferredUsers === ref.id ? 'Loading...' : 'View Users'}
                              {expandedReferralId === ref.id ? <ChevronUp size={14} style={{ marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
                            </button>
                          </td>
                        </tr>

                        {expandedReferralId === ref.id && (
                          <tr>
                            <td colSpan={5} style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--card-border)' }}>
                              <div style={{ background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Users Referred by {ref.code}
                                </h3>
                                
                                {referredUsers[ref.id]?.length === 0 ? (
                                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                                    No users have used this code yet.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {referredUsers[ref.id]?.map((u: any) => (
                                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                          <div style={{ width: '28px', height: '28px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600 }}>
                                            {u.name.charAt(0)}
                                          </div>
                                          <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{u.email}</div>
                                          </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
