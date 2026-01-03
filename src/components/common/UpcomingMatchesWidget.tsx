'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event, Match, Team, Venue, Sport } from '@/lib/types';
import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  AlertCircle,
  Calendar,
  Clock,
  Loader,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isToday, isFuture, parseISO } from 'date-fns';

interface EnrichedMatch extends Match {
  eventName: string;
  sportType: string;
  teamA: Team | null;
  teamB: Team | null;
  venue: Venue | null;
}

const getSportIcon = (sportType: string) => {
  // In a real app, you might have a mapping of sports to icons
  // For now, we'll use a generic one
  return <Trophy className="h-4 w-4 text-muted-foreground" />;
};

export function UpcomingMatchesWidget() {
  const firestore = useFirestore();

  const eventsRef = useMemoFirebase(
    () => collection(firestore, 'events'),
    [firestore]
  );
  const venuesRef = useMemoFirebase(
    () => collection(firestore, 'venues'),
    [firestore]
  );

  const { data: events, isLoading: isLoadingEvents } =
    useCollection<Event>(eventsRef);
  const { data: venues, isLoading: isLoadingVenues } =
    useCollection<Venue>(venuesRef);

  const upcomingMatches = useMemo((): EnrichedMatch[] => {
    if (!events || !venues) return [];

    const allMatches: EnrichedMatch[] = [];

    events.forEach((event) => {
      if (event.status !== 'ongoing' && event.status !== 'upcoming') return;

      const getTeamById = (teamId: string): Team | null => {
        return event.teams.find((t) => t.teamId === teamId) || null;
      };

      event.matches.forEach((match) => {
        const matchTime = parseISO(match.startTime);
        if (
          match.status === 'scheduled' &&
          (isToday(matchTime) || isFuture(matchTime))
        ) {
          allMatches.push({
            ...match,
            eventName: event.name,
            sportType: event.sportType,
            teamA: getTeamById(match.teamAId),
            teamB: getTeamById(match.teamBId),
            venue: venues.find((v) => v.id === match.venueId) || null,
          });
        }
      });
    });

    return allMatches
      .sort(
        (a, b) =>
          parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
      )
      .slice(0, 5); // Limit to the next 5 matches
  }, [events, venues]);

  const isLoading = isLoadingEvents || isLoadingVenues;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Matches</CardTitle>
        <CardDescription>
          A look at the next scheduled matches across all events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader className="animate-spin" />
          </div>
        ) : upcomingMatches.length > 0 ? (
          <div className="space-y-4">
            {upcomingMatches.map((match) => (
              <div
                key={match.matchId}
                className="p-3 rounded-lg border bg-muted/40"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-card-foreground">
                      {match.teamA?.teamName || 'TBD'} vs{' '}
                      {match.teamB?.teamName || 'TBD'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.eventName}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getSportIcon(match.sportType)}
                    <span>{match.sportType}</span>
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center">
                    <Calendar className="mr-1.5 h-3 w-3" />
                    {parseISO(match.startTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1.5 h-3 w-3" />
                    {parseISO(match.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="mr-1.5 h-3 w-3" />
                    {match.venue?.name || 'TBD'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-6 bg-muted/50 rounded-lg">
            <p className="font-semibold">No Upcoming Matches</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for the schedule.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
