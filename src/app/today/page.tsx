'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, FileText, Zap, Clock, List, Filter } from 'lucide-react';

interface TodayTeacher {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  createdAt: string;
  isNewToday: boolean;
  generatedToday: boolean;
  totalArtifacts: number;
}

interface TodayStats {
  newTeachersToday: number;
  totalArtifactsToday: number;
  lessonsToday: number;
  quizzesToday: number;
  assessmentsToday: number;
  activeUsersToday: number;
  teachersList: TodayTeacher[];
}

export default function TodayPage() {
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'new' | 'returning'>('all');

  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        const res = await fetch(`/api/today`);
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTodayStats();
  }, []);

  if (!stats) return (
    <DashboardLayout>
      <div className="loading-screen" style={{ height: '80vh' }}>
        <div className="spinner"></div>
        <div className="text-muted font-medium">Loading metrics...</div>
      </div>
    </DashboardLayout>
  );

  // Derive strictly filtered array
  const activeDirectory = stats.teachersList.filter(t => {
    if (filterMode === 'new') return t.isNewToday;
    if (filterMode === 'returning') return t.generatedToday && !t.isNewToday;
    return true; // 'all'
  });

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <h1 className="page-title">Today's Pulse</h1>
          <p className="page-description">
            Objective metrics covering registration volume, generating user scale, and raw artifact distribution strictly occurring today.
          </p>
        </div>

        {/* Core Metrics Row */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Active Users</div>
                <div className="stat-value">{stats.activeUsersToday}</div>
              </div>
              <div className="stat-icon"><Zap /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Unique users generating currently</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">New Accounts</div>
                <div className="stat-value">{stats.newTeachersToday}</div>
              </div>
              <div className="stat-icon"><Clock /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Registrations created today</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Total Volume</div>
                <div className="stat-value">{stats.totalArtifactsToday}</div>
              </div>
              <div className="stat-icon"><FileText /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Items generated today</span>
            </div>
          </div>
        </section>

        {/* Generation Volume Row */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
          <div className="card-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', marginBottom: 0 }}>
            <div className="card-title">
              <List size={20} />
              Item Distribution
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', background: 'var(--card-bg)' }}>
            <div style={{ borderRight: '1px solid var(--card-border)', padding: '2rem' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Lessons</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.lessonsToday}</div>
            </div>
            <div style={{ borderRight: '1px solid var(--card-border)', padding: '2rem' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Quizzes</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.quizzesToday}</div>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Assessments</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--foreground)' }}>{stats.assessmentsToday}</div>
            </div>
          </div>
        </div>

        {/* Tabular Teachers List Array */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={20} />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Live Teacher Cohort</h2>
              <div className="badge">{activeDirectory.length} showing</div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem' }}>
              <button
                onClick={() => setFilterMode('all')}
                style={{ border: 'none', background: filterMode === 'all' ? 'white' : 'transparent', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: filterMode === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: filterMode === 'all' ? 'var(--foreground)' : 'var(--muted)' }}
              >
                All Context
              </button>
              <button
                onClick={() => setFilterMode('new')}
                style={{ border: 'none', background: filterMode === 'new' ? 'white' : 'transparent', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: filterMode === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: filterMode === 'new' ? 'var(--foreground)' : 'var(--muted)' }}
              >
                New Signups
              </button>
              <button
                onClick={() => setFilterMode('returning')}
                style={{ border: 'none', background: filterMode === 'returning' ? 'white' : 'transparent', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: filterMode === 'returning' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: filterMode === 'returning' ? 'var(--foreground)' : 'var(--muted)' }}
              >
                Returning Actives
              </button>
            </div>
          </div>

          <div className="table-container">
            {activeDirectory.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>No instructor activity matches the selected filter status.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>School</th>
                    <th>Joined</th>
                    <th>Today's Status</th>
                    <th style={{ textAlign: 'right' }}>Lifetime Artifacts</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDirectory.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {teacher.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{teacher.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{teacher.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{teacher.schoolName}</td>
                      <td>{new Date(teacher.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {teacher.isNewToday && (
                            <span className="badge badge-success" style={{ fontWeight: 600 }}>New Signup</span>
                          )}
                          {teacher.generatedToday && !teacher.isNewToday && (
                            <span className="badge badge-primary" style={{ fontWeight: 600, background: '#eff6ff', color: 'var(--primary)' }}>Returning Action</span>
                          )}
                          {teacher.generatedToday && teacher.isNewToday && (
                            <span className="badge badge-primary" style={{ fontWeight: 600, background: '#eff6ff', color: 'var(--primary)' }}>Generated Day-1</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 600 }}>{teacher.totalArtifacts}</span>
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
