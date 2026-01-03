
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts';
import {
  ChartContainer,
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
  
  const chartHeight = data ? `${data.length * 40 + 60}px` : '350px';

  return (
     <Card>
        <CardHeader>
            <CardTitle>Department Victories</CardTitle>
            <CardDescription>
              A chart showing which department has the most victories across all events.
            </CardDescription>
        </CardHeader>
        <CardContent className="pr-0">
            {isLoading ? (
              <div className="h-[350px] w-full p-2">
                <Skeleton className="h-full w-full" />
              </div>
            ) : !data || data.length === 0 ? (
               <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
                No victory data available yet.
              </div>
            ) : (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart
                      layout="vertical"
                      data={data}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={120}
                        interval={0}
                      />
                      <Tooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          content={<ChartTooltipContent 
                              formatter={(value, name) => [value, 'Victories']}
                              labelClassName="font-bold"
                              indicator='dot'
                          />}
                      />
                       <Bar dataKey="victories" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                         <LabelList dataKey="victories" position="right" offset={8} className="fill-foreground" fontSize={12} />
                       </Bar>
                    </BarChart>
                  </ResponsiveContainer>
            )}
        </CardContent>
     </Card>
  )
}
