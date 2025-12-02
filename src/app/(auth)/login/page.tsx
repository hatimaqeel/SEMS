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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

        // 1. Check for email verification
        if (!user.emailVerified) {
          toast({
            variant: 'destructive',
            title: 'Email Not Verified',
            description:
              'Please check your inbox and verify your email address before logging in.',
          });
          signOut(auth);
          setLoading(false);
          return;
        }

        const userDocRef = doc(firestore, 'users', user.uid);
        let userDoc = await getDoc(userDocRef);

        // 2. Handle first-time verified login: create the user document
        if (!userDoc.exists()) {
          // This is a minimal user record.
          // In a real app, you might have a "complete profile" step
          // or derive the role/dept from somewhere else.
          // For now, we default to 'student'.
           const newUser: Omit<User, 'id'> = {
            userId: user.uid,
            displayName: user.displayName || user.email || 'New User',
            email: user.email!,
            role: 'student',
            dept: 'Unassigned',
            status: 'active',
            emailVerified: true,
          };
          await setDoc(userDocRef, newUser);
          // Re-fetch the doc after creating it
          userDoc = await getDoc(userDocRef);
           toast({
            title: 'Account Verified!',
            description: 'Your profile has been created. Welcome!',
          });
        }
        
        const userData = userDoc.data() as User;
        
        // Sync Firestore with Auth verification status if it was somehow missed
        if (userData.emailVerified === false) {
            await updateDoc(userDocRef, { emailVerified: true });
        }


        // 3. Handle deactivated user
        if (userData.status === 'deactivated') {
            toast({
                variant: 'destructive',
                title: 'Account Deactivated',
                description: 'Your account has been deactivated by the Administration. Please contact the support team for further details.',
            });
            signOut(auth);
            setLoading(false);
            return;
        }

        // 4. Redirect based on role
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
        <CardTitle className="text-2xl">Login to your account</CardTitle>
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
                placeholder="m@example.com"
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
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
