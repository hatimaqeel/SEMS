'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  ChartTooltipContent,
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
  
  const barWidth = 80;
  const chartMinWidth = data ? data.length * barWidth : 0;

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
                <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                    <ResponsiveContainer width={chartMinWidth < 500 ? '100%' : chartMinWidth} height={350}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                interval={0}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                content={<ChartTooltipContent 
                                    formatter={(value) => [`${value} victories`, '']}
                                    labelClassName="font-bold"
                                    indicator='dot'
                                />}
                            />
                            <Bar dataKey="victories" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </CardContent>
     </Card>
  )
}
