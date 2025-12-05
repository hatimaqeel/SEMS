
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
import { AlertTriangle, Bot, Loader, Calendar, Clock, MoreHorizontal, Edit, GitBranch } from 'lucide-react';
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
        } else {
            // This logic is for byes, but the new rules forbid it.
            // Keeping for structure, but should not be hit with power-of-2 validation.
            pairs.push({ teamAId: shuffled[i].teamId, teamBId: 'BYE'});
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
  
  const bracketRef = useMemoFirebase(() => doc(firestore, 'brackets', eventId), [firestore, eventId]);
  const { data: bracket } = useDoc<Bracket>(bracketRef);
  
  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);

  const sportsRef = useMemoFirebase(() => collection(firestore, 'sports'), [firestore]);
  const { data: sports, isLoading: isLoadingSports } = useCollection<Sport>(sportsRef);

  const getTeamName = (teamId: string) => {
    if (!teamId) return 'TBD';
    if (teamId.startsWith('winner_')) {
      const matchId = teamId.substring(7);
      const matchIndex = event?.matches.findIndex(m => m.matchId === matchId);
      if (matchIndex !== -1 && matchIndex !== undefined) {
          return `Winner of Match ${matchIndex + 1}`;
      }
      return `Winner of ${matchId.slice(0,4)}...`
    }
    return event?.teams.find(t => t.teamId === teamId)?.teamName || 'TBD';
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

    const conflict = event.matches.find(m => {
        if (m.matchId === selectedMatch.matchId) return false;
        if (m.venueId !== editVenue) return false;

        const existingStart = new Date(m.startTime).getTime();
        const existingEnd = new Date(m.endTime).getTime();
        const newStart = newStartTime.getTime();
        const newEnd = newEndTime.getTime();

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


  const handleGenerateSchedule = async (roundToSchedule = 1) => {
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
            setGenerationError('Knockout tournaments require a valid bracket size (2, 4, 8, 16, …).\nThe current number of teams cannot form a knockout bracket.\nPlease adjust the teams or choose the Round-Robin format instead.');
            setIsGenerating(false);
            return;
        }
    }
    
    if (roundToSchedule === 1 && approvedTeams.length < 2) {
      setGenerationError('Scheduling requires at least two approved teams.');
      setIsGenerating(false);
      return;
    }
    
    let matchesToScheduleForAI: any[] = [];
    let finalMatches: Match[] = roundToSchedule > 1 ? [...event.matches] : [];

    if (roundToSchedule === 1) { // Initial Generation
        if (event.settings.format === 'round-robin') {
            const pairs = generateRoundRobinPairs(approvedTeams);
            matchesToScheduleForAI = pairs.map((pair, index) => ({
                matchId: `m${Date.now() + index}`,
                ...pair,
                sportType: event.sportType,
                round: 1,
            }));
        } else { // Knockout - Initial Generation
            const newBracket: Bracket = { id: eventId, rounds: [] };
            let currentTeams = approvedTeams;
            let roundIndex = 1;
            let matchCounter = 0;
            let allRoundMatches: {matchId: string, round: number, teamAId: string, teamBId: string}[] = [];

            while (currentTeams.length >= 1) {
                const isFinal = currentTeams.length === 2;
                const roundPairs = isFinal ? [{teamAId: currentTeams[0].teamId, teamBId: currentTeams[1].teamId}] : generateKnockoutPairs(currentTeams);
                
                const roundMatchIds = roundPairs.map(() => `m${Date.now() + (matchCounter++)}`);
                
                const roundName = isFinal ? 'Final'
                                : currentTeams.length === 4 ? 'Semifinals'
                                : currentTeams.length === 8 ? 'Quarterfinals'
                                : `Round ${roundIndex}`;
                
                newBracket.rounds.push({ roundIndex, roundName, matches: roundMatchIds });

                roundPairs.forEach((pair, index) => {
                    allRoundMatches.push({
                        matchId: roundMatchIds[index],
                        round: roundIndex,
                        ...pair,
                    });
                });
                
                if (isFinal) break;

                const nextRoundTeams: Team[] = roundMatchIds.map(id => ({ teamId: `winner_${id}` } as Team));
                currentTeams = nextRoundTeams;
                roundIndex++;
            }
            
            matchesToScheduleForAI = allRoundMatches.filter(m => m.round === 1);
            
            finalMatches = allRoundMatches.map(m => ({
                ...m,
                sportType: event.sportType,
                status: m.round === 1 ? 'scheduled' : 'unscheduled', // Only first round is pending schedule
                venueId: '',
                startTime: '',
                endTime: '',
                winnerTeamId: '',
            }));

            setDocumentNonBlocking(bracketRef, newBracket, { merge: true });
        }
    } else { // Subsequent Knockout Round Generation
        if (!bracket) {
            setGenerationError("Bracket data not found. Cannot schedule next round.");
            setIsGenerating(false);
            return;
        }
        const nextRoundInfo = bracket.rounds.find(r => r.roundIndex === roundToSchedule);
        if (!nextRoundInfo) {
            setGenerationError("Next round not found in bracket.");
            setIsGenerating(false);
            return;
        }

        matchesToScheduleForAI = event.matches
            .filter(m => nextRoundInfo.matches.includes(m.matchId))
            .map(m => ({
                matchId: m.matchId,
                teamAId: m.teamAId,
                teamBId: m.teamBId,
                sportType: m.sportType,
                round: m.round
            }));
    }

    if (matchesToScheduleForAI.length === 0) {
        setGenerationError('Could not find any matches to schedule for this round.');
        setIsGenerating(false);
        return;
    }
    
    try {
        const venueAvailability = venues.reduce((acc, venue) => {
            const availability = [];
            const eventStartDate = new Date(event.startDate);
            for (let i = 0; i < (event.durationDays || 7); i++) {
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
          teamPreferences: {},
          timeConstraints: {
            earliestStartTime: new Date(new Date(event.startDate).setHours(8, 0, 0, 0)).toISOString(),
            latestEndTime: new Date(latestEndDate.setHours(18,0,0,0)).toISOString(),
          },
          matches: matchesToScheduleForAI,
          sports: sportsData,
      });

      const { optimizedMatches } = result;

      if (!optimizedMatches || optimizedMatches.length === 0) {
        setGenerationError('AI Scheduling Failed: The AI could not find a valid schedule with the given constraints. This may be due to not enough venues or time slots available to respect round-based scheduling. Please check your event duration and venue availability.');
        setIsGenerating(false);
        return;
      }
      
      optimizedMatches.forEach(optMatch => {
          const matchIndex = finalMatches.findIndex(m => m.matchId === optMatch.matchId);
          if (matchIndex !== -1) {
              finalMatches[matchIndex] = {
                  ...finalMatches[matchIndex],
                  venueId: optMatch.venueId,
                  startTime: optMatch.startTime,
                  endTime: optMatch.endTime,
                  status: 'scheduled',
              };
          }
      });
      
      if(roundToSchedule === 1 && event.settings.format === 'round-robin') {
        finalMatches = matchesToScheduleForAI.map(m => {
            const opt = optimizedMatches.find(o => o.matchId === m.matchId);
            return {
                ...m,
                venueId: opt?.venueId || '',
                startTime: opt?.startTime || '',
                endTime: opt?.endTime || '',
                status: 'scheduled',
                winnerTeamId: '',
            }
        });
      }


      await updateDoc(eventRef, { matches: finalMatches, status: 'ongoing' });

      toast({
        title: 'Schedule Generated',
        description: `Round ${roundToSchedule} for the ${event.settings.format} tournament has been scheduled.`,
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
  
  const sortedMatches = event.matches?.slice().sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  });
  
  const approvedTeams = event.teams.filter(team => team.status === 'approved');

  // Logic for the "Generate Next Round" button
  let nextRoundToSchedule: number | null = null;
  let isCurrentRoundComplete = false;
  let showNextRoundButton = false;

  if (event.settings.format === 'knockout' && event.matches && event.matches.length > 0 && bracket) {
    const scheduledRounds = [...new Set(event.matches.filter(m => m.status === 'scheduled' || m.status === 'completed').map(m => m.round))];
    const highestScheduledRound = scheduledRounds.length > 0 ? Math.max(...scheduledRounds) : 0;
    
    if (highestScheduledRound > 0) {
        const matchesInCurrentRound = event.matches.filter(m => m.round === highestScheduledRound);
        isCurrentRoundComplete = matchesInCurrentRound.every(m => m.status === 'completed');
        
        const nextRoundInfo = bracket.rounds.find(r => r.roundIndex === highestScheduledRound + 1);
        if (nextRoundInfo && isCurrentRoundComplete) {
            showNextRoundButton = true;
            nextRoundToSchedule = highestScheduledRound + 1;
        }
    }
  }


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Schedule for ${event.name}`}
        description={`Manage and view the match schedule for this event. There are ${approvedTeams.length} approved teams.`}
      >
        <div className="flex gap-2">
            {showNextRoundButton && nextRoundToSchedule && (
                 <Button onClick={() => handleGenerateSchedule(nextRoundToSchedule!)} disabled={isGenerating}>
                    {isGenerating ? (<><Loader className="mr-2 h-4 w-4 animate-spin" />Generating...</>) : (<><GitBranch className="mr-2 h-4 w-4" />Generate Next Round Schedule</>)}
                </Button>
            )}
            {!event.matches || event.matches.length === 0 && (
                <Button onClick={() => handleGenerateSchedule(1)} disabled={isGenerating}>
                {isGenerating ? (
                    <><Loader className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                ) : (
                    <><Bot className="mr-2 h-4 w-4" />Generate Schedule & Bracket</>
                )}
                </Button>
            )}
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={match.status === 'unscheduled'}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditClick(match)}
                            disabled={match.status === 'completed' || match.status === 'unscheduled'}
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

    