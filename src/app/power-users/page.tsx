'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Zap, Trophy, BookOpen, PenTool, ClipboardCheck, Phone, School, GraduationCap, Calendar } from 'lucide-react';

interface PowerUser {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  phone: string | null;
  grade: string;
  lastActiveAt: string;
  artifactCounts: {
    lessons: number;
    quizzes: number;
    assessments: number;
    total: number;
  };
}

export default function PowerUsersPage() {
  const [users, setUsers] = useState<PowerUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPowerUsers();
  }, []);

  const fetchPowerUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/power-users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Power Users</h1>
            <p className="page-description">The top 50 most active instructors based on lifetime artifact generation.</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', padding: '0.75rem 1.25rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #fbbf24' }}>
            <Trophy color="#b45309" size={24} />
            <span style={{ fontWeight: 700, color: '#92400e' }}>Leaderboard</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ height: '60vh' }}>
            <div className="spinner"></div>
            <div className="text-muted font-medium">Identifying top performers...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <Zap size={48} style={{ color: 'var(--muted)', opacity: 0.2, margin: '0 auto 1.5rem auto' }} />
            <p className="text-muted">No power users identified yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {users.map((user, index) => (
              <div key={user.id} className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                {index < 3 && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '40px', height: '40px', background: index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : '#d97706', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.75rem', transform: 'rotate(15deg)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    #{index + 1}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{user.name}</h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>{user.email}</p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                         <Phone size={12} /> {user.phone || '—'}
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                         <GraduationCap size={12} /> {user.grade}
                       </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Lessons</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{user.artifactCounts.lessons}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Quizzes</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{user.artifactCounts.quizzes}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Assmt</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{user.artifactCounts.assessments}</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--primary)', borderRadius: '0.5rem', color: 'white', padding: '0.25rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{user.artifactCounts.total}</div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <School size={14} />
                    {user.schoolName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <Clock size={14} />
                    Active {new Date(user.lastActiveAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
