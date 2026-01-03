
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Department } from '@/lib/types';
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

export default function DepartmentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | undefined>(undefined);
  const [departmentName, setDepartmentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departmentsRef = useMemoFirebase(
    () => collection(firestore, 'departments'),
    [firestore]
  );
  const { data: departments, isLoading } = useCollection<Department>(departmentsRef);

  const handleAddClick = () => {
    setSelectedDept(undefined);
    setDepartmentName('');
    setIsFormOpen(true);
  };

  const handleEditClick = (dept: Department) => {
    setSelectedDept(dept);
    setDepartmentName(dept.name);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (dept: Department) => {
    setSelectedDept(dept);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedDept?.id) {
      try {
        await deleteDoc(doc(firestore, 'departments', selectedDept.id));
        toast({
          title: 'Department Deleted',
          description: `"${selectedDept.name}" has been deleted.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting department',
          description: error.message,
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setSelectedDept(undefined);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentName) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Department name cannot be empty.',
      });
      return;
    }
    
    // Check for duplicate department name (case-insensitive)
    const isDuplicate = departments?.some(
      (dept) =>
        dept.name.toLowerCase() === departmentName.toLowerCase() &&
        dept.id !== selectedDept?.id
    );

    if (isDuplicate) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Department',
        description: 'A department with this name already exists.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedDept) {
        // Update existing department
        const deptDocRef = doc(firestore, 'departments', selectedDept.id!);
        await updateDoc(deptDocRef, { name: departmentName });
        toast({
          title: 'Department Updated',
          description: `"${departmentName}" has been successfully updated.`,
        });
      } else {
        // Add new department
        const newDocRef = doc(collection(firestore, 'departments'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          departmentId: newDocRef.id,
          name: departmentName,
        });
        toast({
          title: 'Department Created',
          description: `"${departmentName}" has been successfully created.`,
        });
      }
    } catch (error: any) {
       toast({
          variant: 'destructive',
          title: 'Error saving department',
          description: error.message,
        });
    } finally {
      setIsSubmitting(false);
      setIsFormOpen(false);
      setSelectedDept(undefined);
      setDepartmentName('');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Departments"
        description="Add, edit, or remove departments for event organization."
      >
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Department
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    Loading departments...
                  </TableCell>
                </TableRow>
              )}
              {departments && departments.map(dept => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditClick(dept)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(dept)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
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
            <DialogTitle>{selectedDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            <DialogDescription>
              {selectedDept ? 'Update the name of the department.' : 'Enter the name for the new department.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                value={departmentName}
                onChange={e => setDepartmentName(e.target.value)}
                placeholder="e.g., Computer Science"
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Department'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the department
              <span className="font-bold"> &quot;{selectedDept?.name}&quot;</span>.
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
