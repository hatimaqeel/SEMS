
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Event, Bracket as BracketType, Match, Team, Venue } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Loader, Trophy, Users, Calendar, Clock } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState }from 'react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type BracketMatch = Match & {
  teamA?: Team;
  teamB?: Team;
};

const BracketMatch = ({ match, onSelectWinner }: { match: BracketMatch, onSelectWinner: (match: BracketMatch, winner: Team) => void; }) => {
  const winner = match.winnerTeamId ? (match.winnerTeamId === match.teamA?.teamId ? match.teamA : match.teamB) : null;
  const isComplete = match.status === 'completed';

  return (
    <div className="flex flex-col gap-2 p-3 bg-card border rounded-lg shadow-sm w-48 min-h-[100px] justify-center">
      <div className={cn("flex items-center justify-between p-2 rounded", winner && winner.teamId === match.teamA?.teamId && 'bg-green-500/20')}>
        <span className="text-sm font-medium truncate">{match.teamA?.teamName || 'TBD'}</span>
        {match.teamA && !isComplete && <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => onSelectWinner(match, match.teamA!)}>Win</Button>}
      </div>
      <div className="h-px bg-border" />
      <div className={cn("flex items-center justify-between p-2 rounded", winner && winner.teamId === match.teamB?.teamId && 'bg-green-500/20')}>
        <span className="text-sm font-medium truncate">{match.teamB?.teamName || 'TBD'}</span>
        {match.teamB && !isComplete && <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => onSelectWinner(match, match.teamB!)}>Win</Button>}
      </div>
    </div>
  );
};


const BracketRound = ({
  roundName,
  matches,
  onSelectWinner,
}: {
  roundName: string;
  matches: BracketMatch[];
  onSelectWinner: (match: BracketMatch, winner: Team) => void;
}) => (
  <div className="flex flex-col items-center gap-8">
    <h3 className="text-lg font-semibold text-foreground tracking-wide">{roundName}</h3>
    <div className="flex flex-col gap-10">
      {matches.map((match, index) => (
        <BracketMatch key={match?.matchId || index} match={match} onSelectWinner={onSelectWinner} />
      ))}
    </div>
  </div>
);

export default function BracketPage() {
  const { eventId } = useParams() as { eventId: string };
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedMatch, setSelectedMatch] = useState<{match: BracketMatch, winner: Team} | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const eventRef = useMemoFirebase(
    () => doc(firestore, 'events', eventId),
    [firestore, eventId]
  );
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);
  
  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);
  
  const bracketRef = useMemoFirebase(
    () => doc(firestore, 'brackets', eventId),
    [firestore, eventId]
  );
  const { data: bracket, isLoading: isLoadingBracket } = useDoc<BracketType>(bracketRef);

  const handleSelectWinner = (match: BracketMatch, winner: Team) => {
    setSelectedMatch({ match, winner });
    setIsAlertOpen(true);
  };
  
  const confirmWinner = async () => {
    if (!selectedMatch || !event) return;
    
    const {match, winner} = selectedMatch;
    let eventDocRef = doc(firestore, 'events', eventId);

    // 1. Update the match winner in the event document
    let updatedMatches = event.matches.map(m =>
      m.matchId === match.matchId
        ? { ...m, winnerTeamId: winner.teamId, status: 'completed' as const }
        : m
    );
    await updateDocumentNonBlocking(eventDocRef, { matches: updatedMatches });
    
    // 2. For knockout, find the next round and the next match for the winner
    if(event.settings.format === 'knockout' && bracket) {
      const currentRoundIndex = bracket.rounds.findIndex(r => r.matches.includes(match.matchId)) ?? -1;
      const nextRoundIndex = currentRoundIndex + 1;

      if (nextRoundIndex < bracket.rounds.length) {
        const matchIndexInRound = bracket.rounds[currentRoundIndex].matches.indexOf(match.matchId);
        const nextMatchIndex = Math.floor(matchIndexInRound / 2);
        const nextMatchId = bracket.rounds[nextRoundIndex].matches[nextMatchIndex];

        if (nextMatchId) {
          const teamSlot = matchIndexInRound % 2 === 0 ? 'teamAId' : 'teamBId';
          const matchesWithNextOpponent = updatedMatches.map(m => {
              if (m.matchId === nextMatchId) {
                  return { ...m, [teamSlot]: winner.teamId };
              }
              return m;
          });
          await updateDocumentNonBlocking(eventDocRef, { matches: matchesWithNextOpponent });
        }
      }
    }
    
    toast({
        title: "Winner Declared",
        description: `${winner.teamName} has won the match.`
    })
    setIsAlertOpen(false);
    setSelectedMatch(null);
  };

  const isLoading = isLoadingEvent || isLoadingBracket || isLoadingVenues;
  const getTeamById = (teamId: string) => event?.teams.find(t => t.teamId === teamId);
  const getVenueName = (venueId: string) => venues?.find(v => v.id === venueId)?.name || venueId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin" /> Loading bracket data...
      </div>
    );
  }

  if (!event || !bracket) {
    return (
       <div className="flex flex-col gap-8">
        <PageHeader
            title={`Bracket for ${event?.name || 'event'}`}
            description="Visualize and manage the tournament."
        />
        <div className="text-center py-10 px-6 bg-muted/50 rounded-lg border-2 border-dashed">
            <p className="font-semibold">Bracket Not Generated</p>
            <p className="text-sm text-muted-foreground mt-1">
            Go to the "Manage Schedule" page to generate the schedule and create the bracket.
            </p>
        </div>
      </div>
    );
  }
  
  const allMatchesWithData = bracket.rounds.flatMap(round =>
    round.matches.map(matchId => {
      const matchData = event.matches.find(m => m.matchId === matchId);
      if(!matchData) return null;
      return {
        ...matchData,
        teamA: getTeamById(matchData.teamAId),
        teamB: getTeamById(matchData.teamBId),
      } as BracketMatch;
    }).filter((m): m is BracketMatch => m !== null)
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Bracket for ${event.name}`}
        description={event.settings.format === 'knockout' ? "Declare winners to automatically advance them to the next round." : "View the schedule for this round robin tournament."}
      />

      <Card>
        <CardHeader>
          <CardTitle>Tournament {event.settings.format === 'knockout' ? 'Bracket' : 'Schedule'}</CardTitle>
          <CardDescription>
            {event.settings.format === 'knockout' ? "Click 'Win' to set a match winner. The winner will move to the next round." : "All matches in the round robin are listed below."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {event.settings.format === 'knockout' ? (
            <div className="overflow-x-auto pb-4">
              <div className="flex items-start justify-start gap-12 p-4 min-w-max">
                {bracket.rounds.map(round => {
                   const roundMatches = round.matches.map(matchId => {
                        const matchData = event.matches.find(m => m.matchId === matchId);
                        if(!matchData) return null;
                        return {
                        ...matchData,
                        teamA: getTeamById(matchData.teamAId),
                        teamB: getTeamById(matchData.teamBId),
                        } as BracketMatch;
                    }).filter((m): m is BracketMatch => m !== null);

                  return(
                    <BracketRound 
                        key={round.roundIndex}
                        roundName={round.roundName}
                        matches={roundMatches}
                        onSelectWinner={handleSelectWinner}
                    />
                  )
                })}
              </div>
            </div>
          ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {allMatchesWithData.map(match => (
                    <TableRow key={match.matchId}>
                        <TableCell className="font-medium">
                            {match.teamA?.teamName || 'TBD'} vs {match.teamB?.teamName || 'TBD'}
                        </TableCell>
                        <TableCell>{getVenueName(match.venueId)}</TableCell>
                        <TableCell>
                            <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                {new Date(match.startTime).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="mr-2 h-4 w-4" />
                                {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </TableCell>
                         <TableCell>
                          <Button disabled={match.status === 'completed'} onClick={() => handleSelectWinner(match, match.teamA!)}>
                            {match.teamA?.teamName} Won
                          </Button>
                          <Button disabled={match.status === 'completed'} onClick={() => handleSelectWinner(match, match.teamB!)} className="ml-2">
                             {match.teamB?.teamName} Won
                          </Button>
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Winner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to declare{' '}
              <span className="font-bold">&quot;{selectedMatch?.winner.teamName}&quot;</span> as the winner of this match? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMatch(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWinner}>Confirm Winner</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
