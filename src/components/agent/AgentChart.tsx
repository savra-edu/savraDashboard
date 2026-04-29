'use client';

import type { AgentChartSpec } from './agentChartTypes';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const SERIES_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#db2777'];

function num(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export function AgentChart({ spec }: { spec: AgentChartSpec }) {
  if (spec.type === 'pie') {
    const rows = spec.data.map((row) => ({
      name: str(row[spec.nameKey]),
      value: num(row[spec.valueKey]) ?? 0,
    }));
    return (
      <figure className="agent-chart-block">
        {spec.title ? <figcaption className="agent-chart-title">{spec.title}</figcaption> : null}
        <div className="agent-chart-inner">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} paddingAngle={2}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </figure>
    );
  }

  const { categoryKey, valueKeys, data, title } = spec;
  const chartData = data.map((row) => {
    const point: Record<string, string | number> = {
      [categoryKey]: str(row[categoryKey]),
    };
    for (const k of valueKeys) {
      const n = num(row[k]);
      point[k] = n ?? 0;
    }
    return point;
  });

  const ChartBody =
    spec.type === 'bar' ? (
      <>
        {valueKeys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            name={spec.valueLabels?.[k] ?? k}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </>
    ) : spec.type === 'line' ? (
      <>
        {valueKeys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            name={spec.valueLabels?.[k] ?? k}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </>
    ) : (
      <>
        {valueKeys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            name={spec.valueLabels?.[k] ?? k}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            fillOpacity={0.12}
            strokeWidth={2}
          />
        ))}
      </>
    );

  const ChartCmp = spec.type === 'bar' ? BarChart : spec.type === 'line' ? LineChart : AreaChart;

  return (
    <figure className="agent-chart-block">
      {title ? <figcaption className="agent-chart-title">{title}</figcaption> : null}
      <div className="agent-chart-inner">
        <ResponsiveContainer width="100%" height={320}>
          <ChartCmp data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey={categoryKey} tick={{ fontSize: 12, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                fontSize: '0.8125rem',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
            {ChartBody}
          </ChartCmp>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function tryParseChartSpec(json: string): AgentChartSpec | null {
  try {
    const raw = JSON.parse(json.trim()) as Record<string, unknown>;
    const t = raw.type;
    if (t === 'pie') {
      if (!Array.isArray(raw.data) || typeof raw.nameKey !== 'string' || typeof raw.valueKey !== 'string') return null;
      return {
        type: 'pie',
        title: typeof raw.title === 'string' ? raw.title : undefined,
        data: raw.data as Record<string, unknown>[],
        nameKey: raw.nameKey,
        valueKey: raw.valueKey,
      };
    }
    if (t === 'bar' || t === 'line' || t === 'area') {
      if (!Array.isArray(raw.data) || typeof raw.categoryKey !== 'string' || !Array.isArray(raw.valueKeys)) return null;
      const vk = raw.valueKeys.filter((x): x is string => typeof x === 'string');
      if (vk.length === 0) return null;
      const vl = raw.valueLabels;
      return {
        type: t,
        title: typeof raw.title === 'string' ? raw.title : undefined,
        data: raw.data as Record<string, unknown>[],
        categoryKey: raw.categoryKey,
        valueKeys: vk,
        valueLabels:
          vl && typeof vl === 'object' && vl !== null && !Array.isArray(vl)
            ? (vl as Record<string, string>)
            : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
