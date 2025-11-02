'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  ChartTooltipContent,
  ChartTooltip,
  ChartContainer,
} from '@/components/ui/chart';
import type { Event } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface OverviewChartProps {
  events: Event[] | null;
  isLoading: boolean;
}

export function OverviewChart({ events, isLoading }: OverviewChartProps) {
  if (isLoading) {
    return (
      <div className="h-[350px] w-full p-2">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const chartData = (events || [])
    .slice(0, 5) // Take up to 5 most recent events
    .map((event) => ({
      name: event.name.split(' ')[0], // Use first word of event name
      teams: event.teams?.length || 0,
    }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ChartContainer
        config={{
          teams: {
            label: 'Teams',
            color: 'hsl(var(--primary))',
          },
        }}
      >
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            content={<ChartTooltipContent />}
          />
          <Bar dataKey="teams" fill="var(--color-teams)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </ResponsiveContainer>
  );
}
