'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar, MapPin, Users, Trophy } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event, Venue, User, Sport } from '@/lib/types';
import { VictoriesByDepartmentChart } from '@/components/admin/VictoriesByDepartmentChart';
import { useMemo } from 'react';
import { UpcomingMatchesWidget } from '@/components/common/UpcomingMatchesWidget';
import { RecentResultsWidget } from '@/components/common/RecentResultsWidget';
import { CalendarWidget } from '@/components/common/CalendarWidget';

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

  const victoriesData = useMemo(() => {
    if (!events) return [];

    const victoriesByDept: { [key: string]: number } = {};

    events.forEach(event => {
      // Ensure matches and teams are arrays before filtering/finding
      const completedMatches = (event.matches || []).filter(
        match => match.status === 'completed' && match.winnerTeamId
      );

      completedMatches.forEach(match => {
        const winningTeam = (event.teams || []).find(
          team => team.teamId === match.winnerTeamId
        );
        if (winningTeam && winningTeam.department) {
          victoriesByDept[winningTeam.department] =
            (victoriesByDept[winningTeam.department] || 0) + 1;
        }
      });
    });

    return Object.entries(victoriesByDept)
      .map(([name, victories]) => ({ name, victories }))
      .sort((a, b) => b.victories - a.victories);
  }, [events]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          An overview of all activities in SEMS.
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <VictoriesByDepartmentChart
              data={victoriesData}
              isLoading={isLoadingEvents}
            />
            <RecentResultsWidget />
        </div>
         <div className="lg:col-span-1 space-y-6">
            <CalendarWidget />
            <UpcomingMatchesWidget />
        </div>
      </div>
    </div>
  );
}
