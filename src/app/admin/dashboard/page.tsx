import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { events, venues, users, sports } from "@/lib/placeholder-data";
import { Activity, Calendar, MapPin, Users, Trophy } from "lucide-react";
import { OverviewChart } from "@/components/admin/OverviewChart";
import { StatCard } from "@/components/admin/StatCard";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
         <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
         <p className="text-muted-foreground mt-1">An overview of all activities in UniSport Central.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Events"
          value={events.length.toString()}
          icon={Calendar}
          description="Number of ongoing and upcoming events"
        />
        <StatCard 
          title="Total Venues"
          value={venues.length.toString()}
          icon={MapPin}
          description="Available venues for hosting events"
        />
         <StatCard 
          title="Registered Users"
          value={users.length.toString()}
          icon={Users}
          description="Total number of admins and students"
        />
         <StatCard 
          title="Available Sports"
          value={sports.length.toString()}
          icon={Trophy}
          description="Different sports categories available"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
         <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Events Overview</CardTitle>
            <CardDescription>
              A chart showing the number of teams in recent events.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
