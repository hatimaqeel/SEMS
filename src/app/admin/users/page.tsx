
'use client';

import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, sendEmailVerification, signOut } from 'firebase/auth';
import type { User, Department } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/PageHeader';
import { MoreHorizontal, PlusCircle, Edit, Trash, UserCog, UserCheck, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp } from 'firebase/app';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const SUPER_ADMIN_EMAIL = 'sems.cust@outlook.com';

const UserTable = ({ 
    users, 
    isLoading, 
    roleVariant, 
    onEdit, 
    onChangeRole, 
    onDeactivate,
    onActivate,
    onDelete,
    currentUserRole,
}: { 
    users: User[] | undefined, 
    isLoading: boolean, 
    roleVariant: (role: string) => "default" | "secondary" | "outline" | "destructive" | null | undefined,
    onEdit: (user: User) => void,
    onChangeRole: (user: User) => void,
    onDeactivate: (user: User) => void,
    onActivate: (user: User) => void,
    onDelete: (user: User) => void,
    currentUserRole: string | null,
}) => (
    <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Display Name</TableHead>
        <TableHead>Department</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {isLoading && (
        <TableRow>
          <TableCell colSpan={5} className="text-center h-24">
            Loading users...
          </TableCell>
        </TableRow>
      )}
      {users && users.length > 0 ? (
        users.map((user) => {
            const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
            const isAdmin = user.role === 'admin';
            const isTargetAdmin = isSuperAdmin || isAdmin;
            const canManageAdmins = currentUserRole === 'super-admin';
            const canManageStudents = currentUserRole === 'super-admin' || currentUserRole === 'admin';
            const disableActions = isSuperAdmin || (isTargetAdmin && !canManageAdmins) || (user.role === 'student' && !canManageStudents);

            return (
                <TableRow key={user.userId}>
                    <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                        {user.photoURL && (
                            <AvatarImage
                            src={user.photoURL}
                            alt={user.displayName}
                            />
                        )}
                        <AvatarFallback>
                            {user.displayName.charAt(0)}
                        </AvatarFallback>
                        </Avatar>
                        <div className="grid gap-0.5">
                        <span className="font-medium">{user.displayName}</span>
                        <span className="text-xs text-muted-foreground">
                            {user.email}
                        </span>
                        </div>
                    </div>
                    </TableCell>
                    <TableCell>{user.dept}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant(isSuperAdmin ? 'super-admin' : user.role)}>
                        {isSuperAdmin ? 'Super Admin' : user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>{user.status || 'active'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={disableActions}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(user)} disabled={disableActions}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onChangeRole(user)} disabled={disableActions}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === 'deactivated' ? (
                            <DropdownMenuItem onClick={() => onActivate(user)} disabled={disableActions}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate User
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => onDeactivate(user)} disabled={disableActions}>
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate User
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(user)} disabled={disableActions}>
                            <Trash className="mr-2 h-4 w-4" />
                            Delete User
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
            )
        })
      ) : !isLoading && (
        <TableRow>
            <TableCell colSpan={5} className="text-center h-24">
                No users found.
            </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);


export default function UsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Dialog states
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);


  // Form state
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [gender, setGender] = useState('');
  
  // Edit state
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editReg, setEditReg] = useState('');
  const [editRole, setEditRole] = useState<User['role']>('student');

  useEffect(() => {
    const fetchUserRole = async () => {
        if(currentUser && firestore) {
            const userDocRef = doc(firestore, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                 const userData = userDoc.data();
                 if(userData.email === SUPER_ADMIN_EMAIL) {
                    setCurrentUserRole('super-admin');
                 } else {
                    setCurrentUserRole(userData.role);
                 }
            }
        }
    };
    fetchUserRole();
  }, [currentUser, firestore]);

  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<User>(usersRef);
  
  const departmentsRef = useMemoFirebase(() => collection(firestore, 'departments'), [firestore]);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsRef);

  const students = users?.filter(user => user.role === 'student');
  const admins = users?.filter(user => user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'coordinator' || user.role === 'referee');

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setDepartment('');
    setRegNumber('');
    setGender('');
  };
  
  const handleAddUser = () => {
    clearForm();
    setIsFormOpen(true);
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const tempApp = initializeApp(firebaseConfig, `temp-app-${new Date().getTime()}`);
    const tempAuth = getAuth(tempApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const newUser = userCredential.user;

        const profileData = {
          displayName: name,
          email: email,
          role,
          dept: department,
          registrationNumber: role === 'student' ? regNumber : '',
          gender: role === 'student' ? gender : '',
        };

        const userProfileRef = doc(firestore, 'userProfiles', newUser.uid);
        setDocumentNonBlocking(userProfileRef, profileData, {});

        await sendEmailVerification(newUser);
        await signOut(tempAuth);
        
        toast({
            title: 'Verification Sent',
            description: `A verification email has been sent to ${email}. The user must verify their email to be added to the list.`,
        });

        setIsFormOpen(false);
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Error creating user",
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditUserClick = (user: User) => {
    setSelectedUser(user);
    setEditName(user.displayName);
    setEditDept(user.dept);
    setEditReg(user.registrationNumber || '');
    setIsEditUserOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);

    const userDocRef = doc(firestore, 'users', selectedUser.userId);
    try {
      await updateDoc(userDocRef, {
        displayName: editName,
        dept: editDept,
        registrationNumber: editReg,
      });
      toast({ title: 'User Updated', description: `${editName}'s profile has been updated.` });
      setIsEditUserOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRoleClick = (user: User) => {
    if (user.email === SUPER_ADMIN_EMAIL) {
        toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'The Super Admin role cannot be changed.'});
        return;
    }
    setSelectedUser(user);
    setEditRole(user.role);
    setIsChangeRoleOpen(true);
  };
  
  const handleChangeRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);

    const userDocRef = doc(firestore, 'users', selectedUser.userId);
    try {
        await updateDoc(userDocRef, { role: editRole });
        toast({ title: 'Role Updated', description: `${selectedUser.displayName}'s role has been changed to ${editRole}.`});
        setIsChangeRoleOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeactivateClick = async (user: User) => {
    if (user.email === SUPER_ADMIN_EMAIL) {
        toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'The Super Admin cannot be deactivated.'});
        return;
    }
    const userDocRef = doc(firestore, 'users', user.userId);
    try {
        await updateDoc(userDocRef, { status: 'deactivated' });
        toast({ title: 'User Deactivated', description: `${user.displayName} has been deactivated.`});
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    }
  };
  
  const handleActivateClick = async (user: User) => {
      const userDocRef = doc(firestore, 'users', user.userId);
      try {
        await updateDoc(userDocRef, { status: 'active' });
        toast({ title: 'User Activated', description: `${user.displayName} has been activated.`});
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    }
  };

  const handleDeleteClick = (user: User) => {
    if (user.email === SUPER_ADMIN_EMAIL) {
        toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'The Super Admin cannot be deleted.'});
        return;
    }
    setSelectedUser(user);
    setIsDeleteConfirmOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    try {
        const userDocRef = doc(firestore, 'users', selectedUser.userId);
        await deleteDoc(userDocRef);

        toast({
            title: 'User Deleted',
            description: `${selectedUser.displayName}'s data has been deleted from the database. Note: This does not delete their authentication record.`,
        });
    } catch (error: any) {
        console.error("Error deleting user:", error);
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: error.message || 'Could not delete the user at this time.',
        });
    } finally {
        setIsDeleteConfirmOpen(false);
        setSelectedUser(null);
    }
  };


  const roleVariant = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'coordinator':
        return 'secondary';
      case 'referee':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Users"
        description="View and manage all users with access to the system."
      >
        {currentUserRole === 'super-admin' && (
            <Button onClick={handleAddUser}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New User
            </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="students">
            <div className="p-6">
                <TabsList>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="administrators">Administrators</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="students" className="mt-0">
              <UserTable 
                users={students} 
                isLoading={isLoading} 
                roleVariant={roleVariant}
                onEdit={handleEditUserClick}
                onChangeRole={handleChangeRoleClick}
                onActivate={handleActivateClick}
                onDeactivate={handleDeactivateClick}
                onDelete={handleDeleteClick}
                currentUserRole={currentUserRole}
                />
            </TabsContent>
            <TabsContent value="administrators" className="mt-0">
               <UserTable 
                users={admins} 
                isLoading={isLoading} 
                roleVariant={roleVariant} 
                onEdit={handleEditUserClick}
                onChangeRole={handleChangeRoleClick}
                onActivate={handleActivateClick}
                onDeactivate={handleDeactivateClick}
                onDelete={handleDeleteClick}
                currentUserRole={currentUserRole}
                />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Add New User Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new student or administrator account. A verification email will be sent.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={role} onValueChange={(v) => setRole(v as 'student' | 'admin')}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student" disabled={isSubmitting}>Student</TabsTrigger>
                <TabsTrigger value="admin" disabled={isSubmitting}>Administrator</TabsTrigger>
            </TabsList>
            <form onSubmit={handleFormSubmit}>
                <TabsContent value="student" className="grid gap-4 mt-4">
                     <div className="grid gap-2">
                        <Label htmlFor="student-name">Name</Label>
                        <Input id="student-name" placeholder="John Doe" required value={name} onChange={e => setName(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="reg-number">Registration Number</Label>
                            <Input id="reg-number" placeholder="CS-2021-001" required value={regNumber} onChange={e => setRegNumber(e.target.value)} disabled={isSubmitting}/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="student-gender">Gender</Label>
                            <Select onValueChange={setGender} value={gender} disabled={isSubmitting} required>
                            <SelectTrigger id="student-gender">
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="student-dept">Department</Label>
                        <Select onValueChange={setDepartment} value={department} disabled={isSubmitting || isLoadingDepts} required>
                        <SelectTrigger id="student-dept">
                            <SelectValue placeholder={isLoadingDepts ? "Loading departments..." : "Select department"} />
                        </SelectTrigger>
                        <SelectContent>
                            {departments?.map(dept => (
                            <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="student-email">Email</Label>
                        <Input id="student-email" type="email" placeholder="student@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="student-password">Password</Label>
                        <Input id="student-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isSubmitting} />
                    </div>
                </TabsContent>
                 <TabsContent value="admin" className="grid gap-4 mt-4">
                     <div className="grid gap-2">
                        <Label htmlFor="admin-name">Name</Label>
                        <Input id="admin-name" placeholder="Admin User" required value={name} onChange={e => setName(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="admin-dept">Department</Label>
                        <Input id="admin-dept" placeholder="Administration" required value={department} onChange={e => setDepartment(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="admin-email">Email</Label>
                        <Input id="admin-email" type="email" placeholder="admin@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="admin-password">Password</Label>
                        <Input id="admin-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isSubmitting} />
                    </div>
                 </TabsContent>
                 <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Account...' : `Create ${role} account`}
                </Button>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update the details for {selectedUser?.displayName}.</DialogDescription>
          </DialogHeader>
           <form onSubmit={handleEditUserSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} required disabled={isSubmitting}/>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="edit-dept">Department</Label>
                <Select onValueChange={setEditDept} value={editDept} required disabled={isSubmitting || isLoadingDepts}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        {departments?.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {selectedUser?.role === 'student' && (
                <div className="grid gap-2">
                    <Label htmlFor="edit-reg">Registration Number</Label>
                    <Input id="edit-reg" value={editReg} onChange={e => setEditReg(e.target.value)} disabled={isSubmitting}/>
                </div>
            )}
             <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>Select a new role for {selectedUser?.displayName}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeRoleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select onValueChange={(v) => setEditRole(v as User['role'])} value={editRole} required disabled={isSubmitting}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                        <SelectItem value="referee">Referee</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for 
              <span className="font-bold"> &quot;{selectedUser?.displayName}&quot;</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    