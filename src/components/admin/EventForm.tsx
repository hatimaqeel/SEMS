
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
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Event, Sport, Venue, Department, AppSettings } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useMemo } from 'react';

// This function now returns a schema that depends on the scheduling window
const createFormSchema = (schedulingWindowMonths: number) => z.object({
  name: z.string().min(2, 'Event name must be at least 2 characters.'),
  sportType: z.string({ required_error: 'Please select a sport.' }),
  department: z.string({ required_error: 'Please select a department.' }),
  venueId: z.string({ required_error: 'Please select a venue.' }),
  startDate: z.date({ required_error: 'A date is required.' }).refine(date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    return date >= today;
  }, 'Event date cannot be in the past.').refine(date => {
    const maxDate = addMonths(new Date(), schedulingWindowMonths);
    return date <= maxDate;
  }, `Event cannot be scheduled more than ${schedulingWindowMonths} months in advance.`),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM).').refine(time => {
    const [hours] = time.split(':').map(Number);
    return hours >= 8 && hours < 18;
  }, 'Start time must be between 8:00 AM and 6:00 PM.'),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(200, 'Description cannot exceed 200 characters.'),
  format: z.enum(['knockout', 'round-robin'], { required_error: 'Please select a tournament format.'}),
});


export type EventFormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface EventFormProps {
  sports: Sport[];
  venues: Venue[];
  departments: Department[];
  settings: AppSettings | null;
  initialData?: Event;
  onSubmit: (values: EventFormValues) => void;
  isSubmitting: boolean;
}

export function EventForm({
  sports,
  venues,
  departments,
  settings,
  initialData,
  onSubmit,
  isSubmitting,
}: EventFormProps) {
  const schedulingWindowMonths = settings?.eventSchedulingWindowMonths || 12;
  const formSchema = useMemo(() => createFormSchema(schedulingWindowMonths), [schedulingWindowMonths]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          startDate: new Date(initialData.startDate),
          format: initialData.settings.format,
        }
      : {
          name: '',
          sportType: '',
          department: '',
          venueId: '',
          startDate: undefined,
          startTime: '',
          description: '',
          format: 'knockout',
        },
  });

  const today = new Date();
  const maxSchedulingDate = useMemo(() => addMonths(today, schedulingWindowMonths), [schedulingWindowMonths]);

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
                <FormLabel>Organizing Department</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     <SelectItem value="All Departments">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                        fromDate={today}
                        toDate={maxSchedulingDate}
                        disabled={(date) => {
                           const todayNormalized = new Date();
                           todayNormalized.setHours(0,0,0,0);
                           return date < todayNormalized || date > maxSchedulingDate;
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
                    <SelectItem key={venue.id} value={venue.id!}>
                      {venue.name}
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
          name="format"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tournament Format</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="knockout" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Knockout (Single Elimination)
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="round-robin" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Round Robin (All-Play-All)
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


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
               <FormDescription>
                A brief, engaging description for the event. (Max 200 characters)
              </FormDescription>
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
