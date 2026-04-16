'use client';

import { useEffect, useState } from 'react';
import {
  Users, BookOpen, GraduationCap, LayoutDashboard,
  ArrowUpRight, BarChart3, FileText, Globe
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';

interface Stats {
  periodTeachers: number;
  teachersToday: number;
  totalTeachersLifetime: number;
  periodArtifacts: number;
  artifactsBreakdown: {
    lessons: number;
    quizzes: number;
    assessments: number;
  };
  chartData: Array<{ date: string; count: number }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        <p className="tooltip-value">
          <span style={{ color: "var(--primary)", marginRight: "8px" }}>●</span>
          {payload[0].value} Registrations
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartDays, setChartDays] = useState(14);

  useEffect(() => {
    fetchStats(chartDays);
  }, [chartDays]);

  const fetchStats = async (days: number) => {
    try {
      const res = await fetch(`/api/stats?days=${days}`);
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!stats) return (
    <DashboardLayout>
      <div className="loading-screen" style={{ height: '80vh' }}>
        <div className="spinner"></div>
        <div className="text-muted font-medium">Loading Dashboard Metrics...</div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">Platform Overview</h1>
            <p className="page-description">Track registration metrics, feature adoption, and artifact generation across the platform.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--card-bg)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid var(--card-border)' }}>
            <button
              onClick={() => setChartDays(7)}
              style={{ border: 'none', background: chartDays === 7 ? 'white' : 'transparent', padding: '0.375rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', boxShadow: chartDays === 7 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: chartDays === 7 ? 'var(--foreground)' : 'var(--muted)' }}
            >
              7 Days
            </button>
            <button
              onClick={() => setChartDays(14)}
              style={{ border: 'none', background: chartDays === 14 ? 'white' : 'transparent', padding: '0.375rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', boxShadow: chartDays === 14 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: chartDays === 14 ? 'var(--foreground)' : 'var(--muted)' }}
            >
              14 Days
            </button>
            <button
              onClick={() => setChartDays(30)}
              style={{ border: 'none', background: chartDays === 30 ? 'white' : 'transparent', padding: '0.375rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', boxShadow: chartDays === 30 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: chartDays === 30 ? 'var(--foreground)' : 'var(--muted)' }}
            >
              30 Days
            </button>
          </div>
        </div>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Signups in Period</div>
                <div className="stat-value">{stats.periodTeachers}</div>
              </div>
              <div className="stat-icon"><Users /></div>
            </div>
            <div className="stat-trend trend-up">
              <ArrowUpRight size={16} />
              <span>Over last {chartDays} days</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Lifetime Scale</div>
                <div className="stat-value">{stats.totalTeachersLifetime}</div>
              </div>
              <div className="stat-icon" style={{ color: '#0ea5e9', background: '#e0f2fe' }}><Globe /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Total instructors all-time</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Today's Cohort</div>
                <div className="stat-value">{stats.teachersToday}</div>
              </div>
              <div className="stat-icon" style={{ color: 'var(--success)', background: '#ecfdf5' }}><GraduationCap /></div>
            </div>
            <div className="stat-trend trend-up">
              <ArrowUpRight size={16} />
              <span>+ 24h intake volume</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Volume in Period</div>
                <div className="stat-value">{stats.periodArtifacts}</div>
              </div>
              <div className="stat-icon" style={{ color: '#8b5cf6', background: '#ede9fe' }}><FileText /></div>
            </div>
            <div className="stat-trend" style={{ color: 'var(--muted)' }}>
              <span>Artifacts past {chartDays} days</span>
            </div>
          </div>
        </section>

        <div className="chart-grid">
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <BarChart3 size={20} />
                Acquisition Timeline
              </div>
            </div>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    minTickGap={maxGapForLabels(chartDays)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "var(--primary)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <BookOpen size={20} />
                Period Generation Breakdown
              </div>
            </div>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Proportional split of exactly what users produced across the last {chartDays} days.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <ProgressBar
                label="Lessons"
                value={stats.artifactsBreakdown.lessons}
                total={stats.periodArtifacts}
                color="var(--primary)"
              />
              <ProgressBar
                label="Quizzes"
                value={stats.artifactsBreakdown.quizzes}
                total={stats.periodArtifacts}
                color="#8b5cf6"
              />
              <ProgressBar
                label="Assessments"
                value={stats.artifactsBreakdown.assessments}
                total={stats.periodArtifacts}
                color="#10b981"
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function maxGapForLabels(days: number) {
  if (days <= 7) return 0;
  if (days <= 14) return 2;
  return 30;
}

function ProgressBar({ label, value, total, color }: { label: string, value: number, total: number, color?: string }) {
  const percentage = total === 0 ? 0 : (value / total) * 100;
  return (
    <div className="progress-bar-container">
      <div className="progress-label">
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
          {value} <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '0.25rem' }}>({percentage.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percentage}%`, backgroundColor: color || 'var(--primary)' }}></div>
      </div>
    </div>
  );
}
