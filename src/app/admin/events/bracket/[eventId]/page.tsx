
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, collection } from 'firebase/firestore';
import type { Event, Bracket as BracketType, Match, Team, Venue, Sport } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Loader, Calendar, Clock, Trophy } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type BracketMatch = Match & {
  teamA?: Team;
  teamB?: Team;
};

const BracketMatch = ({ match, onSelectWinner }: { match: BracketMatch, onSelectWinner: (match: BracketMatch, winner: Team) => void; }) => {
  const winner = match.winnerTeamId ? (match.winnerTeamId === match.teamA?.teamId ? match.teamA : match.teamB) : null;
  const isComplete = match.status === 'completed';

  return (
    <div className="flex flex-col gap-2 p-3 bg-card border rounded-lg shadow-sm w-64 min-h-[100px] justify-center">
       <div className={cn("flex items-center justify-between p-2 rounded", winner && winner.teamId === match.teamA?.teamId && 'bg-green-500/20')}>
        <span className="text-sm font-medium truncate">{match.teamA?.teamName || 'TBD'}</span>
        {match.teamA && !isComplete && match.teamA.teamId !== 'TBD' && match.teamB?.teamId !== 'TBD' && <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => onSelectWinner(match, match.teamA!)}>Win</Button>}
      </div>
      <div className="h-px bg-border" />
       <div className={cn("flex items-center justify-between p-2 rounded", winner && winner.teamId === match.teamB?.teamId && 'bg-green-500/20')}>
        <span className="text-sm font-medium truncate">{match.teamB?.teamName || 'TBD'}</span>
        {match.teamB && !isComplete && match.teamA?.teamId !== 'TBD' && match.teamB.teamId !== 'TBD' && <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => onSelectWinner(match, match.teamB!)}>Win</Button>}
      </div>
       {match.startTime && (
        <div className="border-t mt-2 pt-2 text-xs text-muted-foreground">
             <div className="flex items-center">
                <Calendar className="mr-1.5 h-3 w-3" />
                {new Date(match.startTime).toLocaleDateString()}
            </div>
             <div className="flex items-center">
                <Clock className="mr-1.5 h-3 w-3" />
                {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(match.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
      )}
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

  const eventRef = useMemoFirebase(() => doc(firestore, 'events', eventId), [firestore, eventId]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);
  
  const bracketRef = useMemoFirebase(() => doc(firestore, 'brackets', eventId), [firestore, eventId]);
  const { data: bracket, isLoading: isLoadingBracket, error: bracketError } = useDoc<BracketType>(bracketRef);
  
  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);

  const sportsRef = useMemoFirebase(() => collection(firestore, 'sports'), [firestore]);
  const { data: sports, isLoading: isLoadingSports } = useCollection<Sport>(sportsRef);

  const handleSelectWinner = (match: BracketMatch, winner: Team) => {
    if (match.status === 'completed') {
      toast({
        variant: 'destructive',
        title: 'Match Already Completed',
        description: 'This match already has a winner.',
      });
      return;
    }
     if (!match.teamAId || !match.teamBId || match.teamAId === 'TBD' || match.teamBId === 'TBD') {
      toast({
        variant: 'destructive',
        title: 'Cannot Declare Winner',
        description: 'Both teams must be assigned to this match before a winner can be declared.',
      });
      return;
    }
    setSelectedMatch({ match, winner });
    setIsAlertOpen(true);
  };
  
  const confirmWinner = async () => {
    if (!selectedMatch || !event || !bracket) return;

    const { match, winner } = selectedMatch;
    const eventDocRef = doc(firestore, "events", eventId);
    
    const updatedMatches = event.matches.map(m => ({ ...m }));

    const currentMatchIndex = updatedMatches.findIndex(m => m.matchId === match.matchId);
    if (currentMatchIndex !== -1) {
        updatedMatches[currentMatchIndex].winnerTeamId = winner.teamId;
        updatedMatches[currentMatchIndex].status = 'completed';
    }

    if (event.settings.format === 'knockout') {
        const currentRound = bracket.rounds.find(r => r.matches.includes(match.matchId));
        
        if (currentRound && currentRound.roundName !== 'Final') {
            const nextRound = bracket.rounds.find(r => r.roundIndex === currentRound.roundIndex + 1);

            if (nextRound) {
                const matchIndexInCurrentRound = currentRound.matches.indexOf(match.matchId);
                const nextMatchIndexInNextRound = Math.floor(matchIndexInCurrentRound / 2);
                const nextMatchId = nextRound.matches[nextMatchIndexInNextRound];
                
                const nextMatchInEventIndex = updatedMatches.findIndex(m => m.matchId === nextMatchId);

                if (nextMatchInEventIndex !== -1) {
                    const teamSlotToUpdate = matchIndexInCurrentRound % 2 === 0 ? 'teamAId' : 'teamBId';
                    updatedMatches[nextMatchInEventIndex][teamSlotToUpdate] = winner.teamId;
                }
            }
        }
    }
    
    try {
        await updateDoc(eventDocRef, { matches: updatedMatches });
        toast({
            title: "Winner Declared",
            description: `${winner.teamName} wins.`
        });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Error updating match",
            description: e.message
        });
    } finally {
        setIsAlertOpen(false);
        setSelectedMatch(null);
    }
  };

  const isLoading = isLoadingEvent || isLoadingBracket || isLoadingVenues || isLoadingSports;
  const getTeamById = (teamId: string) => event?.teams.find(t => t.teamId === teamId);
  const getTeamName = (teamId: string) => getTeamById(teamId)?.teamName || 'TBD';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin" /> Loading bracket data...
      </div>
    );
  }

  if (!event || (!bracket && event.settings.format === 'knockout')) {
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
  
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Bracket for ${event.name}`}
        description={event.settings.format === 'knockout' ? "Declare winners to automatically advance them to the next round." : "Declare winners for each match in this round-robin tournament."}
      />

      <Card>
        <CardHeader>
          <CardTitle>Tournament Matches</CardTitle>
          <CardDescription>
            {event.settings.format === 'knockout' ? "Click 'Win' to set a match winner. The winner will move to the next round." : "Click on a team's name to declare them the winner of the match."}
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
                  <TableHead>Round</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.matches.length > 0 ? (
                  event.matches.map(match => (
                    <TableRow key={match.matchId}>
                      <TableCell>{match.round}</TableCell>
                      <TableCell className="font-medium">
                        {getTeamName(match.teamAId)} vs {getTeamName(match.teamBId)}
                      </TableCell>
                      <TableCell>
                        {match.winnerTeamId ? (
                           <div className="flex items-center gap-2">
                             <Trophy className="h-4 w-4 text-yellow-500" />
                             <span className="font-semibold">{getTeamName(match.winnerTeamId)}</span>
                           </div>
                        ) : (
                          'TBD'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {match.status !== 'completed' && match.teamAId !== 'TBD' && match.teamBId !== 'TBD' && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectWinner(match as BracketMatch, getTeamById(match.teamAId)!)}
                            >
                              {getTeamName(match.teamAId)} Wins
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectWinner(match as BracketMatch, getTeamById(match.teamBId)!)}
                            >
                              {getTeamName(match.teamBId)} Wins
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No matches scheduled for this event yet.
                    </TableCell>
                  </TableRow>
                )}
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
