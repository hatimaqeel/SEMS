'use client';

import {
  arrayUnion,
  collection,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { ArrowRight, Calendar, Loader, MapPin } from 'lucide-react';
import Link from 'next/link';
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
} from '@/firebase';
import type { Event, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function StudentDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  const eventsRef = useMemoFirebase(
    () => collection(firestore, 'events'),
    [firestore]
  );
  const { data: events, isLoading: isLoadingEvents } =
    useCollection<Event>(eventsRef);

  const handleRequestToJoin = async (event: Event) => {
    if (!user || !userData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to join an event.',
      });
      return;
    }

    const eventDocRef = doc(firestore, 'events', event.id!);

    const newRequest = {
      userId: user.uid,
      userName: userData.displayName,
      userDept: userData.dept,
      status: 'pending' as const,
    };

    updateDocumentNonBlocking(eventDocRef, {
      joinRequests: arrayUnion(newRequest),
    });

    toast({
      title: 'Request Sent',
      description: `Your request to join "${event.name}" has been sent for approval.`,
    });
  };

  const isLoading = isUserLoading || isUserDataLoading || isLoadingEvents;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin" /> Loading dashboard...
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center">
        <p>Could not load user data.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Welcome, {userData.displayName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here are the upcoming events you can join.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>
            Your personal and department information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <strong>Name:</strong> {userData.displayName}
          </p>
          <p>
            <strong>Email:</strong> {userData.email}
          </p>
          <p>
            <strong>Department:</strong> {userData.dept}
          </p>
          {userData.registrationNumber && (
            <p>
              <strong>Registration #:</strong> {userData.registrationNumber}
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline">
          Available Events
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events
            ?.filter((e) => e.status === 'upcoming')
            .map((event) => {
              const isDeptMatch = event.department === 'All' || event.department === userData.dept;
              const hasAlreadyRequested = event.joinRequests?.some(
                (req) => req.userId === user?.uid
              );
              const requestStatus = hasAlreadyRequested
                ? event.joinRequests?.find((req) => req.userId === user?.uid)
                    ?.status
                : null;

              let buttonText = 'Request to Join';
              if (requestStatus === 'pending') {
                buttonText = 'Request Pending';
              } else if (requestStatus === 'approved') {
                buttonText = 'Approved';
              } else if (requestStatus === 'rejected') {
                buttonText = 'Request Rejected';
              }
              
              return (
                <Card key={event.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{event.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {event.sportType}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2">
                    <div className="flex items-center text-muted-foreground text-sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>
                        Starts: {new Date(event.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>
                        Organized by: {event.department} Department
                      </span>
                    </div>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button
                      className="w-full"
                      disabled={!isDeptMatch || hasAlreadyRequested}
                      onClick={() => handleRequestToJoin(event)}
                    >
                      {buttonText}
                      {!hasAlreadyRequested && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                    {!isDeptMatch && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        This event is not for your department.
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
