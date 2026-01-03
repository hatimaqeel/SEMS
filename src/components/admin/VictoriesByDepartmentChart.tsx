'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  ChartTooltipContent,
  ChartContainer,
} from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface VictoryData {
  name: string;
  victories: number;
}

interface VictoriesChartProps {
  data: VictoryData[];
  isLoading: boolean;
}

export function VictoriesByDepartmentChart({ data, isLoading }: VictoriesChartProps) {
  return (
     <Card>
        <CardHeader>
            <CardTitle>Department Victories</CardTitle>
            <CardDescription>
              A chart showing which department has the most victories across all events.
            </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
            {isLoading ? (
              <div className="h-[350px] w-full p-2">
                <Skeleton className="h-full w-full" />
              </div>
            ) : !data || data.length === 0 ? (
               <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
                No victory data available yet.
              </div>
            ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <ChartContainer
                    config={{
                      victories: {
                        label: 'Victories',
                        color: 'hsl(var(--primary))',
                      },
                    }}
                  >
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                      <Bar dataKey="victories" fill="var(--color-victories)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </ResponsiveContainer>
            )}
        </CardContent>
     </Card>
  )
}
