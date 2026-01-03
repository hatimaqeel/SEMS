
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import type { Announcement } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash,
  Info,
  AlertTriangle,
  Award,
  CalendarClock,
  Loader,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AnnouncementForm,
  AnnouncementFormValues,
} from '@/components/admin/AnnouncementForm';
import { format } from 'date-fns';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const announcementTypeConfig = {
  info: { icon: Info, color: 'bg-blue-500' },
  warning: { icon: AlertTriangle, color: 'bg-yellow-500' },
  success: { icon: Award, color: 'bg-green-500' },
  deadline: { icon: CalendarClock, color: 'bg-red-500' },
};

export default function AnnouncementsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<
    Announcement | undefined
  >(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const announcementsQuery = useMemoFirebase(
    () =>
      query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  const { data: announcements, isLoading } =
    useCollection<Announcement>(announcementsQuery);

  const handleAddClick = () => {
    setSelectedAnnouncement(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedAnnouncement?.id) {
      try {
        await deleteDoc(doc(firestore, 'announcements', selectedAnnouncement.id));
        toast({
          title: 'Announcement Deleted',
          description: `The announcement has been deleted.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting announcement',
          description: error.message,
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setSelectedAnnouncement(undefined);
      }
    }
  };

  const handleFormSubmit = async (values: AnnouncementFormValues) => {
    setIsSubmitting(true);

    const announcementData = {
      title: values.title,
      description: values.description,
      type: values.type,
      createdAt: selectedAnnouncement
        ? selectedAnnouncement.createdAt
        : new Date().toISOString(), // Keep original creation date on edit
    };

    try {
      if (selectedAnnouncement) {
        const announcementDocRef = doc(firestore, 'announcements', selectedAnnouncement.id);
        setDocumentNonBlocking(announcementDocRef, announcementData, { merge: true });
        toast({
          title: 'Announcement Updated',
          description: 'The announcement has been successfully updated.',
        });
      } else {
        const newDocRef = doc(collection(firestore, 'announcements'));
        setDocumentNonBlocking(newDocRef, { ...announcementData, id: newDocRef.id }, {});
        toast({
          title: 'Announcement Created',
          description: 'The new announcement has been published.',
        });
      }
      setIsFormOpen(false);
      setSelectedAnnouncement(undefined);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Announcement',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Announcements"
        description="Create and manage announcements for all users."
      >
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Announcement
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Loader className="animate-spin" />
          </div>
        )}
        {announcements && announcements.length > 0 ? (
          announcements.map((item) => {
            const config = announcementTypeConfig[item.type];
            return (
              <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${config.color}`}>
                   <config.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="font-semibold text-card-foreground">{item.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                     </div>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(item)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {format(new Date(item.createdAt), 'PPP p')}
                  </div>
                </div>
              </div>
            );
          })
        ) : !isLoading && (
            <div className="text-center py-10 px-6 bg-muted/50 rounded-lg border-2 border-dashed">
                <p className="font-semibold">No Announcements Yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Add New Announcement" to publish one.</p>
            </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAnnouncement
                ? 'Edit Announcement'
                : 'Add New Announcement'}
            </DialogTitle>
            <DialogDescription>
              {selectedAnnouncement
                ? 'Update the details of the announcement.'
                : 'Fill in the form to create a new announcement.'}
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm
            initialData={selectedAnnouncement}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the announcement:
              <span className="font-bold"> &quot;{selectedAnnouncement?.title}&quot;</span>.
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
