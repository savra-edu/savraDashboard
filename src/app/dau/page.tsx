'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Calendar, Users } from 'lucide-react';

interface DauStats {
  averageDau: number;
  uniqueActiveTeachers: number;
  chartData: Array<{ date: string, dau: number }>;
  startDate: string;
  endDate: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</p>
        <p className="tooltip-value">
          <span style={{ color: "var(--primary)", marginRight: "8px" }}>●</span>
          {payload[0].value} Active Users
        </p>
      </div>
    );
  }
  return null;
};

export default function DauPage() {
  const [stats, setStats] = useState<DauStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Default to Last 30 Days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchDauStats(startDate, endDate);
  }, [startDate, endDate]);

  const fetchDauStats = async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dau?start=${start}&end=${end}`);
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
            <h1 className="page-title">Daily Active Users</h1>
            <p className="page-description">Number of unique teachers generating at least one artifact per day.</p>
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
            <div className="text-muted font-medium">Computing DAU Data...</div>
          </div>
        ) : (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Average DAU</div>
                    <div className="stat-value">{stats.averageDau.toFixed(1)}</div>
                  </div>
                  <div className="stat-icon" style={{ color: 'var(--primary)', background: '#eff6ff' }}><Zap /></div>
                </div>
                <div className="stat-trend" style={{ color: 'var(--muted)' }}>
                  <span>In selected period</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Unique Active Users</div>
                    <div className="stat-value">{stats.uniqueActiveTeachers}</div>
                  </div>
                  <div className="stat-icon" style={{ color: 'var(--success)', background: '#ecfdf5' }}><Users /></div>
                </div>
                <div className="stat-trend trend-up">
                  <span>Distinct users active across period</span>
                </div>
              </div>
            </section>

            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Zap size={20} />
                  DAU Timeline
                </div>
              </div>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Daily unique artifact-generating users.
              </p>
              <div style={{ height: '400px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
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
                      dataKey="dau" 
                      stroke="var(--primary)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorDau)" 
                      activeDot={{ r: 6, strokeWidth: 0, fill: "var(--primary)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
