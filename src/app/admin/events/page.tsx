"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import type { Event, Sport, Venue } from "@/lib/types";
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
import { MoreHorizontal, PlusCircle, Trash } from "lucide-react";
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

  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsRef);
  const { data: sports, isLoading: isLoadingSports } = useCollection<Sport>(sportsRef);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);

  const departments = ["Sports Department", "Student Affairs", "Computer Science", "Software Engineering"];

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
    if (selectedEvent) {
      const eventDocRef = doc(firestore, 'events', selectedEvent.eventId);
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
        ...values,
        startDate: values.startDate.toISOString().split('T')[0], // format to 'YYYY-MM-DD'
        status: 'upcoming',
        durationDays: 1, // Default value, can be expanded later
        settings: { format: 'knockout', restMinutes: 30, allowSameDeptMatches: false }, // Default values
        teams: [],
        matches: [],
    };
    
    if (selectedEvent) {
      // This is an update, which is not implemented in this step.
      // For now, we just show a toast.
      toast({
        title: 'Coming Soon!',
        description: 'Editing functionality will be added in a future step.',
      });
    } else {
      // This is a new event
      const newDocRef = doc(collection(firestore, 'events'));
      const finalData = { ...eventData, eventId: newDocRef.id };
      addDocumentNonBlocking(collection(firestore, 'events'), finalData);
      toast({
        title: 'Event Created',
        description: `"${values.name}" has been successfully created.`,
      });
    }

    setIsSubmitting(false);
    setIsFormOpen(false);
    setSelectedEvent(undefined);
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
                <TableHead>Teams</TableHead>
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
                <TableRow key={event.eventId}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{event.sportType}</TableCell>
                  <TableCell>{new Date(event.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                  </TableCell>
                  <TableCell>{event.teams.length}</TableCell>
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
                          Edit Event
                        </DropdownMenuItem>
                        <DropdownMenuItem>View Bracket</DropdownMenuItem>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            <DialogDescription>
              {selectedEvent ? 'Update the details of your event.' : 'Fill in the form to create a new sports event.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {(isLoadingSports || isLoadingVenues) ? <p>Loading form data...</p> : (
              <EventForm
                sports={sports || []}
                venues={venues || []}
                departments={departments}
                initialData={selectedEvent}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
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
