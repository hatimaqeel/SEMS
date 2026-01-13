
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
import type { Event, User, JoinRequest, Announcement } from '@/lib/types';
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
import { formatDistanceToNow } from 'date-fns';
import { UpcomingMatchesWidget } from '@/components/common/UpcomingMatchesWidget';
import { RecentResultsWidget } from '@/components/common/RecentResultsWidget';
import { CalendarWidget } from '@/components/common/CalendarWidget';

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

  const isLoading = isUserLoading || isUserDataLoading || isLoadingEvents || isLoadingMyRequests || isLoadingAnnouncements;

  const eventDepartments = useMemo(() => {
    const depts: Record<string, string[]> = {};
    if (events) {
        events.forEach(event => {
            const teamDepts = event.teams?.map(team => team.department) || [];
            depts[event.id!] = [...new Set(teamDepts)];
        });
    }
    return depts;
  }, [events]);


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
  
  const myRequestEvents = upcomingEvents.filter(event => myRequestsByEvent[event.id!]);
  const availableEvents = upcomingEvents.filter(event => !myRequestsByEvent[event.id!]);

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
          className: 'text-muted-foreground bg-muted',
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
            <div className="space-y-4">
              {myRequestEvents.map((event) => {
                const request = myRequestsByEvent[event.id!];
                if (!request) return null;
                const statusInfo = getStatusUi(request.status);
                return (
                  <Card key={event.id} className="transition-all hover:shadow-md">
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-grow">
                            <p className="font-semibold text-foreground">{event.name}</p>
                            <p className="text-sm text-muted-foreground">{event.sportType}</p>
                        </div>
                        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusInfo.className}`}>
                            {statusInfo.icon}
                            <span>{statusInfo.text}</span>
                        </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
                const participatingDepts = eventDepartments[event.id!] || [];
                const isStudentDeptInEvent = participatingDepts.includes(userData.dept);
                
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
                        <span>Organized by: {event.department}</span>
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

    