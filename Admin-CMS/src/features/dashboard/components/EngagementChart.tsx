/**
 * Engagement trends chart component using Recharts
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/shared/components';
import { TrendingUp } from 'lucide-react';
import type { TimeSeriesDataPoint } from '@/shared/types';

interface EngagementChartProps {
  data: TimeSeriesDataPoint[];
  isLoading?: boolean;
}

const COLORS = {
  quizzes: '#0ea5e9',
  articles: '#8b5cf6',
  webinars: '#f97316',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 capitalize">{entry.name}:</span>
            <span className="font-medium">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function EngagementChart({ data, isLoading }: EngagementChartProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Engagement Trends</h2>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </Card>
    );
  }

  // Transform data for the chart
  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    quizzes: Number(item.quizzes) || 0,
    articles: Number(item.articles) || 0,
    webinars: Number(item.webinars) || 0,
    total: Number(item.value),
  }));

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Engagement Trends</h2>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {Object.entries(COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-600 capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {Object.entries(COLORS).map(([key, color]) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            {Object.entries(COLORS).map(([key, color]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${key})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-sky-600">
              {chartData.reduce((sum, d) => sum + d.quizzes, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Quizzes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-violet-600">
              {chartData.reduce((sum, d) => sum + d.articles, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Articles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {chartData.reduce((sum, d) => sum + d.webinars, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Webinars</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default EngagementChart;
