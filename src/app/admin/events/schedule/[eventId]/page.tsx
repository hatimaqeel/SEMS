
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

function generateKnockoutPairs(teams: Team[]): { teamAId: string, teamBId: string }[] {
    const pairs: { teamAId: string, teamBId: string }[] = [];
    if (teams.length < 2) return pairs;

    const shuffledTeams = [...teams].sort(() => 0.5 - Math.random());

    for (let i = 0; i < shuffledTeams.length; i += 2) {
        if (shuffledTeams[i + 1]) {
            pairs.push({ teamAId: shuffledTeams[i].teamId, teamBId: shuffledTeams[i + 1].teamId });
        } else {
             // If there's an odd number of teams, the last one gets a bye
            pairs.push({ teamAId: shuffledTeams[i].teamId, teamBId: 'TBD' });
        }
    }
    return pairs;
}

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

  const getTeamName = (teamId: string) => teamId === 'TBD' ? 'TBD' : (event?.teams.find(t => t.teamId === teamId)?.teamName || teamId);
  const getVenueName = (venueId: string) => venues?.find(v => v.id === venueId)?.name || venueId;

  const handleEditClick = (match: Match) => {
    if (match.status === 'completed') {
      toast({
        variant: 'destructive',
        title: 'Cannot Edit Completed Match',
        description: 'This match has already been completed.',
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

    const [hours] = editTime.split(':').map(Number);
    if (hours < 8 || hours >= 18) {
      toast({
        variant: 'destructive',
        title: 'Invalid Time',
        description: 'Match time must be between 8:00 AM and 6:00 PM.',
      });
      return;
    }


    setIsSubmittingEdit(true);

    const sportDetails = sports.find(s => s.sportName === event.sportType);
    if (!sportDetails) {
      toast({ variant: 'destructive', title: 'Error', description: 'Sport details not found.' });
      setIsSubmittingEdit(false);
      return;
    }

    const newStartTime = new Date(event.startDate);
    const [timeHours, timeMinutes] = editTime.split(':').map(Number);
    newStartTime.setHours(timeHours, timeMinutes);

    const newEndTime = new Date(newStartTime.getTime() + sportDetails.defaultDurationMinutes * 60000);

    const updatedMatches = event.matches.map(m => {
      if (m.matchId === selectedMatch.matchId) {
        return {
          ...m,
          venueId: editVenue,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          status: 'scheduled' as const, // Ensure status is set
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
    if (approvedTeams.length < 2) {
        setGenerationError('Scheduling requires at least two approved teams.');
        setIsGenerating(false);
        return;
    }

    if (event.settings.format === 'knockout') {
      const uniqueDepartments = new Set(approvedTeams.map(team => team.department.toLowerCase().trim()));
      if (uniqueDepartments.size < 2 && !event.settings.allowSameDeptMatches) {
        setGenerationError('Knockout scheduling requires teams from at least two different departments. You can enable matching between same-department teams in the event settings.');
        setIsGenerating(false);
        return;
      }
    }
    
    // --- START OF MODIFIED LOGIC ---

    let allMatchesToSchedule: Omit<Match, 'venueId' | 'startTime' | 'endTime' | 'status'>[] = [];
    const bracketRef = doc(firestore, 'brackets', eventId);
    const newBracket: Bracket = { id: eventId, rounds: [] };

    if (event.settings.format === 'round-robin') {
        const pairs = generateRoundRobinPairs(approvedTeams);
        allMatchesToSchedule = pairs.map((pair, index) => ({
            matchId: `m${Date.now() + index}`,
            ...pair,
            sportType: event.sportType,
            round: 1,
        }));
        newBracket.rounds.push({
            roundIndex: 1,
            roundName: 'Round Robin',
            matches: allMatchesToSchedule.map(m => m.matchId)
        });

    } else { // Knockout format
        let currentRoundTeams = [...approvedTeams];
        let roundIndex = 1;
        
        while(currentRoundTeams.length > 1 || (newBracket.rounds.length > 0 && newBracket.rounds[newBracket.rounds.length - 1].matches.length > 1) ) {
            
            let pairs;
            let roundName = `Round ${roundIndex}`;
            
            // For first round, generate from approved teams
            if (roundIndex === 1) {
                const shuffledTeams = currentRoundTeams.sort(() => 0.5 - Math.random());
                pairs = [];
                for (let i = 0; i < shuffledTeams.length; i += 2) {
                    if (shuffledTeams[i + 1]) {
                        pairs.push({ teamAId: shuffledTeams[i].teamId, teamBId: shuffledTeams[i + 1].teamId });
                    } else {
                        // Bye for the first round
                        const byeWinnerId = shuffledTeams[i].teamId;
                        const matchId = `m${Date.now() + allMatchesToSchedule.length}`;
                        allMatchesToSchedule.push({ matchId, teamAId: byeWinnerId, teamBId: 'BYE', sportType: event.sportType, round: roundIndex, winnerTeamId: byeWinnerId });
                    }
                }
            } else {
                 const numPreviousMatches = newBracket.rounds[roundIndex-2].matches.length;
                 const numCurrentRoundMatches = Math.floor(numPreviousMatches/2);
                 if(numCurrentRoundMatches < 1) break;
                 
                 pairs = Array.from({length: numCurrentRoundMatches}, () => ({teamAId: 'TBD', teamBId: 'TBD'}));
            }
            
            const numMatchesThisRound = pairs.length;
            if(numMatchesThisRound === 1 && roundIndex > 1) roundName = "Final";
            else if (numMatchesThisRound <= 2 && roundIndex > 1) roundName = "Semifinals";
            else if (numMatchesThisRound <= 4 && roundIndex > 1) roundName = "Quarterfinals";

            const roundMatches = pairs.map((pair) => ({
                matchId: `m${Date.now() + allMatchesToSchedule.length}`,
                ...pair,
                sportType: event.sportType,
                round: roundIndex,
            }));

            newBracket.rounds.push({
                roundIndex: roundIndex,
                roundName: roundName,
                matches: roundMatches.map(m => m.matchId)
            });
            
            allMatchesToSchedule.push(...roundMatches);
            
            // Prep for next round
            const nextRoundTeamCount = Math.ceil(currentRoundTeams.length / 2);
            currentRoundTeams = Array(nextRoundTeamCount).fill(null).map(() => ({teamId: 'TBD'} as Team));
            roundIndex++;

            if(roundIndex > 10) break; // safety break
        }
    }
    
    if(allMatchesToSchedule.length === 0) {
        setGenerationError('Could not generate any match pairs. Check your teams.');
        setIsGenerating(false);
        return;
    }
    
    try {
        const venueAvailability = venues.reduce((acc, venue) => {
            const availability = [];
            const eventStartDate = new Date(event.startDate);
            for (let i = 0; i < (event.durationDays || 1); i++) {
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

        const teamPreferences = approvedTeams.reduce((acc, team) => {
            acc[team.teamId] = team.preferredVenues || [];
            return acc;
        }, {} as Record<string, string[]>);

        const sportsData = sports.reduce((acc, sport) => {
            acc[sport.sportName] = { defaultDurationMinutes: sport.defaultDurationMinutes };
            return acc;
        }, {} as Record<string, {defaultDurationMinutes: number}>);

      const aiInputMatches = allMatchesToSchedule.map(m => ({
          matchId: m.matchId,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          sportType: m.sportType,
          round: m.round,
      }));

      const result = await optimizeScheduleWithAI({
          eventId: event.eventId,
          venueAvailability,
          teamPreferences,
          timeConstraints: { 
              earliestStartTime: new Date(new Date(event.startDate).setHours(8,0,0,0)).toISOString(),
              latestEndTime: new Date(new Date(event.startDate).setHours(18,0,0,0)).toISOString(),
          },
          matches: aiInputMatches.filter(m => m.teamBId !== 'BYE'), // Don't schedule byes
          sports: sportsData,
      });
      const { optimizedMatches } = result;
      
      const finalMatches: Match[] = allMatchesToSchedule.map(matchToSchedule => {
          const optimized = optimizedMatches.find(opt => opt.matchId === matchToSchedule.matchId);
          const isBye = matchToSchedule.teamBId === 'BYE';
          
          return {
              ...matchToSchedule,
              venueId: optimized?.venueId || '',
              startTime: optimized?.startTime || '',
              endTime: optimized?.endTime || '',
              status: isBye ? 'completed' : 'scheduled',
              winnerTeamId: isBye ? matchToSchedule.teamAId : (matchToSchedule.winnerTeamId || ''),
          };
      });

      await updateDoc(eventRef, { matches: finalMatches, status: 'ongoing' });
      setDocumentNonBlocking(bracketRef, newBracket, { merge: true });

      toast({
        title: 'Schedule & Bracket Generated',
        description: `The match schedule and initial bracket for the ${event.settings.format} tournament have been created.`,
      });

    } catch (error: any) {
      console.error(error);
      setGenerationError(`AI Generation Failed: ${error.message}`);
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
    if (a.round !== b.round) {
      return a.round - b.round;
    }
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  });
  
  const approvedTeams = event.teams.filter(team => team.status === 'approved');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Schedule for ${event.name}`}
        description={`Manage and view the match schedule for this event.`}
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
            {event.matches?.length > 0 ? `Showing ${event.matches.length} scheduled matches for this ${event.settings.format} tournament.` : 'No matches scheduled yet. Click "Generate Schedule & Bracket" to begin.'}
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

    