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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Logo } from '@/components/common/Logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { collection, doc, setDoc } from 'firebase/firestore';
import type { Department } from '@/lib/types';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function SignupPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const departmentsRef = useMemoFirebase(() => collection(firestore, 'departments'), [firestore]);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Passwords do not match.',
      });
      setLoading(false);
      return;
    }

    try {
      const userCredential = await initiateEmailSignUp(auth, email, password);
      const user = userCredential.user;

      // Store the profile details in userProfiles collection
      const profileData = {
        displayName: name,
        email: email,
        role: 'student',
        dept: department,
        registrationNumber: regNumber,
        gender: gender,
      };

      const userProfileRef = doc(firestore, 'userProfiles', user.uid);
      setDocumentNonBlocking(userProfileRef, profileData, {});
      
      setSignupComplete(true);
    } catch(error: any) {
         toast({
            variant: 'destructive',
            title: 'Signup Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
      setLoading(false);
    }
  };
  
  if (signupComplete) {
    return (
        <Card className="mx-auto max-w-md w-full">
            <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                   <MailCheck className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription>
                    We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
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
        <Logo />
        <CardTitle className="text-2xl">Create a Student Account</CardTitle>
        <CardDescription>
          Enter your details below to register.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="student-name">Name</Label>
              <Input id="student-name" placeholder="John Doe" required disabled={loading} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reg-number">Registration Number</Label>
              <Input id="reg-number" placeholder="CS-2021-001" required disabled={loading} value={regNumber} onChange={e => setRegNumber(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="student-dept">Department</Label>
              <Select disabled={loading || isLoadingDepts} required onValueChange={setDepartment} value={department}>
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
              <Select disabled={loading} required onValueChange={setGender} value={gender}>
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
              <Input id="student-email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="student-password">Password</Label>
              <Input id="student-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="student-confirm-password">Confirm Password</Label>
              <Input id="student-confirm-password" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create student account'}
            </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </div>
        <div className="mt-6 text-center">
            <Button variant="link" asChild className="text-muted-foreground">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

    