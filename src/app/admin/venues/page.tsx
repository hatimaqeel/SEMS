"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Venue } from '@/lib/types';
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
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { MoreHorizontal, PlusCircle, Edit, Trash, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function VenuesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [venueName, setVenueName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');

  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading } = useCollection<Venue>(venuesRef);

  const clearForm = () => {
    setVenueName('');
    setLocation('');
    setCapacity('');
  }

  const handleAddClick = () => {
    setSelectedVenue(undefined);
    clearForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (venue: Venue) => {
    setSelectedVenue(venue);
    setVenueName(venue.name);
    setLocation(venue.location);
    setCapacity(venue.capacity.toString());
    setIsFormOpen(true);
  };

  const handleDeleteClick = (venue: Venue) => {
    setSelectedVenue(venue);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedVenue?.id) {
      try {
        await deleteDoc(doc(firestore, 'venues', selectedVenue.id));
        toast({
          title: 'Venue Deleted',
          description: `"${selectedVenue.name}" has been deleted.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting venue',
          description: error.message,
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setSelectedVenue(undefined);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName || !location || !capacity) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'All fields are required.',
      });
      return;
    }
    setIsSubmitting(true);
    
    const venueData = {
        name: venueName,
        location,
        capacity: parseInt(capacity, 10),
        reservations: selectedVenue?.reservations || [],
    };

    try {
      if (selectedVenue) {
        const venueDocRef = doc(firestore, 'venues', selectedVenue.id!);
        await updateDoc(venueDocRef, venueData);
        toast({
          title: 'Venue Updated',
          description: `"${venueName}" has been successfully updated.`,
        });
      } else {
        const newDocRef = doc(collection(firestore, 'venues'));
        await setDoc(newDocRef, { ...venueData, id: newDocRef.id, venueId: newDocRef.id });
        toast({
          title: 'Venue Created',
          description: `"${venueName}" has been successfully created.`,
        });
      }
    } catch (error: any) {
       toast({
          variant: 'destructive',
          title: 'Error saving venue',
          description: error.message,
        });
    } finally {
      setIsSubmitting(false);
      setIsFormOpen(false);
      setSelectedVenue(undefined);
      clearForm();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Venues"
        description="Add and manage the venues available for your sports events."
      >
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Venue
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading venues...</TableCell>
                </TableRow>
              )}
              {venues && venues.map((venue) => (
                <TableRow key={venue.id}>
                  <TableCell className="font-medium">{venue.name}</TableCell>
                  <TableCell>{venue.location}</TableCell>
                  <TableCell>{venue.capacity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/venues/calendar/${venue.id}`}>
                            <Calendar className="mr-2 h-4 w-4" /> View Calendar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(venue)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Venue
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(venue)}>
                          <Trash className="mr-2 h-4 w-4" /> Delete Venue
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedVenue ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
            <DialogDescription>
              {selectedVenue ? 'Update the details of the venue.' : 'Enter the details for the new venue.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="venue-name">Venue Name</Label>
              <Input id="venue-name" value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g., Main Ground" disabled={isSubmitting}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Central Campus" disabled={isSubmitting}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g., 5000" disabled={isSubmitting}/>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Venue'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the venue
              <span className="font-bold"> &quot;{selectedVenue?.name}&quot;</span>.
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
