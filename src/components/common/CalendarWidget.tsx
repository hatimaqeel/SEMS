'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Event, Match } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from 'lucide-radix';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isSameDay, parseISO } from 'date-fns';
import { DateEventsPopover } from './DateEventsPopover';

export function CalendarWidget() {
  const firestore = useFirestore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const eventsRef = useMemoFirebase(
    () => collection(firestore, 'events'),
    [firestore]
  );
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsRef);

  const { matchDays, finalDays } = useMemo(() => {
    if (!events) return { matchDays: [], finalDays: [] };

    const matchDates = new Set<string>();
    const finalDates = new Set<string>();

    events.forEach(event => {
      event.matches.forEach(match => {
        if (match.startTime) {
          const matchDate = parseISO(match.startTime).toISOString().split('T')[0];
          matchDates.add(matchDate);
          if (match.round && (event.matches.filter(m => m.round === match.round).length === 1 || match.round > 3)) { // simple logic for finals
             finalDates.add(matchDate);
          }
        }
      });
    });

    return {
      matchDays: Array.from(matchDates).map(d => parseISO(d)),
      finalDays: Array.from(finalDates).map(d => parseISO(d)),
    };
  }, [events]);

  const matchesForSelectedDate = useMemo(() => {
    if (!selectedDate || !events) return [];
    return events.flatMap(event => 
        event.matches
            .filter(match => match.startTime && isSameDay(parseISO(match.startTime), selectedDate))
            .map(match => ({
                ...match,
                eventName: event.name,
                teamA: event.teams.find(t => t.teamId === match.teamAId),
                teamB: event.teams.find(t => t.teamId === match.teamBId),
            }))
    );
  }, [selectedDate, events]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Calendar</CardTitle>
        <CardDescription>An overview of all event dates.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {isLoadingEvents ? (
          <div className="flex justify-center items-center h-40">
            <Loader className="animate-spin" />
          </div>
        ) : (
          <DateEventsPopover
            date={selectedDate}
            matches={matchesForSelectedDate}
            onOpenChange={(isOpen) => {
                if(!isOpen) setSelectedDate(undefined);
            }}
          >
             <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                    if (date && (matchDays.some(d => isSameDay(d, date)) || finalDays.some(d => isSameDay(d, date)))) {
                        setSelectedDate(date);
                    } else {
                        setSelectedDate(undefined);
                    }
                }}
                modifiers={{
                  matchDay: matchDays,
                  finalDay: finalDays,
                }}
                modifiersClassNames={{
                  matchDay: 'bg-primary/20 text-primary-foreground rounded-full',
                  finalDay: 'bg-destructive/80 text-destructive-foreground rounded-full font-bold',
                }}
                className="p-0"
              />
          </DateEventsPopover>
        )}
      </CardContent>
       <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground p-2 border-t">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-primary/20"></div>
            <span>Match Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-destructive/80"></div>
            <span>Finals</span>
          </div>
        </div>
    </Card>
  );
}
