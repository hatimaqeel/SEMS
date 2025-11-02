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
import { doc, getDoc } from 'firebase/firestore';

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
      const checkUserRole = async () => {
        setLoading(true);
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'admin') {
            router.push('/admin/dashboard');
          } else {
            router.push('/dashboard');
          }
        } else {
          // Default redirect if user doc doesn't exist
          router.push('/dashboard');
        }
        setLoading(false);
      };
      checkUserRole();
    }
  }, [user, isUserLoading, router, firestore]);
  
  useEffect(() => {
    if (userError) {
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: userError.message || 'An unexpected error occurred.',
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
