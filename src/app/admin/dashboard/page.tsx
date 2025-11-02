
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Activity, Calendar, MapPin, Users, Trophy } from 'lucide-react';
import { OverviewChart } from '@/components/admin/OverviewChart';
import { StatCard } from '@/components/admin/StatCard';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event, Venue, User, Sport } from '@/lib/types';

export default function DashboardPage() {
  const firestore = useFirestore();

  const eventsRef = useMemoFirebase(
    () => collection(firestore, 'events'),
    [firestore]
  );
  const venuesRef = useMemoFirebase(
    () => collection(firestore, 'venues'),
    [firestore]
  );
  const usersRef = useMemoFirebase(
    () => collection(firestore, 'users'),
    [firestore]
  );
  const sportsRef = useMemoFirebase(
    () => collection(firestore, 'sports'),
    [firestore]
  );

  const { data: events, isLoading: isLoadingEvents } =
    useCollection<Event>(eventsRef);
  const { data: venues, isLoading: isLoadingVenues } =
    useCollection<Venue>(venuesRef);
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<User>(usersRef);
  const { data: sports, isLoading: isLoadingSports } =
    useCollection<Sport>(sportsRef);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          An overview of all activities in UniSport Central.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Events"
          value={isLoadingEvents ? '...' : (events?.length || 0).toString()}
          icon={Calendar}
          description="Number of ongoing and upcoming events"
        />
        <StatCard
          title="Total Venues"
          value={isLoadingVenues ? '...' : (venues?.length || 0).toString()}
          icon={MapPin}
          description="Available venues for hosting events"
        />
        <StatCard
          title="Registered Users"
          value={isLoadingUsers ? '...' : (users?.length || 0).toString()}
          icon={Users}
          description="Total number of admins and students"
        />
        <StatCard
          title="Available Sports"
          value={isLoadingSports ? '...' : (sports?.length || 0).toString()}
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
            <OverviewChart events={events} isLoading={isLoadingEvents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
