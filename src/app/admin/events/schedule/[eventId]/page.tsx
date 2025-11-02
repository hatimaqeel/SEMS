
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

  const eventRef = useMemoFirebase(() => doc(firestore, 'events', eventId), [firestore, eventId]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);
  
  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);

  const sportsRef = useMemoFirebase(() => collection(firestore, 'sports'), [firestore]);
  const { data: sports, isLoading: isLoadingSports } = useCollection<Sport>(sportsRef);

  const getTeamName = (teamId: string) => teamId === 'TBD' ? 'TBD' : (event?.teams.find(t => t.teamId === teamId)?.teamName || teamId);
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

    if (event.settings.format === 'knockout') {
      const uniqueDepartments = new Set(approvedTeams.map(team => team.department.toLowerCase().trim()));
      if (uniqueDepartments.size < 2 && !event.settings.allowSameDeptMatches) {
        setGenerationError('Knockout scheduling requires teams from at least two different departments. You can enable matching between same-department teams in the event settings.');
        setIsGenerating(false);
        return;
      }
    }
    
    const teamPairs = event.settings.format === 'knockout'
      ? generateKnockoutPairs(approvedTeams)
      : generateRoundRobinPairs(approvedTeams);

    if(teamPairs.length === 0) {
        setGenerationError('Could not generate any match pairs. Check your teams.');
        setIsGenerating(false);
        return;
    }

    const matchesToSchedule = teamPairs.map((pair, index) => ({
        matchId: `m${Date.now() + index}`,
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


      const aiMatchesToSchedule = matchesToSchedule.filter(m => m.teamAId !== 'TBD' && m.teamBId !== 'TBD');
      const byes = matchesToSchedule.filter(m => m.teamAId === 'TBD' || m.teamBId === 'TBD');

      let optimizedMatches: any[] = [];
      if (aiMatchesToSchedule.length > 0) {
        const result = await optimizeScheduleWithAI({
            eventId: event.eventId,
            venueAvailability,
            teamPreferences,
            timeConstraints: { 
                earliestStartTime: new Date(new Date(event.startDate).setHours(9,0,0,0)).toISOString(),
                latestEndTime: new Date(new Date(event.startDate).setHours(22,0,0,0)).toISOString(),
            },
            matches: aiMatchesToSchedule,
            sports: sportsData,
        });
        optimizedMatches = result.optimizedMatches;
      }
      
      const allMatches: Match[] = matchesToSchedule.map(matchToSchedule => {
          const optimized = optimizedMatches.find(opt => opt.matchId === matchToSchedule.matchId);
          const isBye = matchToSchedule.teamAId === 'TBD' || matchToSchedule.teamBId === 'TBD';
          const winnerId = isBye ? (matchToSchedule.teamAId !== 'TBD' ? matchToSchedule.teamAId : matchToSchedule.teamBId) : '';
          
          return {
              ...matchToSchedule,
              venueId: optimized?.venueId || '',
              startTime: optimized?.startTime || '',
              endTime: optimized?.endTime || '',
              round: 1,
              status: isBye ? 'completed' : 'scheduled',
              winnerTeamId: winnerId,
          };
      });

      await updateDoc(eventRef, { matches: allMatches, status: 'ongoing' });
      
      const bracketRef = doc(firestore, 'brackets', eventId);
      const newBracket: Bracket = {
        id: eventId,
        rounds: [{
            roundIndex: 1,
            roundName: `Round 1`,
            matches: allMatches.map(m => m.matchId)
        }]
      };
      
      if (event.settings.format === 'knockout') {
        let numMatchesInRound = Math.ceil(approvedTeams.length / 2);
        let roundIndex = 2;
        let roundNamePrefix = "Round";
        
        while (numMatchesInRound > 1) {
            numMatchesInRound = Math.floor(numMatchesInRound / 2);
            if (numMatchesInRound === 0) break;
            
            let roundName = `${roundNamePrefix} ${roundIndex}`;
            if (numMatchesInRound === 1) roundName = "Final";
            else if (numMatchesInRound === 2) roundName = "Semifinals";
            else if (numMatchesInRound === 4) roundName = "Quarterfinals";

            const roundMatches: Match[] = [];
            const newMatchIds: string[] = [];

            for (let i = 0; i < numMatchesInRound; i++) {
                const matchId = `m${Date.now() + roundIndex * 100 + i}`;
                newMatchIds.push(matchId);
                roundMatches.push({
                    matchId: matchId,
                    teamAId: 'TBD',
                    teamBId: 'TBD',
                    sportType: event.sportType,
                    venueId: '',
                    startTime: '',
                    endTime: '',
                    round: roundIndex,
                    status: 'scheduled',
                    winnerTeamId: '',
                });
            }
            
            allMatches.push(...roundMatches);
            newBracket.rounds.push({
                roundIndex,
                roundName,
                matches: newMatchIds
            });

            roundIndex++;
        }
         await updateDoc(eventRef, { matches: allMatches });
      }

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
