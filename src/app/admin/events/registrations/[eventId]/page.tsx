'use client';

import { useParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Event, JoinRequest } from '@/lib/types';
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
import { Check, X, Loader } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Button } from '@/components/ui/button';

export default function EventRegistrationsPage() {
  const { eventId } = useParams() as { eventId: string };
  const firestore = useFirestore();
  const { toast } = useToast();

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
    
  const isLoading = isLoadingEvent || isLoadingJoinRequests;

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.length > 0 ? (
                pendingRequests.map((req) => (
                  <TableRow key={req.userId}>
                    <TableCell className="font-medium">{req.userName}</TableCell>
                    <TableCell>{req.userDept}</TableCell>
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
                  <TableCell colSpan={3} className="text-center h-24">
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
                      <Badge variant={statusVariant(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No reviewed requests yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
