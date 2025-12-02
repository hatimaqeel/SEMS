'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
import { useAuth, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { collection } from 'firebase/firestore';
import type { Department } from '@/lib/types';
import { MailCheck } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  // Student form state
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState('');

  // Admin form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  
  const departmentsRef = useMemoFirebase(() => collection(firestore, 'departments'), [firestore]);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsRef);

  const handleSubmit = (email: string, password:  string, confirmPass: string, isAdmin: boolean) => {
    if (password !== confirmPass) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Passwords do not match.',
      });
      return;
    }
    
    if (isAdmin) {
      const ADMIN_SECRET_KEY = 'unisport@cust2025';
      if (secretKey !== ADMIN_SECRET_KEY) {
          toast({
              variant: "destructive",
              title: "Error",
              description: "Invalid secret key.",
          });
          return;
      }
    }

    setLoading(true);
    initiateEmailSignUp(auth, email, password)
        .then(() => {
            setSignupComplete(true);
            setLoading(false);
        })
        .catch(error => {
             toast({
                variant: 'destructive',
                title: 'Signup Failed',
                description: error.message || 'An unexpected error occurred.',
            });
            setLoading(false);
        });
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(studentEmail, studentPassword, studentConfirmPassword, false);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(adminEmail, adminPassword, adminConfirmPassword, true);
  }
  
  if (signupComplete) {
    return (
        <Card className="mx-auto max-w-md w-full">
            <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                   <MailCheck className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription>
                    We&apos;ve sent a verification link to your email address. Please check your inbox and click the link to activate your account.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="w-full">
                    <Link href="/login">Back to Login</Link>
                </Button>
            </CardContent>
        </Card>
    )
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
                <Input id="student-name" placeholder="John Doe" required disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reg-number">Registration Number</Label>
                <Input id="reg-number" placeholder="CS-2021-001" required disabled={loading}/>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-dept">Department</Label>
                <Select disabled={loading || isLoadingDepts} required>
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
                <Label htmlFor="student-gender">Gender</Label>
                <Select disabled={loading} required>
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
                <Input id="admin-name" placeholder="Admin User" required disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-dept">Department</Label>
                <Input id="admin-dept" placeholder="Administration" required disabled={loading} />
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
