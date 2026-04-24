'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, AlertTriangle, Clock, Mail } from 'lucide-react';

interface InactiveTeacher {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  createdAt: string;
  lastActiveAt: string | null;
}

export default function InactivePage() {
  const [teachers, setTeachers] = useState<InactiveTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInactiveTeachers();
  }, []);

  const fetchInactiveTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inactive');
      const data = await res.json();
      if (data.success) {
        setTeachers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysSinceLastActive = (date: string | null) => {
    if (!date) return 'Never';
    const diff = new Date().getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 3600 * 24)) + ' days ago';
  };

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">Inactive Users</h1>
          <p className="page-description">Teachers who haven't generated any content in the last 14 days.</p>
        </div>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Inactive Teachers</div>
                <div className="stat-value">{teachers.length}</div>
              </div>
              <div className="stat-icon" style={{ color: 'var(--danger)', background: '#fef2f2' }}><AlertTriangle /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Requiring re-engagement</span>
            </div>
          </div>
        </section>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Scanning records...</div>
            ) : teachers.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--success)' }}>Everyone has been active recently! ✨</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Phone</th>
                    <th>School</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher: any) => (
                    <tr key={teacher.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{teacher.name}</span>
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>{teacher.email}</span>
                        </div>
                      </td>
                      <td className="text-muted">{teacher.phoneNumber || '—'}</td>
                      <td>{teacher.schoolName}</td>
                      <td>{new Date(teacher.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={14} className="text-muted" />
                          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                            {getDaysSinceLastActive(teacher.lastActiveAt)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
