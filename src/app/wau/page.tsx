'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Calendar, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface WauStats {
  currentWau: number;
  growth: number;
  chartData: Array<{ date: string, wau: number }>;
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
          {payload[0].value} Weekly Active Users
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>Unique users in previous 7 days</p>
      </div>
    );
  }
  return null;
};

export default function WauPage() {
  const [stats, setStats] = useState<WauStats | null>(null);
  const [loading, setLoading] = useState(true);

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
    fetchWauStats(startDate, endDate);
  }, [startDate, endDate]);

  const fetchWauStats = async (start: string, end: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wau?start=${start}&end=${end}`);
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
            <h1 className="page-title">Weekly Active Users (WAU)</h1>
            <p className="page-description">Number of unique teachers who generated at least one artifact in the preceding 7-day window.</p>
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
            <div className="text-muted font-medium">Computing WAU Data...</div>
          </div>
        ) : (
          <>
            <section className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="stat-card">
                <div className="stat-header">
                  <div>
                    <div className="stat-label">Current WAU</div>
                    <div className="stat-value">{stats.currentWau}</div>
                  </div>
                  <div className="stat-icon" style={{ color: 'var(--primary)', background: '#eff6ff' }}><Activity /></div>
                </div>
                <div className={`stat-trend ${stats.growth >= 0 ? 'trend-up' : 'trend-down'}`}>
                  {stats.growth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  <span>{Math.abs(stats.growth).toFixed(1)}% vs last week</span>
                </div>
              </div>
            </section>

            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Activity size={20} />
                  WAU Rolling Timeline
                </div>
              </div>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                7-day rolling window of unique active users.
              </p>
              <div style={{ height: '400px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWau" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="wau" 
                      stroke="var(--primary)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorWau)" 
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
