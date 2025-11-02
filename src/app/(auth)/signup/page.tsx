'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Logo } from '@/components/common/Logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  // Student form state
  const [studentName, setStudentName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [studentDept, setStudentDept] = useState('');
  const [studentGender, setStudentGender] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState('');

  // Admin form state
  const [adminName, setAdminName] = useState('');
  const [adminDept, setAdminDept] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');


  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentPassword !== studentConfirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Passwords do not match.',
      });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        studentEmail,
        studentPassword
      );
      const user = userCredential.user;

      await setDoc(doc(firestore, 'users', user.uid), {
        userId: user.uid,
        displayName: studentName,
        email: studentEmail,
        role: 'student',
        dept: studentDept,
        registrationNumber: regNumber,
        gender: studentGender,
      });

      toast({
        title: 'Account Created',
        description: 'Your student account has been successfully created.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error('Student signup failed:', error);
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== adminConfirmPassword) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Passwords do not match.",
        });
        return;
    }
    // Simple secret key validation. In a real app, this should be more secure.
    if (secretKey !== 'secret') {
         toast({
            variant: "destructive",
            title: "Error",
            description: "Invalid secret key.",
        });
        return;
    }
    setLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        const user = userCredential.user;

        await setDoc(doc(firestore, "users", user.uid), {
            userId: user.uid,
            displayName: adminName,
            email: adminEmail,
            role: "admin",
            dept: adminDept,
        });

        toast({
            title: "Account Created",
            description: "Your admin account has been successfully created.",
        });
        router.push("/login");
    } catch (error: any) {
        console.error("Admin signup failed:", error);
        toast({
            variant: "destructive",
            title: "Signup Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md w-full">
      <CardHeader className="space-y-2 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Choose your role and enter your details to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="student">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student" disabled={loading}>Student</TabsTrigger>
            <TabsTrigger value="admin" disabled={loading}>Administrator</TabsTrigger>
          </TabsList>
          <TabsContent value="student">
            <form onSubmit={handleStudentSubmit} className="grid gap-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="student-name">Name</Label>
                <Input id="student-name" placeholder="John Doe" required value={studentName} onChange={e => setStudentName(e.target.value)} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reg-number">Registration Number</Label>
                <Input id="reg-number" placeholder="CS-2021-001" required value={regNumber} onChange={e => setRegNumber(e.target.value)} disabled={loading}/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-dept">Department</Label>
                <Select onValueChange={setStudentDept} value={studentDept} disabled={loading}>
                  <SelectTrigger id="student-dept">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cs">Computer Science</SelectItem>
                    <SelectItem value="se">Software Engineering</SelectItem>
                    <SelectItem value="math">Mathematics</SelectItem>
                    <SelectItem value="physics">Physics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-gender">Gender</Label>
                <Select onValueChange={setStudentGender} value={studentGender} disabled={loading}>
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
              <div className="grid gap-2">
                <Label htmlFor="student-email">Email</Label>
                <Input id="student-email" type="email" placeholder="m@example.com" required value={studentEmail} onChange={e => setStudentEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-password">Password</Label>
                <Input id="student-password" type="password" required value={studentPassword} onChange={e => setStudentPassword(e.target.value)} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-confirm-password">Confirm Password</Label>
                <Input id="student-confirm-password" type="password" required value={studentConfirmPassword} onChange={e => setStudentConfirmPassword(e.target.value)} disabled={loading} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create student account'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="admin">
            <form onSubmit={handleAdminSubmit} className="grid gap-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-name">Name</Label>
                <Input id="admin-name" placeholder="Admin User" required value={adminName} onChange={e => setAdminName(e.target.value)} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-dept">Department</Label>
                <Input id="admin-dept" placeholder="Administration" required value={adminDept} onChange={e => setAdminDept(e.target.value)} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" placeholder="admin@example.com" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" type="password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-confirm-password">Confirm Password</Label>
                <Input id="admin-confirm-password" type="password" required value={adminConfirmPassword} onChange={e => setAdminConfirmPassword(e.target.value)} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="secret-key">Secret Key</Label>
                <Input id="secret-key" type="password" placeholder="Enter organization secret" required value={secretKey} onChange={e => setSecretKey(e.target.value)} disabled={loading} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create admin account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
