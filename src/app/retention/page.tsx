'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, ShieldCheck, Clock, Layers, Calendar, Users } from 'lucide-react';

interface RetentionStats {
  totalCohort: number;
  retainedCount: number;
  retentionRate: number;
  frequencyData: Array<{ range: string, users: number }>;
  chartData: Array<{ date: string, newUsers: number, retainedUsers: number }>;
  startDate: string;
  endDate: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">Cohort signed up: {new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="tooltip-value" style={{ margin: '0.25rem 0' }}>
            <span style={{ color: entry.color, marginRight: "8px" }}>●</span>
            {entry.value} {entry.name === 'newUsers' ? 'Total Cohort' : 'Retained Users'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">Total Artifacts Range: {label}</p>
        <p className="tooltip-value">
          <span style={{ color: "var(--success)", marginRight: "8px" }}>●</span>
          {payload[0].value} Users in Cohort
        </p>
      </div>
    );
  }
  return null;
};

export default function RetentionPage() {
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Default to YTD
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchRetentionStats(startDate, endDate);
  }, [startDate, endDate]);

  const fetchRetentionStats = async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/retention?start=${start}&end=${end}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
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
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Cohort Retention</h1>
            <p className="page-description">See how many users are coming back to generate content after signup.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--card-border)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <Calendar size={18} style={{ color: 'var(--muted)' }} />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--foreground)', fontSize: '0.875rem', cursor: 'pointer' }}
            />
            <span style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0.25rem' }}>to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--foreground)', fontSize: '0.875rem', cursor: 'pointer' }}
            />
          </div>
        </div>

        {!stats || loading ? (
          <div className="loading-screen" style={{ height: '60vh', background: 'transparent' }}>
            <div className="spinner"></div>
            <div className="text-muted font-medium">Computing Cohort Data...</div>
          </div>
        ) : (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Total Cohort</div>
                    <div className="stat-value">{stats.totalCohort}</div>
                  </div>
                  <div className="stat-icon"><Users /></div>
                </div>
                <div className="stat-trend" style={{ color: 'var(--muted)' }}>
                  <span>Signed up in selected period</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Retained Users</div>
                    <div className="stat-value">{stats.retainedCount}</div>
                  </div>
                  <div className="stat-icon" style={{ color: 'var(--primary)', background: '#eff6ff' }}><Activity /></div>
                </div>
                <div className="stat-trend" style={{ color: 'var(--muted)' }}>
                  <span>Generated post-signup</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Retention Rate</div>
                    <div className="stat-value">{stats.retentionRate.toFixed(1)}%</div>
                  </div>
                  <div className="stat-icon" style={{ color: 'var(--success)', background: '#ecfdf5' }}><ShieldCheck /></div>
                </div>
                <div className="stat-trend trend-up">
                  <span>Of cohort selected</span>
                </div>
              </div>
            </section>

            <div className="chart-grid">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Clock size={20} />
                    Cohort Overview by Day
                  </div>
                </div>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Comparing daily signup volume to the number of users who actually returned later.
                </p>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--muted)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--muted)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRetained" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: 'var(--muted)', fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        minTickGap={30}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: 'var(--muted)', fontSize: 12 }} 
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="newUsers" 
                        stroke="var(--muted)" 
                        fill="url(#colorNew)" 
                        fillOpacity={1}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="retainedUsers" 
                        stroke="var(--primary)" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRetained)" 
                        activeDot={{ r: 6, strokeWidth: 0, fill: "var(--primary)" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <Layers size={20} />
                    Total Volume
                  </div>
                </div>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Artifacts generated in total by this cohort
                </p>
                <div style={{ height: '240px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.frequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                      <XAxis 
                        dataKey="range" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: 'var(--muted)', fontSize: 12 }} 
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                      <Bar dataKey="users" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
