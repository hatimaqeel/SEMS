
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, setDoc } from "firebase/firestore";
import type { Event, Sport, Venue, Department } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { MoreHorizontal, PlusCircle, Trash, Edit, GanttChartSquare, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EventForm, type EventFormValues } from "@/components/admin/EventForm";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function EventsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventsRef = useMemoFirebase(() => collection(firestore, "events"), [firestore]);
  const sportsRef = useMemoFirebase(() => collection(firestore, "sports"), [firestore]);
  const venuesRef = useMemoFirebase(() => collection(firestore, "venues"), [firestore]);
  const departmentsRef = useMemoFirebase(() => collection(firestore, "departments"), [firestore]);

  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsRef);
  const { data: sports, isLoading: isLoadingSports } = useCollection<Sport>(sportsRef);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsRef);

  const handleAddClick = () => {
    setSelectedEvent(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (event: Event) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (event: Event) => {
    setSelectedEvent(event);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEvent?.id) {
      const eventDocRef = doc(firestore, 'events', selectedEvent.id);
      deleteDocumentNonBlocking(eventDocRef);
      toast({
        title: 'Event Deleted',
        description: `"${selectedEvent.name}" has been deleted.`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedEvent(undefined);
    }
  };

  const handleFormSubmit = async (values: EventFormValues) => {
    setIsSubmitting(true);

    const eventData = {
      name: values.name,
      sportType: values.sportType,
      department: values.department,
      venueId: values.venueId,
      startDate: values.startDate.toISOString().split('T')[0],
      startTime: values.startTime,
      description: values.description,
      status: 'upcoming' as const,
      durationDays: 1, // Default value, can be expanded later
      settings: { format: 'knockout' as const, restMinutes: 30, allowSameDeptMatches: false }, // Default values
      teams: selectedEvent?.teams || [],
      matches: selectedEvent?.matches || [],
      joinRequests: selectedEvent?.joinRequests || [],
    };
    
    try {
        if (selectedEvent?.id) {
            const eventDocRef = doc(firestore, 'events', selectedEvent.id);
            const finalData = { ...selectedEvent, ...eventData };
            setDocumentNonBlocking(eventDocRef, finalData, { merge: true });
            toast({
                title: 'Event Updated',
                description: `"${values.name}" has been successfully updated.`,
            });
        } else {
            // This is a new event
            const newDocRef = doc(collection(firestore, 'events'));
            const finalData = { ...eventData, id: newDocRef.id, eventId: newDocRef.id };
            setDocumentNonBlocking(newDocRef, finalData, {});
            toast({
                title: 'Event Created',
                description: `"${values.name}" has been successfully created.`,
            });
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error Saving Event',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsSubmitting(false);
        setIsFormOpen(false);
        setSelectedEvent(undefined);
    }
  };


  const statusVariant = (status: string) => {
    switch (status) {
      case "upcoming": return "default";
      case "ongoing": return "secondary";
      case "completed": return "outline";
      default: return "destructive";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Events"
        description="Here you can create, view, and manage all sports events."
      >
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Event
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join Requests</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEvents && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading events...</TableCell>
                </TableRow>
              )}
              {events && events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{event.sportType}</TableCell>
                  <TableCell>{new Date(event.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                  </TableCell>
                  <TableCell>{event.joinRequests?.length || 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(event)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Event
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/events/registrations/${event.id}`}>
                                <Users className="mr-2 h-4 w-4" />
                                Manage Registrations
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/events/schedule/${event.id}`}>
                                <GanttChartSquare className="mr-2 h-4 w-4" />
                                Manage Schedule
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(event)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
              <DialogDescription>
                {selectedEvent ? 'Update the details of your event.' : 'Fill in the form to create a new sports event.'}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] md:max-h-[80vh]">
              <div className="py-4 pr-6">
                {(isLoadingSports || isLoadingVenues || isLoadingDepts) ? <p>Loading form data...</p> : (
                  <EventForm
                    sports={sports || []}
                    venues={venues || []}
                    departments={departments || []}
                    initialData={selectedEvent}
                    onSubmit={handleFormSubmit}
                    isSubmitting={isSubmitting}
                  />
                )}
              </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event
              <span className="font-bold"> &quot;{selectedEvent?.name}&quot; </span>
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
