
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Venue, Event, Match } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Calendar, Clock, Loader, Shirt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { addDays, format, isSameDay } from 'date-fns';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendarMatch extends Match {
    eventName: string;
    teamA?: { teamName: string };
    teamB?: { teamName: string };
}

const Day = ({ date, matches, getTeamById }: { date: Date; matches: CalendarMatch[], getTeamById: (id:string) => any }) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-sm font-medium">{format(date, 'EEE, MMM d')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-64">
           <div className="p-3 space-y-3">
             {matches.length > 0 ? (
                matches.map(match => (
                    <div key={match.matchId} className="p-2 rounded-lg bg-muted/50 border border-muted text-xs">
                        <p className="font-semibold text-foreground truncate">{match.eventName}</p>
                         <div className="flex items-center text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 mr-1.5" />
                            <span>
                                {format(new Date(match.startTime), 'p')} - {format(new Date(match.endTime), 'p')}
                            </span>
                        </div>
                        <div className="flex items-center text-muted-foreground mt-1">
                            <Shirt className="h-3 w-3 mr-1.5" />
                            <span>
                                {getTeamById(match.teamAId)?.teamName || 'TBD'} vs {getTeamById(match.teamBId)?.teamName || 'TBD'}
                            </span>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-xs text-muted-foreground text-center pt-8">No events scheduled.</p>
            )}
           </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};


export default function VenueCalendarPage() {
  const { venueId } = useParams() as { venueId: string };
  const firestore = useFirestore();
  const [daysToShow, setDaysToShow] = useState(7);

  const venueRef = useMemoFirebase(() => doc(firestore, 'venues', venueId), [firestore, venueId]);
  const { data: venue, isLoading: isLoadingVenue } = useDoc<Venue>(venueRef);

  const eventsRef = useMemoFirebase(() => collection(firestore, 'events'), [firestore]);
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsRef);

  const venueMatches = useMemo(() => {
    if (!events) return [];
    return events.flatMap(event => 
        event.matches
            .filter(match => match.venueId === venueId)
            .map(match => ({...match, eventName: event.name}))
    ).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, venueId]);

  const getTeamById = (teamId: string) => {
    if (!events) return null;
    for (const event of events) {
      const team = event.teams.find(t => t.teamId === teamId);
      if (team) return team;
    }
    return null;
  };

  const isLoading = isLoadingVenue || isLoadingEvents;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin" /> Loading calendar...
      </div>
    );
  }

  const today = new Date();
  const calendarDays = Array.from({ length: daysToShow }, (_, i) => addDays(today, i));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Calendar for ${venue?.name || 'Venue'}`}
        description={`Upcoming schedule for the next ${daysToShow} days.`}
      >
        <Select onValueChange={(value) => setDaysToShow(parseInt(value))} defaultValue={daysToShow.toString()}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Next 7 Days</SelectItem>
            <SelectItem value="30">Next 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {calendarDays.map(day => {
          const dayMatches = venueMatches.filter(m => isSameDay(new Date(m.startTime), day));
          return <Day key={day.toString()} date={day} matches={dayMatches} getTeamById={getTeamById} />;
        })}
      </div>

    </div>
  );
}
