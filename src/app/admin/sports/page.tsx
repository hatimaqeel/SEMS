
"use client";

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Sport } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/PageHeader';
import { MoreHorizontal, PlusCircle, Trash, Edit } from 'lucide-react';
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

export default function SportsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [sportName, setSportName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [defaultDuration, setDefaultDuration] = useState('');

  const sportsRef = useMemoFirebase(() => collection(firestore, 'sports'), [firestore]);
  const { data: sports, isLoading } = useCollection<Sport>(sportsRef);

  const clearForm = () => {
    setSportName('');
    setTeamSize('');
    setDefaultDuration('');
  }

  const handleAddClick = () => {
    setSelectedSport(undefined);
    clearForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (sport: Sport) => {
    setSelectedSport(sport);
    setSportName(sport.sportName);
    setTeamSize(sport.teamSize.toString());
    setDefaultDuration(sport.defaultDurationMinutes.toString());
    setIsFormOpen(true);
  };

  const handleDeleteClick = (sport: Sport) => {
    setSelectedSport(sport);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedSport?.sportId) {
      try {
        await deleteDoc(doc(firestore, 'sports', selectedSport.sportId));
        toast({
          title: 'Sport Deleted',
          description: `"${selectedSport.sportName}" has been deleted.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting sport',
          description: error.message,
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setSelectedSport(undefined);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sportName || !teamSize || !defaultDuration) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'All fields are required.',
      });
      return;
    }

    const isDuplicate = sports?.some(
      (sport) =>
        sport.sportName.toLowerCase() === sportName.toLowerCase() &&
        sport.sportId !== selectedSport?.sportId
    );

    if (isDuplicate) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Sport',
        description: 'A sport with this name already exists.',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const sportData = {
        sportName,
        teamSize: parseInt(teamSize, 10),
        defaultDurationMinutes: parseInt(defaultDuration, 10),
    };

    try {
      if (selectedSport) {
        const sportDocRef = doc(firestore, 'sports', selectedSport.sportId);
        await updateDoc(sportDocRef, sportData);
        toast({
          title: 'Sport Updated',
          description: `"${sportName}" has been successfully updated.`,
        });
      } else {
        const newDocRef = doc(collection(firestore, 'sports'));
        await setDoc(newDocRef, { ...sportData, id: newDocRef.id, sportId: newDocRef.id });
        toast({
          title: 'Sport Created',
          description: `"${sportName}" has been successfully created.`,
        });
      }
    } catch (error: any) {
       toast({
          variant: 'destructive',
          title: 'Error saving sport',
          description: error.message,
        });
    } finally {
      setIsSubmitting(false);
      setIsFormOpen(false);
      setSelectedSport(undefined);
      clearForm();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Sports"
        description="Define the sports that can be part of your tournaments."
      >
         <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Sport
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sport Name</TableHead>
                <TableHead>Team Size</TableHead>
                <TableHead>Default Duration (mins)</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading sports...</TableCell>
                </TableRow>
              )}
              {sports && sports.map((sport) => (
                <TableRow key={sport.sportId}>
                  <TableCell className="font-medium">{sport.sportName}</TableCell>
                  <TableCell>{sport.teamSize}</TableCell>
                  <TableCell>{sport.defaultDurationMinutes}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditClick(sport)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(sport)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
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
            <DialogTitle>{selectedSport ? 'Edit Sport' : 'Add New Sport'}</DialogTitle>
            <DialogDescription>
              {selectedSport ? 'Update the details of the sport.' : 'Enter the details for the new sport.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sport-name">Sport Name</Label>
              <Input id="sport-name" value={sportName} onChange={e => setSportName(e.target.value)} placeholder="e.g., Cricket" disabled={isSubmitting}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team-size">Team Size</Label>
              <Input id="team-size" type="number" value={teamSize} onChange={e => setTeamSize(e.target.value)} placeholder="e.g., 11" disabled={isSubmitting}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Default Duration (minutes)</Label>
              <Input id="duration" type="number" value={defaultDuration} onChange={e => setDefaultDuration(e.target.value)} placeholder="e.g., 120" disabled={isSubmitting}/>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Sport'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sport
              <span className="font-bold"> &quot;{selectedSport?.sportName}&quot;</span>.
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
