
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
import { Logo } from '@/components/common/Logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { User } from '@/lib/types';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading, userError } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      const checkUserStatusAndRedirect = async () => {
        setLoading(true);

        if (!user.emailVerified) {
          toast({
            variant: 'destructive',
            title: 'Email Not Verified',
            description:
              'Please check your inbox and verify your email address before logging in.',
          });
          await signOut(auth);
          setLoading(false);
          return;
        }

        const userDocRef = doc(firestore, 'users', user.uid);
        let userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // Check for a pending profile
          const pendingProfileRef = doc(firestore, 'userProfiles', user.uid);
          const pendingProfileSnap = await getDoc(pendingProfileRef);

          let userDataFromProfile: Omit<User, 'id' | 'userId' | 'email' | 'emailVerified'> = {
            displayName: user.displayName || user.email || 'New User',
            role: 'student', // Default role for self-signup
            dept: 'Unassigned',
            status: 'active',
          };
          
          if(pendingProfileSnap.exists()) {
            const pendingData = pendingProfileSnap.data();
             userDataFromProfile = {
                displayName: pendingData.displayName,
                role: pendingData.role,
                dept: pendingData.dept,
                status: 'active',
                registrationNumber: pendingData.registrationNumber,
                gender: pendingData.gender,
             }
             // Delete the pending profile
             await deleteDoc(pendingProfileRef);
          }


          const newUser: Omit<User, 'id'> = {
            userId: user.uid,
            email: user.email!,
            emailVerified: true,
            ...userDataFromProfile,
          };

          await setDoc(userDocRef, newUser);
          userDoc = await getDoc(userDocRef); // Re-fetch the document
          toast({
            title: 'Account Verified!',
            description: 'Your profile has been created. Welcome!',
          });
        }
        
        const userData = userDoc.data() as User;
        
        if (userData.status === 'deactivated') {
            toast({
                variant: 'destructive',
                title: 'Account Deactivated',
                description: 'Your account has been deactivated by the Administration. Please contact the support team for further details.',
            });
            await signOut(auth);
            setLoading(false);
            return;
        }

        if (userData.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      };

      checkUserStatusAndRedirect();
    }
  }, [user, isUserLoading, router, firestore, auth, toast]);

  useEffect(() => {
    if (userError) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
      });
      setLoading(false);
    }
  }, [userError, toast]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    initiateEmailSignIn(auth, email, password);
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader className="space-y-2 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <CardDescription>
          Enter your email below to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@sems.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(prev => !prev)}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
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
