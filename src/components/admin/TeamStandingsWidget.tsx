'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event, Team } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Standings {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  scoreDifference: number;
}

interface TeamStandingsWidgetProps {
  eventId?: string;
}

export function TeamStandingsWidget({ eventId }: TeamStandingsWidgetProps) {
  const firestore = useFirestore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventId || null);

  const eventsRef = useMemoFirebase(
    () => collection(firestore, 'events'),
    [firestore]
  );
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsRef);

  useEffect(() => {
    if (eventId) {
      setSelectedEventId(eventId);
    }
  }, [eventId]);

  const roundRobinEvents = useMemo(() => {
    return events?.filter(e => e.settings.format === 'round-robin' && e.matches.length > 0) || [];
  }, [events]);

  const standings = useMemo((): Standings[] => {
    if (!selectedEventId || !events) return [];

    const event = events.find(e => e.id === selectedEventId);
    if (!event) return [];

    const teamStandings: Record<string, Standings> = {};

    // Initialize all teams
    event.teams.forEach(team => {
      teamStandings[team.teamId] = {
        teamId: team.teamId,
        teamName: team.teamName,
        played: 0,
        wins: 0,
        losses: 0,
        points: 0,
        scoreDifference: 0,
      };
    });

    const completedMatches = event.matches.filter(m => m.status === 'completed' && m.winnerTeamId);

    completedMatches.forEach(match => {
      const winnerId = match.winnerTeamId!;
      const loserId = match.teamAId === winnerId ? match.teamBId : match.teamAId;
      
      const scoreWinner = match.teamAId === winnerId ? (match.scoreA || 0) : (match.scoreB || 0);
      const scoreLoser = match.teamAId === loserId ? (match.scoreA || 0) : (match.scoreB || 0);

      if (teamStandings[winnerId]) {
        teamStandings[winnerId].played += 1;
        teamStandings[winnerId].wins += 1;
        teamStandings[winnerId].points += 2; // 2 points for a win
        teamStandings[winnerId].scoreDifference += (scoreWinner - scoreLoser);
      }
      if (teamStandings[loserId]) {
        teamStandings[loserId].played += 1;
        teamStandings[loserId].losses += 1;
        teamStandings[loserId].scoreDifference += (scoreLoser - scoreWinner);
      }
    });

    return Object.values(teamStandings).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.scoreDifference !== a.scoreDifference) return b.scoreDifference - a.scoreDifference;
        return b.wins - a.wins;
    });
  }, [selectedEventId, events]);

  useEffect(() => {
    if (!eventId && roundRobinEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(roundRobinEvents[0].id!);
    }
  }, [roundRobinEvents, selectedEventId, eventId]);

  const allMatchesPlayed = useMemo(() => {
    if (!selectedEventId || !events) return false;
    const event = events.find(e => e.id === selectedEventId);
    return event && event.matches.length > 0 && event.matches.every(m => m.status === 'completed');
  }, [selectedEventId, events]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Standings</CardTitle>
        <CardDescription>
          View the points table for round-robin events. The team with the most points wins.
        </CardDescription>
        {!eventId && roundRobinEvents.length > 0 && (
           <Select onValueChange={setSelectedEventId} value={selectedEventId || ''}>
              <SelectTrigger className="w-full md:w-[280px] mt-4">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {roundRobinEvents.map(event => (
                  <SelectItem key={event.id!} value={event.id!}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingEvents ? (
            <div className="flex justify-center items-center h-40">
                <Loader className="animate-spin" />
            </div>
        ) : selectedEventId && standings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pos</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">P</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">SD</TableHead>
                <TableHead className="text-right">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((team, index) => {
                const isWinner = index === 0 && allMatchesPlayed && team.played > 0;
                return (
                  <TableRow key={team.teamId} className={cn(isWinner && 'bg-yellow-400/20')}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         {isWinner && <Crown className="h-5 w-5 text-yellow-500" />}
                         <span className={cn(isWinner && 'font-bold')}>{team.teamName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{team.played}</TableCell>
                    <TableCell className="text-center">{team.wins}</TableCell>
                    <TableCell className="text-center">{team.losses}</TableCell>
                    <TableCell className="text-center">{team.scoreDifference}</TableCell>
                    <TableCell className="text-right font-bold">{team.points}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
            <div className="text-center py-10 px-6 bg-muted/50 rounded-lg">
                <p className="font-semibold">No Standings to Show</p>
                <p className="text-sm text-muted-foreground mt-1">
                {roundRobinEvents.length === 0 ? 'There are no active round-robin events.' : 'Select an event to view its standings.'}
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
