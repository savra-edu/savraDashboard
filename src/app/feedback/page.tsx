'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MessageSquare, Star, User, Calendar, ChevronLeft, ChevronRight, X, Phone, School, GraduationCap, Search } from 'lucide-react';

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
                    <tr key={f.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{f.teacher.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>{f.teacher.schoolName}</div>
                      </td>
                      <td>{renderStars(f.rating || 0)}</td>
                      <td>
                        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                          {f.message || <span className="text-muted italic">No message provided</span>}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ textTransform: 'capitalize' }}>{f.promptKind}</span>
                      </td>
                      <td className="text-muted" style={{ fontSize: '0.875rem' }}>
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="action-btn" onClick={() => setSelectedFeedback(f)}>
                          <User size={14} />
                          User Details
                        </button>
                      </td>
                    </tr>
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
