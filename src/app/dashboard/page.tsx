'use client';

import { collection, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  HelpCircle,
  Loader,
  MapPin,
  XCircle,
  Megaphone,
  Info,
  AlertTriangle,
  Award,
  CalendarClock,
  Users
} from 'lucide-react';
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Event, User, JoinRequest, Announcement, Venue } from '@/lib/types';
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
import { useEffect, useState, useMemo } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { UpcomingMatchesWidget } from '@/components/common/UpcomingMatchesWidget';
import { RecentResultsWidget } from '@/components/common/RecentResultsWidget';
import { CalendarWidget } from '@/components/common/CalendarWidget';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const announcementIcons = {
  info: <Info className="h-5 w-5 text-blue-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  success: <Award className="h-5 w-5 text-green-500" />,
  deadline: <CalendarClock className="h-5 w-5 text-red-500" />,
};

export default function StudentDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  const eventsRef = useMemoFirebase(() => collection(firestore, 'events'), [firestore]);
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsRef);
  
  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);

  const announcementsRef = useMemoFirebase(() => query(
    collection(firestore, 'announcements'),
    orderBy('createdAt', 'desc'),
    limit(5)
  ), [firestore]);
  const { data: announcements, isLoading: isLoadingAnnouncements } = useCollection<Announcement>(announcementsRef);


  const [myRequestsByEvent, setMyRequestsByEvent] = useState<Record<string, JoinRequest | null>>({});
  const [isLoadingMyRequests, setIsLoadingMyRequests] = useState(true);

  useEffect(() => {
    if (!user || !events || events.length === 0) {
      if (!isLoadingEvents) {
        setIsLoadingMyRequests(false);
      }
      return;
    }

    const fetchAllRequests = async () => {
      setIsLoadingMyRequests(true);
      const requests: Record<string, JoinRequest | null> = {};
      const requestPromises = events.map(async (event) => {
        const requestRef = doc(firestore, 'events', event.id!, 'joinRequests', user.uid);
        try {
            const requestSnap = await getDoc(requestRef);
            if (requestSnap.exists()) {
            requests[event.id!] = requestSnap.data() as JoinRequest;
            } else {
            requests[event.id!] = null;
            }
        } catch (error) {
            console.error(`Could not fetch join request for event ${event.id}:`, error);
            requests[event.id!] = null;
        }
      });
      await Promise.all(requestPromises);
      setMyRequestsByEvent(requests);
      setIsLoadingMyRequests(false);
    };

    fetchAllRequests();
  }, [user, events, firestore, isLoadingEvents]);

  const handleRequestToJoin = async (event: Event) => {
    if (!user || !userData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to join an event.',
      });
      return;
    }

    const joinRequestRef = doc(firestore, 'events', event.id!, 'joinRequests', user.uid);
    const newRequest: JoinRequest = {
      userId: user.uid,
      userName: userData.displayName,
      userDept: userData.dept,
      status: 'pending' as const,
    };
    setDocumentNonBlocking(joinRequestRef, newRequest, {});

    // Optimistically update local state
    setMyRequestsByEvent(prev => ({ ...prev, [event.id!]: newRequest }));

    toast({
      title: 'Request Sent',
      description: `Your request to join "${event.name}" has been sent.`,
    });
  };

  const myMatchesByEvent = useMemo(() => {
    if (!user || !events) return {};

    const result: Record<string, Event['matches']> = {};

    for (const event of events) {
        const request = myRequestsByEvent[event.id!];
        if (request?.status !== 'approved') continue;

        const myTeam = event.teams.find(team => team.players?.some(p => p.userId === user.uid));
        if (!myTeam) continue;

        const myScheduledMatches = event.matches.filter(match => 
            (match.teamAId === myTeam.teamId || match.teamBId === myTeam.teamId) && match.status === 'scheduled'
        ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        if (myScheduledMatches.length > 0) {
            result[event.id!] = myScheduledMatches;
        }
    }
    return result;
  }, [user, events, myRequestsByEvent]);

  const isLoading = isUserLoading || isUserDataLoading || isLoadingEvents || isLoadingMyRequests || isLoadingAnnouncements || isLoadingVenues;

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Could not load user data.</p>
      </div>
    );
  }

  const upcomingEvents = events?.filter((e) => e.status === 'upcoming') || [];
  
  const myRequestEvents = events?.filter(event => myRequestsByEvent[event.id!]) || [];
  
  const availableEvents = upcomingEvents.filter(event => {
    if (myRequestsByEvent[event.id!]) {
      return false; // Already requested, so not "available"
    }
    const allowedDepartments = event.department || [];
    if (allowedDepartments.includes('All Departments')) {
      return true;
    }
    return allowedDepartments.includes(userData.dept);
  });

  const getStatusUi = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: 'Approved',
          className: 'text-green-500 bg-green-500/10',
        };
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          text: 'Pending',
          className: 'text-yellow-500 bg-yellow-500/10',
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: 'Rejected',
          className: 'text-red-500 bg-red-500/10',
        };
      default:
        return {
          icon: <HelpCircle className="h-5 w-5 text-muted-foreground" />,
          text: 'Unknown',
          className: 'text-muted bg-muted',
        };
    }
  };

  return (
    <div className="grid gap-12 md:grid-cols-12">
      {/* Left Column */}
      <aside className="md:col-span-4 lg:col-span-3">
        <div className="sticky top-20 space-y-8">
          <Card className="border-primary/20 bg-card shadow-lg">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={userData.displayName} />}
                <AvatarFallback className="text-3xl bg-primary/20 text-primary-foreground">
                    {userData.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold font-headline text-foreground">{userData.displayName}</h1>
              <p className="text-sm text-muted-foreground">{userData.email}</p>
              <p className="text-sm text-muted-foreground font-semibold mt-1">{userData.dept}</p>
            </CardContent>
          </Card>
           <CalendarWidget />
           <UpcomingMatchesWidget />
           <RecentResultsWidget />
        </div>
      </aside>

      {/* Right Column */}
      <div className="md:col-span-8 lg:col-span-9 space-y-12">
         <section>
          <h2 className="text-3xl font-bold tracking-tight font-headline mb-6">Latest Announcements</h2>
           {announcements && announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                  <div className="flex-shrink-0 pt-1">
                    {announcementIcons[item.type]}
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-6 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">No new announcements right now.</p>
                <p className="text-sm text-muted-foreground/80 mt-1">Check back later for updates!</p>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-bold tracking-tight font-headline mb-6">My Registrations</h2>
          {myRequestEvents.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {myRequestEvents.map((event) => {
                const request = myRequestsByEvent[event.id!];
                if (!request) return null;
                const statusInfo = getStatusUi(request.status);
                const myMatches = myMatchesByEvent[event.id!];

                return (
                  <AccordionItem value={event.id!} key={event.id!} className="border-b-0">
                    <Card className="transition-all hover:shadow-md w-full">
                      <AccordionTrigger className="w-full p-4 hover:no-underline [&[data-state=open]]:border-b">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex-grow text-left">
                            <p className="font-semibold text-foreground">{event.name}</p>
                            <p className="text-sm text-muted-foreground">{event.sportType}</p>
                          </div>
                          <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusInfo.className}`}>
                            {statusInfo.icon}
                            <span>{statusInfo.text}</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-4">
                        {request.status === 'approved' ? (
                          myMatches && myMatches.length > 0 ? (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm mb-2">Your Upcoming Matches:</h4>
                              {myMatches.map(match => {
                                const myTeam = event.teams.find(team => team.players?.some(p => p.userId === user?.uid));
                                const opponent = event.teams.find(t => t.teamId === (match.teamAId === myTeam?.teamId ? match.teamBId : match.teamAId));
                                return (
                                  <div key={match.matchId} className="text-sm p-3 bg-muted/50 rounded-lg">
                                    <p><strong>Opponent:</strong> {opponent?.teamName || 'TBD'}</p>
                                    <div className="flex items-center mt-1 text-xs text-muted-foreground">
                                        <Calendar className="mr-1.5 h-3 w-3" />
                                        {format(parseISO(match.startTime), 'PPP')}
                                    </div>
                                    <div className="flex items-center mt-1 text-xs text-muted-foreground">
                                        <Clock className="mr-1.5 h-3 w-3" />
                                        {format(parseISO(match.startTime), 'p')}
                                    </div>
                                    <div className="flex items-center mt-1 text-xs text-muted-foreground">
                                        <MapPin className="mr-1.5 h-3 w-3" />
                                        {venues?.find(v => v.id === match.venueId)?.name || 'TBD'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center text-sm text-muted-foreground pt-2">
                              Your schedule for this event is not available yet.
                            </div>
                          )
                        ) : (
                           <div className="text-center text-sm text-muted-foreground pt-2">
                              Your request is {request.status}. Once approved, your schedule will appear here.
                            </div>
                        )}
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center py-10 px-6 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">You haven't requested to join any events yet.</p>
                <p className="text-sm text-muted-foreground/80 mt-1">Check out the available events below!</p>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-bold tracking-tight font-headline mb-6">Available Events</h2>
          {availableEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {availableEvents.map((event) => {
                const allowedDepartments = event.department || [];
                const isStudentDeptInEvent = allowedDepartments.includes('All Departments') || allowedDepartments.includes(userData.dept);
                
                return (
                  <Card key={event.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                    <CardHeader>
                      <CardTitle className="font-headline text-xl">{event.name}</CardTitle>
                      <Badge variant="secondary" className="w-fit">{event.sportType}</Badge>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                      <div className="flex items-center text-muted-foreground text-sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Starts: {new Date(event.startDate).toLocaleDateString()}</span>
                      </div>
                       <div className="flex items-center text-muted-foreground text-sm">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Organized by: {Array.isArray(event.department) ? event.department.join(', ') : event.department}</span>
                      </div>
                      <p className="text-sm text-muted-foreground/80 pt-2 line-clamp-2">{event.description}</p>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch p-4">
                      <Button
                        className="w-full"
                        disabled={!isStudentDeptInEvent}
                        onClick={() => handleRequestToJoin(event)}
                      >
                        Request to Join
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      {!isStudentDeptInEvent && (
                        <p className="text-xs text-center text-red-500/80 pt-2">
                            This event is not available for your department.
                        </p>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
             <div className="text-center py-10 px-6 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">There are no new events available for registration.</p>
                <p className="text-sm text-muted-foreground/80 mt-1">Check back later for more opportunities!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
