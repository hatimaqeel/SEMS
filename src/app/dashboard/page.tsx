'use client';

import { arrayUnion, collection, doc } from 'firebase/firestore';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  HelpCircle,
  Loader,
  MapPin,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function StudentDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } =
    useDoc<User>(userDocRef);

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader className="h-5 w-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
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
  
  const upcomingEvents = events?.filter((e) => e.status === 'upcoming') || [];
  const myRequests = upcomingEvents.filter(e => e.joinRequests?.some(r => r.userId === user?.uid));
  const availableEvents = upcomingEvents.filter(e => !myRequests.some(mr => mr.id === e.id));


  const getStatusIcon = (status: 'pending' | 'approved' | 'rejected') => {
    switch(status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left Column */}
      <div className="lg:col-span-1 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
             <Avatar className="h-16 w-16">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={userData.displayName}/>}
                <AvatarFallback>{userData.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                 <CardTitle className="text-2xl font-headline">{userData.displayName}</CardTitle>
                 <CardDescription>{userData.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
                <p className="font-semibold text-muted-foreground">Department</p>
                <p>{userData.dept}</p>
            </div>
            {userData.registrationNumber && (
                 <div>
                    <p className="font-semibold text-muted-foreground">Registration #</p>
                    <p>{userData.registrationNumber}</p>
                </div>
            )}
             {userData.gender && (
                 <div>
                    <p className="font-semibold text-muted-foreground">Gender</p>
                    <p className="capitalize">{userData.gender}</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2 space-y-8">
         <div>
            <h2 className="text-2xl font-bold tracking-tight font-headline mb-4">My Registrations</h2>
             {myRequests.length > 0 ? (
                <div className="space-y-4">
                {myRequests.map(event => {
                    const request = event.joinRequests.find(r => r.userId === user?.uid)!;
                    return (
                        <Card key={event.id} className="flex items-center p-4">
                            <div className="flex-grow">
                                <h3 className="font-semibold">{event.name}</h3>
                                <p className="text-sm text-muted-foreground">{event.sportType}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(request.status)}
                                <span className="text-sm font-medium capitalize">{request.status}</span>
                            </div>
                        </Card>
                    )
                })}
                </div>
             ): (
                <p className="text-muted-foreground text-sm">You haven&apos;t requested to join any events yet.</p>
             )}
         </div>

        <Separator />
        
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-headline">Available Events</h2>
          {availableEvents.length > 0 ? (
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {availableEvents.map((event) => {
                const isDeptMatch = event.department === 'All' || event.department === userData.dept;
                const hasAlreadyRequested = event.joinRequests?.some(
                  (req) => req.userId === user?.uid
                );
                
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
                    <CardFooter>
                      <Button
                        className="w-full"
                        disabled={!isDeptMatch || hasAlreadyRequested}
                        onClick={() => handleRequestToJoin(event)}
                      >
                        Request to Join
                        {!hasAlreadyRequested && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </CardFooter>
                     {!isDeptMatch && (
                        <p className="text-xs text-center text-muted-foreground pb-4 px-6">
                            This event is not for your department.
                        </p>
                    )}
                  </Card>
                );
              })}
            </div>
            ) : (
                <p className="text-muted-foreground text-sm mt-4">There are no new events available for registration.</p>
            )}
        </div>
      </div>
    </div>
  );
}
