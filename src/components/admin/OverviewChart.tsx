"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { events } from "@/lib/placeholder-data"
import { ChartTooltipContent, ChartTooltip, ChartContainer } from "@/components/ui/chart"

const chartData = events.slice(0, 5).map(event => ({
  name: event.name.split(" ")[0],
  teams: event.teams.length,
}));

export function OverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ChartContainer
        config={{
          teams: {
            label: "Teams",
            color: "hsl(var(--primary))",
          },
        }}
      >
        <BarChart data={chartData}>
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
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={<ChartTooltipContent />}
          />
          <Bar dataKey="teams" fill="var(--color-teams)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </ResponsiveContainer>
  )
}
