'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader, Send } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function RegisterTeamPage() {
  const { eventId } = useParams() as { eventId: string };
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [teamName, setTeamName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventRef = useMemoFirebase(
    () => doc(firestore, 'events', eventId),
    [firestore, eventId]
  );
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !user || !teamName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Team name is required.',
      });
      return;
    }
    setIsSubmitting(true);

    const userDocRef = doc(firestore, 'users', user.uid);
    const userSnap = await (await import('firebase/firestore')).getDoc(userDocRef);
    const userData = userSnap.data();

    if (!userData) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find user data.' });
      setIsSubmitting(false);
      return;
    }

    const newTeam = {
      teamId: doc(collection(firestore, 'dummy')).id, // Generate a unique ID
      teamName: teamName.trim(),
      department: userData.dept,
      status: 'pending' as const,
      sportType: event.sportType,
      preferredVenues: [], // This can be enhanced later
    };

    const eventDocRef = doc(firestore, 'events', eventId);
    updateDocumentNonBlocking(eventDocRef, {
        teams: arrayUnion(newTeam)
    });


    toast({
      title: 'Registration Submitted',
      description: `Your request to register "${teamName}" has been sent for approval.`,
    });

    setIsSubmitting(false);
    router.push('/dashboard');
  };
  
  if (isLoadingEvent) {
    return <div className="flex items-center justify-center p-8"><Loader className="animate-spin" /> Loading event details...</div>;
  }
  
  if (!event) {
    return <div className="text-center p-8">Event not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <PageHeader
        title={`Register for ${event.name}`}
        description={`Create your team to compete in this ${event.sportType} event.`}
      />
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Team Details</CardTitle>
            <CardDescription>
              Enter a name for your team. Your department will be automatically set to
              <span className="font-bold"> {event.department}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="e.g., The Code Breakers"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <div className="p-6 pt-0">
             <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Approval
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
