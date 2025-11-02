
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

export default function UsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [gender, setGender] = useState('');
  const [secretKey, setSecretKey] = useState('');

  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<User>(usersRef);
  
  const departmentsRef = useMemoFirebase(() => collection(firestore, 'departments'), [firestore]);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsRef);

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setDepartment('');
    setRegNumber('');
    setGender('');
    setSecretKey('');
  };
  
  const handleAddUser = () => {
    clearForm();
    setIsFormOpen(true);
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    if (role === 'admin') {
      try {
        const settingsDocRef = doc(firestore, 'settings', 'app');
        const settingsDoc = await getDoc(settingsDocRef);
        if (!settingsDoc.exists() || settingsDoc.data().secretKey !== secretKey) {
          toast({
              variant: "destructive",
              title: "Error",
              description: "Invalid secret key for admin creation.",
          });
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
         toast({
            variant: "destructive",
            title: "Error validating secret key",
            description: "Could not validate secret key. Please try again.",
          });
        setIsSubmitting(false);
        return;
      }
    }
    
    // We need a temporary auth instance to create a user
    // This doesn't sign the admin out.
    const tempAuth = getAuth();

    try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const newUser = userCredential.user;

        const userDocRef = doc(firestore, 'users', newUser.uid);
        
        let userData: Omit<User, 'id'> = {
            userId: newUser.uid,
            displayName: name,
            email: email,
            role: role,
            dept: department,
        };

        if (role === 'student') {
            userData = {
                ...userData,
                registrationNumber: regNumber,
                gender: gender as 'male' | 'female' | 'other',
            };
        }

        await setDoc(userDocRef, userData);
        
        toast({
            title: 'User Created',
            description: `The ${role} account for ${name} has been created.`,
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

  const roleVariant = (role: string) => {
    switch (role) {
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
        <Button onClick={handleAddUser}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
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
              {users &&
                users.map((user) => (
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
                            {user.registrationNumber}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.dept}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
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
                          <DropdownMenuItem>Edit User</DropdownMenuItem>
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Deactivate User
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new student or administrator account.
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
                        <Input id="student-email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isSubmitting} />
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
                    <div className="grid gap-2">
                        <Label htmlFor="secret-key">Secret Key</Label>
                        <Input id="secret-key" type="password" placeholder="Enter organization secret" required value={secretKey} onChange={e => setSecretKey(e.target.value)} disabled={isSubmitting} />
                    </div>
                 </TabsContent>
                 <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Account...' : `Create ${role} account`}
                </Button>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

    </div>
  );

    