
'use client';

import { useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'app'), [firestore]);
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);
  
  const [currentSecretKey, setCurrentSecretKey] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');
  const [confirmNewSecretKey, setConfirmNewSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newSecretKey !== confirmNewSecretKey) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'New secret keys do not match.',
      });
      return;
    }
    
    if (newSecretKey.length < 10) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'New secret key must be at least 10 characters long.',
        });
        return;
    }

    setIsSubmitting(true);

    try {
        const settingsDoc = await getDoc(settingsRef);
        const currentSettings = settingsDoc.data() as AppSettings;

        if (currentSettings.secretKey !== currentSecretKey) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'The current secret key is incorrect.',
            });
            setIsSubmitting(false);
            return;
        }

        await updateDoc(settingsRef, { secretKey: newSecretKey });

        toast({
            title: 'Secret Key Updated',
            description: 'The application secret key has been successfully changed.',
        });

        // Clear fields
        setCurrentSecretKey('');
        setNewSecretKey('');
        setConfirmNewSecretKey('');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Application Settings"
        description="Manage global settings for the UniSport Central application."
      />

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Change Secret Key</CardTitle>
            <CardDescription>
              Update the secret key used for creating new administrator accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {isLoadingSettings ? (
                <div className="flex items-center justify-center p-8">
                    <Loader className="animate-spin" /> Loading settings...
                </div>
             ): (
                 <>
                    <div className="space-y-2">
                        <Label htmlFor="current-key">Current Secret Key</Label>
                        <Input
                        id="current-key"
                        type="password"
                        value={currentSecretKey}
                        onChange={(e) => setCurrentSecretKey(e.target.value)}
                        required
                        disabled={isSubmitting}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-key">New Secret Key</Label>
                        <Input
                        id="new-key"
                        type="password"
                        value={newSecretKey}
                        onChange={(e) => setNewSecretKey(e.target.value)}
                        required
                        disabled={isSubmitting}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-key">Confirm New Secret Key</Label>
                        <Input
                        id="confirm-key"
                        type="password"
                        value={confirmNewSecretKey}
                        onChange={(e) => setConfirmNewSecretKey(e.target.value)}
                        required
                        disabled={isSubmitting}
                        />
                    </div>
                 </>
             )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || isLoadingSettings}>
              {isSubmitting ? 'Updating Key...' : 'Update Secret Key'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
