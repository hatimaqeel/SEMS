'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Event, Sport, Venue } from '@/lib/types';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, 'Event name must be at least 2 characters.'),
  sportType: z.string({ required_error: 'Please select a sport.' }),
  department: z.string({ required_error: 'Please select a department.' }),
  venueId: z.string({ required_error: 'Please select a venue.' }),
  startDate: z.date({ required_error: 'A date is required.' }).refine(date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    return date >= today;
  }, 'Event date cannot be in the past.'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM).'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
});

export type EventFormValues = z.infer<typeof formSchema>;

interface EventFormProps {
  sports: Sport[];
  venues: Venue[];
  departments: string[];
  initialData?: Event;
  onSubmit: (values: EventFormValues) => void;
  isSubmitting: boolean;
}

export function EventForm({
  sports,
  venues,
  departments,
  initialData,
  onSubmit,
  isSubmitting,
}: EventFormProps) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          startDate: new Date(initialData.startDate),
        }
      : {
          name: '',
          sportType: '',
          department: '',
          venueId: '',
          startDate: undefined,
          startTime: '',
          description: '',
        },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Annual Cricket Championship" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="sportType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sport</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sport" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sports.map(sport => (
                      <SelectItem key={sport.sportId} value={sport.sportName}>
                        {sport.sportName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="venueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {venues.map(venue => (
                    <SelectItem key={venue.venueId} value={venue.venueId}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                        )}
                        >
                        {field.value ? (
                            format(field.value, 'PPP')
                        ) : (
                            <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                        }}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                        <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us a little bit about the event"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Event')}
        </Button>
      </form>
    </Form>
  );
}
