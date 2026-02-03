'use client';

import { useParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Event, JoinRequest, Venue } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader, Calendar } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function EventRegistrationsPage() {
  const { eventId } = useParams() as { eventId: string };
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedUserSchedule, setSelectedUserSchedule] = useState<{
    userName: string;
    matches: any[];
  } | null>(null);

  const eventRef = useMemoFirebase(
    () => doc(firestore, 'events', eventId),
    [firestore, eventId]
  );
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);

  const joinRequestsRef = useMemoFirebase(
    () => collection(firestore, 'events', eventId, 'joinRequests'),
    [firestore, eventId]
  );
  const {
    data: joinRequests,
    isLoading: isLoadingJoinRequests,
  } = useCollection<JoinRequest>(joinRequestsRef);

  // Fetch all events to check for player schedules
  const allEventsRef = useMemoFirebase(() => collection(firestore, 'events'), [firestore]);
  const { data: allEvents, isLoading: isLoadingAllEvents } = useCollection<Event>(allEventsRef);
  
  // Fetch venues to display venue names
  const venuesRef = useMemoFirebase(() => collection(firestore, 'venues'), [firestore]);
  const { data: venues, isLoading: isLoadingVenues } = useCollection<Venue>(venuesRef);

  const getVenueName = (venueId: string) => {
    return venues?.find(v => v.id === venueId)?.name || 'N/A';
  }

  const playerSchedules = useMemo(() => {
    const schedules = new Map<string, any[]>();
    if (!allEvents || !joinRequests) return schedules;

    const userIdsInRequests = joinRequests.map(req => req.userId);

    for (const userId of userIdsInRequests) {
        const userMatches = [];
        for (const event of allEvents) {
            for (const match of event.matches) {
                if (match.status !== 'scheduled' || !match.startTime) continue;
                
                const teamA = event.teams.find(t => t.teamId === match.teamAId);
                const teamB = event.teams.find(t => t.teamId === match.teamBId);

                const playerInTeamA = teamA?.players?.some(p => p.userId === userId);
                const playerInTeamB = teamB?.players?.some(p => p.userId === userId);

                if (playerInTeamA || playerInTeamB) {
                    userMatches.push({
                        ...match,
                        eventName: event.name,
                    });
                }
            }
        }
        // Sort matches by start time
        userMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        schedules.set(userId, userMatches);
    }

    return schedules;
  }, [allEvents, joinRequests]);

  const handleRequestStatusChange = async (
    userId: string,
    newStatus: 'approved' | 'rejected'
  ) => {
    if (!event) return;

    const requestDocRef = doc(
      firestore,
      'events',
      eventId,
      'joinRequests',
      userId
    );
    updateDocumentNonBlocking(requestDocRef, { status: newStatus });

    toast({
      title: `Request ${newStatus}`,
      description: `The student's request has been ${newStatus}.`,
    });
  };

  const handleViewSchedule = (request: JoinRequest) => {
    setSelectedUserSchedule({
      userName: request.userName,
      matches: playerSchedules.get(request.userId) || [],
    });
    setIsScheduleModalOpen(true);
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const pendingRequests =
    joinRequests?.filter((r) => r.status === 'pending') || [];
  const reviewedRequests =
    joinRequests?.filter((r) => r.status !== 'pending') || [];
    
  const isLoading = isLoadingEvent || isLoadingJoinRequests || isLoadingAllEvents || isLoadingVenues;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin" /> Loading registrations...
      </div>
    );
  }

  if (!event) {
    return <div>Event not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Registrations for ${event.name}`}
        description="Approve or reject student join requests for this event."
      />

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>
            These students are awaiting your approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.length > 0 ? (
                pendingRequests.map((req) => (
                  <TableRow key={req.userId}>
                    <TableCell className="font-medium">{req.userName}</TableCell>
                    <TableCell>{req.userDept}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewSchedule(req)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-500 hover:text-green-600"
                        onClick={() =>
                          handleRequestStatusChange(req.userId, 'approved')
                        }
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() =>
                          handleRequestStatusChange(req.userId, 'rejected')
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No pending join requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reviewed Requests</CardTitle>
          <CardDescription>
            These students have already been reviewed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewedRequests.length > 0 ? (
                reviewedRequests.map((req) => (
                  <TableRow key={req.userId}>
                    <TableCell className="font-medium">{req.userName}</TableCell>
                    <TableCell>{req.userDept}</TableCell>
                    <TableCell>
                       <Button variant="outline" size="sm" onClick={() => handleViewSchedule(req)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No reviewed requests yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule for {selectedUserSchedule?.userName}</DialogTitle>
            <DialogDescription>
              This user is scheduled for the following matches across all events.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-1 space-y-3">
            {selectedUserSchedule?.matches && selectedUserSchedule.matches.length > 0 ? (
              selectedUserSchedule.matches.map(match => (
                <div key={match.matchId} className="p-3 rounded-lg border bg-muted/50">
                  <p className="font-semibold">{match.eventName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(match.startTime).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(match.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Venue: {getVenueName(match.venueId)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No matches scheduled for this user yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
