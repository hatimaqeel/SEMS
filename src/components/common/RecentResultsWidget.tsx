'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event, Match, Team } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { parseISO, differenceInMinutes, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnrichedMatch extends Match {
  eventName: string;
  teamA: Team | null;
  teamB: Team | null;
}

const getSportIcon = (sportType: string) => {
  return <Trophy className="h-4 w-4 text-muted-foreground" />;
};

export function RecentResultsWidget() {
  const firestore = useFirestore();
  const [currentTime, setCurrentTime] = useState(new Date());

  const eventsRef = useMemoFirebase(
    () => collection(firestore, 'events'),
    [firestore]
  );
  const { data: events, isLoading: isLoadingEvents } =
    useCollection<Event>(eventsRef);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const processedMatches = useMemo((): EnrichedMatch[] => {
    if (!events) return [];

    const allMatches: EnrichedMatch[] = [];

    events.forEach((event) => {
      const getTeamById = (teamId: string): Team | null => {
        return event.teams.find((t) => t.teamId === teamId) || null;
      };

      event.matches.forEach((match) => {
        if (!match.startTime || !match.endTime) return;
        
        try {
          const startTime = parseISO(match.startTime);
          const endTime = parseISO(match.endTime);
          const isLive =
            match.status === 'scheduled' &&
            startTime <= currentTime &&
            currentTime <= endTime;

          if (match.status === 'completed' || isLive) {
            allMatches.push({
              ...match,
              status: isLive ? 'live' : match.status,
              eventName: event.name,
              teamA: getTeamById(match.teamAId),
              teamB: getTeamById(match.teamBId),
            });
          }
        } catch (e) {
            // Ignore matches with invalid date strings
        }
      });
    });

    return allMatches
      .sort((a, b) => {
        // Sort live matches to the top, then by time
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (a.status !== 'live' && b.status === 'live') return 1;
        try {
            return (
              parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime()
            );
        } catch {
            return 0;
        }
      })
      .slice(0, 5);
  }, [events, currentTime]);

  const isLoading = isLoadingEvents;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live & Recent Results</CardTitle>
        <CardDescription>
          Latest match results and live updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader className="animate-spin" />
          </div>
        ) : processedMatches.length > 0 ? (
          <div className="space-y-4">
            {processedMatches.map((match) => {
                const isTeamAWinner = match.winnerTeamId === match.teamA?.teamId;
                const isTeamBWinner = match.winnerTeamId === match.teamB?.teamId;
                
                let elapsedMinutes = 0;
                try {
                    elapsedMinutes = differenceInMinutes(currentTime, parseISO(match.startTime));
                } catch {}


                return (
                    <div key={match.matchId} className="p-3 rounded-lg border bg-card/80">
                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                             <div className="flex items-center gap-1">
                                {getSportIcon(match.sportType)}
                                <span>{match.sportType}</span>
                            </div>
                            {match.status === 'live' ? (
                                <Badge variant="destructive" className="flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                    </span>
                                    Live
                                </Badge>
                            ) : (
                                <span>{formatDistanceToNow(parseISO(match.endTime), { addSuffix: true })}</span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className={cn("font-medium", isTeamAWinner && "text-primary font-bold")}>{match.teamA?.teamName || 'TBD'}</span>
                                <span className={cn("font-bold", isTeamAWinner && "text-primary")}>{match.scoreA ?? '-'}</span>
                            </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className={cn("font-medium", isTeamBWinner && "text-primary font-bold")}>{match.teamB?.teamName || 'TBD'}</span>
                                <span className={cn("font-bold", isTeamBWinner && "text-primary")}>{match.scoreB ?? '-'}</span>
                            </div>
                        </div>
                        {match.status === 'live' && (
                             <div className="text-center text-xs text-destructive font-semibold mt-2">
                                {elapsedMinutes > 0 ? `${elapsedMinutes}'` : "Starting soon"}
                            </div>
                        )}
                    </div>
                )
            })}
          </div>
        ) : (
          <div className="text-center py-10 px-6 bg-muted/50 rounded-lg">
            <p className="font-semibold">No Live or Recent Matches</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back when a match is in progress.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    