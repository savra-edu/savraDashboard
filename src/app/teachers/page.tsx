'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, FileText, ChevronLeft, ChevronRight, X, ArrowUpDown } from 'lucide-react';

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

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherArtifacts, setTeacherArtifacts] = useState<any[]>([]);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);

  useEffect(() => {
    fetchTeachers(page, sortValue);
  }, [page, sortValue]);

  const fetchTeachers = async (pageNum: number, sortMode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers?page=${pageNum}&sort=${sortMode}`);
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
                      <th>School</th>
                      <th>Joined</th>
                      <th>Artifacts</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>
                          <div className="teacher-info">
                            <div className="avatar" style={{ background: `hsl(${Math.random() * 360}, 70%, 90%)`, color: '#0f172a' }}>
                              {teacher.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{teacher.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.8rem' }}>{teacher.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{teacher.schoolName}</td>
                        <td>{new Date(teacher.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td>
                          <span className="badge badge-primary">{teacher.artifactCounts.total} items</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="action-btn" onClick={() => showArtifacts(teacher)}>
                            <FileText size={16} />
                            View
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
