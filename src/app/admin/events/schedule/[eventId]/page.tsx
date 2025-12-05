
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, updateDoc } from 'firebase/firestore';
import type { Event, Team, Venue, Sport, Match, Bracket } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { optimizeScheduleWithAI } from '@/ai/flows/optimize-schedule-with-ai';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Bot, Loader, Calendar, Clock, MoreHorizontal, Edit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function generateRoundRobinPairs(teams: Team[]): { teamAId: string, teamBId: string }[] {
  const pairs: { teamAId: string, teamBId: string }[] = [];
  if (teams.length < 2) return pairs;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairs.push({ teamAId: teams[i].teamId, teamBId: teams[j].teamId });
    }
  }
  return pairs;
}

function generateKnockoutPairs(teams: Team[]): { teamAId: string, teamBId: string }[] {
    const shuffled = teams.sort(() => 0.5 - Math.random());
    const pairs: { teamAId: string, teamBId: string }[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i + 1]) {
            pairs.push({ teamAId: shuffled[i].teamId, teamBId: shuffled[i+1].teamId });
        }
    }
    return pairs;
}


export default function SchedulePage() {
  const { eventId } = useParams() as { eventId: string };
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editVenue, setEditVenue] = useState('');
  const [editTime, setEditTime] = useState('');

  const eventRef = useMemoFirebase(() => doc(firestore, 'events', eventId), [firestore, eventId]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);
  
  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);

  const sportsRef = useMemoFirebase(() => collection(firestore, 'sports'), [firestore]);
  const { data: sports, isLoading: isLoadingSports } = useCollection<Sport>(sportsRef);

  const getTeamName = (teamId: string) => {
    if (teamId.startsWith('winner_')) {
      const matchId = teamId.substring(7);
      const matchIndex = event?.matches.findIndex(m => m.matchId === matchId);
      if (matchIndex !== -1 && matchIndex !== undefined) {
          return `Winner of Match ${matchIndex + 1}`;
      }
      return `Winner of ${matchId.slice(0,4)}...`
    }
    return event?.teams.find(t => t.teamId === teamId)?.teamName || teamId;
  };

  const getVenueName = (venueId: string) => venues?.find(v => v.id === venueId)?.name || venueId;

  const handleEditClick = (match: Match) => {
    if (match.status === 'completed') {
      toast({
        variant: 'destructive',
        title: 'Cannot Edit Completed Match',
        description: 'This match has already been completed and cannot be rescheduled.',
      });
      return;
    }
    setSelectedMatch(match);
    setEditVenue(match.venueId);
    // Correctly format the time from the ISO string
    setEditTime(match.startTime ? new Date(match.startTime).toTimeString().substring(0, 5) : '');
    setIsEditModalOpen(true);
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !event || !sports) {
      toast({ variant: 'destructive', title: 'Error', description: 'Required data is not available.' });
      return;
    }

    setIsSubmittingEdit(true);

    const sportDetails = sports.find(s => s.sportName === event.sportType);
    if (!sportDetails) {
      toast({ variant: 'destructive', title: 'Error', description: 'Sport details not found.' });
      setIsSubmittingEdit(false);
      return;
    }
    
    // Use the original match date, not the event start date
    const matchDate = new Date(selectedMatch.startTime || event.startDate);
    const [hours, minutes] = editTime.split(':').map(Number);
    const newStartTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), hours, minutes);

    if (hours < 8 || hours >= 18) {
      toast({
        variant: 'destructive',
        title: 'Invalid Time',
        description: 'Match time must be between 8:00 AM and 6:00 PM.',
      });
      setIsSubmittingEdit(false);
      return;
    }

    const newEndTime = new Date(newStartTime.getTime() + sportDetails.defaultDurationMinutes * 60000);

    // Conflict checking
    const conflict = event.matches.find(m => {
        if (m.matchId === selectedMatch.matchId) return false; // Don't check against itself
        if (m.venueId !== editVenue) return false; // Not in the same venue

        const existingStart = new Date(m.startTime).getTime();
        const existingEnd = new Date(m.endTime).getTime();
        const newStart = newStartTime.getTime();
        const newEnd = newEndTime.getTime();

        // Check for overlap
        return (newStart < existingEnd && newEnd > existingStart);
    });

    if (conflict) {
        toast({
            variant: 'destructive',
            title: 'Scheduling Conflict',
            description: `This time slot at ${getVenueName(editVenue)} is already booked. Please choose a different time or venue.`,
        });
        setIsSubmittingEdit(false);
        return;
    }


    const updatedMatches = event.matches.map(m => {
      if (m.matchId === selectedMatch.matchId) {
        return {
          ...m,
          venueId: editVenue,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        };
      }
      return m;
    });

    try {
      await updateDoc(eventRef, { matches: updatedMatches });
      toast({ title: 'Match Updated', description: 'The match has been successfully rescheduled.' });
      setIsEditModalOpen(false);
      setSelectedMatch(null);
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsSubmittingEdit(false);
    }
  };


  const handleGenerateSchedule = async () => {
    if (!event || !venues || !sports) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Event data, venues, or sports data is not loaded yet.',
      });
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    const approvedTeams = event.teams.filter(team => team.status === 'approved');
    
    if (event.settings.format === 'knockout') {
        const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
        if (approvedTeams.length < 2 || !isPowerOfTwo(approvedTeams.length)) {
            setGenerationError(
                'Knockout tournaments require a valid bracket size (2, 4, 8, 16, …).\nThe current number of teams cannot form a knockout bracket.\nPlease adjust the teams or choose the Round-Robin format instead.'
            );
            setIsGenerating(false);
            return;
        }
    }
    
    if (approvedTeams.length < 2) {
      setGenerationError('Scheduling requires at least two approved teams.');
      setIsGenerating(false);
      return;
    }
    
    let pairs: { teamAId: string, teamBId: string }[] = [];
    const bracketRef = doc(firestore, 'brackets', eventId);
    let newBracket: Bracket | null = null;
    let initialMatches: Match[] = [];
    let aiInputMatches: any[] = [];

    if (event.settings.format === 'round-robin') {
        pairs = generateRoundRobinPairs(approvedTeams);
        aiInputMatches = pairs.map((pair, index) => ({
            matchId: `m${Date.now() + index}`,
            ...pair,
            sportType: event.sportType,
            round: 1, // All matches are in one round for round-robin
        }));
    } else { // Knockout
        newBracket = { id: eventId, rounds: [] };
        let currentTeams = approvedTeams;
        let roundIndex = 1;
        let matchCounter = 0;

        while (currentTeams.length > 1) {
            const roundPairs = generateKnockoutPairs(currentTeams);
            const roundMatchIds = roundPairs.map(() => `m${Date.now() + (matchCounter++)}`);
            
            const roundName = currentTeams.length / 2 === 1 ? 'Final' 
                            : currentTeams.length / 2 === 2 ? 'Semifinals'
                            : currentTeams.length / 2 === 4 ? 'Quarterfinals'
                            : `Round ${roundIndex}`;
            
            newBracket.rounds.push({
                roundIndex: roundIndex,
                roundName: roundName,
                matches: roundMatchIds
            });

            roundPairs.forEach((pair, index) => {
                aiInputMatches.push({
                    matchId: roundMatchIds[index],
                    ...pair,
                    sportType: event.sportType,
                    round: roundIndex,
                });
            });

            // For knockout, we create placeholder teams for the next round
            const nextRoundTeams: Team[] = roundMatchIds.map(id => ({
                teamId: `winner_${id}`,
                teamName: `Winner of ${id}`,
            } as Team));
            currentTeams = nextRoundTeams;
            roundIndex++;
        }
    }
    
    if (aiInputMatches.length === 0) {
        setGenerationError('Could not generate any match pairs. Check your teams.');
        setIsGenerating(false);
        return;
    }
    
    try {
        const venueAvailability = venues.reduce((acc, venue) => {
            const availability = [];
            const eventStartDate = new Date(event.startDate);
            for (let i = 0; i < (event.durationDays || 7); i++) { // Default to 7 days if not specified
                const day = new Date(eventStartDate);
                day.setDate(day.getDate() + i);
                availability.push({
                    startTime: new Date(day.setHours(8, 0, 0, 0)).toISOString(),
                    endTime: new Date(day.setHours(18, 0, 0, 0)).toISOString(),
                });
            }
            acc[venue.id!] = availability;
            return acc;
        }, {} as Record<string, {startTime: string, endTime: string}[]>);

        const sportsData = sports.reduce((acc, sport) => {
            acc[sport.sportName] = { defaultDurationMinutes: sport.defaultDurationMinutes };
            return acc;
        }, {} as Record<string, {defaultDurationMinutes: number}>);

      const latestEndDate = new Date(event.startDate);
      latestEndDate.setDate(latestEndDate.getDate() + (event.durationDays || 7));

      const result = await optimizeScheduleWithAI({
          eventId: event.eventId,
          venueAvailability,
          teamPreferences: {}, // Let AI decide based on availability primarily
          timeConstraints: {
            earliestStartTime: new Date(new Date(event.startDate).setHours(8, 0, 0, 0)).toISOString(),
            latestEndTime: new Date(new Date(latestEndDate).setHours(18, 0, 0, 0)).toISOString(),
          },
          matches: aiInputMatches,
          sports: sportsData,
      });

      const { optimizedMatches } = result;

      if (!optimizedMatches || optimizedMatches.length === 0) {
        setGenerationError('AI Scheduling Failed: The AI could not find a valid schedule with the given constraints. This may be due to not enough venues or time slots available to respect the scheduling rules. Please check your event duration and venue availability.');
        setIsGenerating(false);
        return;
      }
      
      const finalMatches: Match[] = optimizedMatches.map(optMatch => {
          const originalMatch = aiInputMatches.find(m => m.matchId === optMatch.matchId);
          return {
              ...originalMatch!,
              venueId: optMatch.venueId,
              startTime: optMatch.startTime,
              endTime: optMatch.endTime,
              status: 'scheduled',
              winnerTeamId: '',
          };
      });

      // For knockout, add the TBD matches
      if (newBracket) {
          newBracket.rounds.forEach(round => {
              if (round.roundIndex > 1) { // Only for rounds after the first
                  round.matches.forEach(matchId => {
                      const nextMatchIndex = Math.floor(newBracket!.rounds[round.roundIndex - 2].matches.indexOf(matchId) / 2);
                      const prevMatch1Id = newBracket!.rounds[round.roundIndex - 2].matches[nextMatchIndex * 2];
                      const prevMatch2Id = newBracket!.rounds[round.roundIndex - 2].matches[nextMatchIndex * 2 + 1];
                      finalMatches.push({
                          matchId: matchId,
                          teamAId: `winner_${prevMatch1Id}`,
                          teamBId: `winner_${prevMatch2Id}`,
                          sportType: event.sportType,
                          venueId: '',
                          startTime: '',
                          endTime: '',
                          round: round.roundIndex,
                          status: 'unscheduled',
                          winnerTeamId: '',
                      });
                  });
              }
          });
          setDocumentNonBlocking(bracketRef, newBracket, { merge: true });
      }

      await updateDoc(eventRef, { matches: finalMatches, status: 'ongoing' });

      toast({
        title: 'Schedule Generated',
        description: `The match schedule for the ${event.settings.format} tournament has been created.`,
      });

    } catch (error: any) {
      console.error(error);
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isLoadingEvent || isLoadingVenues || isLoadingSports;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader className="animate-spin" /> Loading Schedule...</div>;
  }
  if (!event) {
    return <div className="text-center p-8">Event not found.</div>;
  }
  
  const sortedMatches = event.matches?.slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  const approvedTeams = event.teams.filter(team => team.status === 'approved');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Schedule for ${event.name}`}
        description={`Manage and view the match schedule for this event. There are ${approvedTeams.length} approved teams.`}
      >
        <div className="flex gap-2">
            <Button onClick={handleGenerateSchedule} disabled={isGenerating || (event.matches && event.matches.length > 0)}>
            {isGenerating ? (
                <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Generating...
                </>
            ) : (
                <>
                <Bot className="mr-2 h-4 w-4" />
                Generate Schedule & Bracket
                </>
            )}
            </Button>
        </div>
      </PageHeader>
      
      {generationError && (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4"/>
            <AlertTitle>Scheduling Error</AlertTitle>
            <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Match Schedule</CardTitle>
          <CardDescription>
            {event.matches?.length > 0 ? `Showing ${event.matches.length} scheduled matches.` : 'No matches scheduled yet. Click "Generate Schedule & Bracket" to begin.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMatches?.length > 0 ? (
                sortedMatches.map(match => (
                  <TableRow key={match.matchId}>
                    <TableCell>{match.round}</TableCell>
                    <TableCell className="font-medium">
                        {getTeamName(match.teamAId)} vs {getTeamName(match.teamBId)}
                    </TableCell>
                    <TableCell>{match.venueId ? getVenueName(match.venueId) : 'N/A'}</TableCell>
                     <TableCell>
                      {match.startTime ? (
                        <div className="flex flex-col">
                            <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                {new Date(match.startTime).toLocaleDateString()}
                            </div>
                             <div className="flex items-center text-xs">
                                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(match.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                      ) : 'TBD'}
                    </TableCell>
                    <TableCell>{match.status}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditClick(match)}
                            disabled={match.status === 'completed'}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Match
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No matches to display.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Match Schedule</DialogTitle>
            <DialogDescription>
              Modify the venue and time for this match.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-venue">Venue</Label>
              <Select onValueChange={setEditVenue} value={editVenue} disabled={isSubmittingEdit}>
                <SelectTrigger id="edit-venue">
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues?.map(venue => (
                    <SelectItem key={venue.id!} value={venue.id!}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-time">Start Time</Label>
              <Input
                id="edit-time"
                type="time"
                value={editTime}
                onChange={e => setEditTime(e.target.value)}
                disabled={isSubmittingEdit}
              />
            </div>
            <Button type="submit" disabled={isSubmittingEdit}>
              {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
