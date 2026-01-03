'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Match, Team } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Clock } from 'lucide-react';

interface EnrichedMatch extends Match {
    eventName: string;
    teamA?: Team;
    teamB?: Team;
}

interface DateEventsPopoverProps {
    date: Date | undefined;
    matches: EnrichedMatch[];
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function DateEventsPopover({ date, matches, onOpenChange, children }: DateEventsPopoverProps) {

  const isOpen = date !== undefined && matches.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        {date && (
           <div className="space-y-4">
            <h4 className="font-medium leading-none">{format(date, 'PPP')}</h4>
            <div className="space-y-3">
              {matches.map(match => (
                <div key={match.matchId} className="text-sm">
                  <p className="font-semibold">{match.eventName} - R{match.round}</p>
                  <p className="text-muted-foreground">{match.teamA?.teamName || 'TBD'} vs {match.teamB?.teamName || 'TBD'}</p>
                  <p className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1.5 h-3 w-3" />
                    {format(parseISO(match.startTime), 'p')}
                  </p>
                </div>
              ))}
            </div>
           </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
