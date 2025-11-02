
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
import { AlertTriangle, Bot, Loader, Calendar, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function generateRoundRobinPairs(teams: Team[]): { teamAId: string, teamBId: string }[] {
    const pairs: { teamAId: string, teamBId: string }[] = [];
    if (teams.length < 2) return pairs;

    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            // Optional: Avoid teams from the same department if setting requires it
            // if (!allowSameDeptMatches && teams[i].department === teams[j].department) continue;
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

  const eventRef = useMemoFirebase(() => doc(firestore, 'events', eventId), [firestore, eventId]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);
  
  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);

  const sportsRef = useMemoFirebase(() => collection(firestore, 'sports'), [firestore]);
  const { data: sports, isLoading: isLoadingSports } = useCollection<Sport>(sportsRef);

  const getTeamName = (teamId: string) => event?.teams.find(t => t.teamId === teamId)?.teamName || teamId;
  const getVenueName = (venueId: string) => venues?.find(v => v.id === venueId)?.name || venueId;

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

    // Unique Department Validation
    const uniqueDepartments = new Set(approvedTeams.map(team => team.department.toLowerCase().trim()));
    if (uniqueDepartments.size < 2) {
      setGenerationError('Scheduling requires teams from at least two different departments to generate a bracket.');
      setIsGenerating(false);
      return;
    }
    
    const teamPairs = generateRoundRobinPairs(approvedTeams);
    if(teamPairs.length === 0) {
        setGenerationError('Could not generate any match pairs. Check your teams.');
        setIsGenerating(false);
        return;
    }

    const matchesToSchedule = teamPairs.map((pair, index) => ({
        matchId: `m${index + 1}`,
        ...pair,
        sportType: event.sportType,
    }));

    try {
        const venueAvailability = venues.reduce((acc, venue) => {
            const availability = [];
            const eventStartDate = new Date(event.startDate);
            for (let i = 0; i < (event.durationDays || 1); i++) {
                const day = new Date(eventStartDate);
                day.setDate(day.getDate() + i);
                availability.push({
                    startTime: new Date(day.setHours(9, 0, 0, 0)).toISOString(),
                    endTime: new Date(day.setHours(21, 0, 0, 0)).toISOString(),
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


      const result = await optimizeScheduleWithAI({
        eventId: event.eventId,
        venueAvailability,
        teamPreferences,
        timeConstraints: { 
            earliestStartTime: new Date(new Date(event.startDate).setHours(9,0,0,0)).toISOString(),
            latestEndTime: new Date(new Date(event.startDate).setHours(22,0,0,0)).toISOString(),
        },
        matches: matchesToSchedule,
        sports: sportsData,
      });
      
      const allMatches: Match[] = result.optimizedMatches.map((match, index) => {
        const originalMatch = matchesToSchedule.find(m => m.matchId === match.matchId)!;
        return {
            ...match,
            ...originalMatch,
            round: 1, // All initial matches are round 1
            status: 'scheduled' as const,
        };
      });

      // Update event with the full schedule of matches
      await updateDoc(eventRef, { matches: allMatches });
      
      // Now, generate and store the bracket
      const bracketRef = doc(firestore, 'brackets', eventId);
      const newBracket: Bracket = {
        id: eventId,
        rounds: [{
            roundIndex: 1,
            roundName: `Round 1`, // Or "Group Stage"
            matches: allMatches.map(m => m.matchId)
        }]
      };
      
      // Add subsequent empty rounds for a single-elimination tournament
      let numTeams = approvedTeams.length;
      let numRounds = Math.ceil(Math.log2(numTeams));
      for(let i=2; i<=numRounds; i++){
          let roundName = "Round " + i;
          if(i === numRounds) roundName = "Final";
          if(i === numRounds-1) roundName = "Semifinals";
          if(i === numRounds-2 && numTeams > 4) roundName = "Quarterfinals";
          
          newBracket.rounds.push({
              roundIndex: i,
              roundName: roundName,
              matches: []
          })
      }

      setDocumentNonBlocking(bracketRef, newBracket, { merge: true });

      toast({
        title: 'Schedule & Bracket Generated',
        description: 'The match schedule and initial bracket have been created by the AI assistant.',
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
  
  const sortedMatches = event.matches?.slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Schedule for ${event.name}`}
        description={`Manage and view the match schedule for this event.`}
      >
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
                <TableHead>Match</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMatches?.length > 0 ? (
                sortedMatches.map(match => (
                  <TableRow key={match.matchId}>
                    <TableCell className="font-medium">
                        {getTeamName(match.teamAId)} vs {getTeamName(match.teamBId)}
                    </TableCell>
                    <TableCell>{getVenueName(match.venueId)}</TableCell>
                     <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {new Date(match.startTime).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                         <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(match.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>
                    <TableCell>{match.status}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No matches to display.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
