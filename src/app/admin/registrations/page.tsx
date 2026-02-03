
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
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
import { Button } from '@/components/ui/button';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';

interface GlobalJoinRequest extends JoinRequest {
    eventId: string;
    eventName: string;
}

export default function GlobalRegistrationsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const eventsRef = useMemoFirebase(() => collection(firestore, 'events'), [firestore]);
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsRef);

  const [allRequests, setAllRequests] = useState<GlobalJoinRequest[]>([]);
  const [isLoadingAllRequests, setIsLoadingAllRequests] = useState(true);

  useEffect(() => {
    if (!events) {
        if (!isLoadingEvents) setIsLoadingAllRequests(false);
        return;
    }
    
    setIsLoadingAllRequests(true);
    const fetchAllJoinRequests = async () => {
        const requests: GlobalJoinRequest[] = [];
        for (const event of events) {
            const joinRequestsRef = collection(firestore, 'events', event.id!, 'joinRequests');
            const querySnapshot = await getDocs(joinRequestsRef);
            querySnapshot.forEach((doc) => {
                requests.push({
                    ...(doc.data() as JoinRequest),
                    id: doc.id,
                    eventId: event.id!,
                    eventName: event.name,
                });
            });
        }
        setAllRequests(requests);
        setIsLoadingAllRequests(false);
    };

    fetchAllJoinRequests();
  }, [events, firestore, isLoadingEvents]);


  const handleRequestStatusChange = (
    eventId: string,
    userId: string,
    newStatus: 'approved' | 'rejected'
  ) => {
    const requestDocRef = doc(firestore, 'events', eventId, 'joinRequests', userId);
    updateDocumentNonBlocking(requestDocRef, { status: newStatus });
    
    // Optimistically update UI
    setAllRequests(prev => prev.map(req => 
        (req.eventId === eventId && req.userId === userId) ? { ...req, status: newStatus } : req
    ));

    toast({
      title: `Request ${newStatus}`,
      description: `The student's request has been ${newStatus}.`,
    });
  };

  const isLoading = isLoadingEvents || isLoadingAllRequests;

  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const reviewedRequests = allRequests.filter((r) => r.status !== 'pending');

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


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Global Registrations"
        description="Approve or reject student join requests across all events."
      />

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>
            These students are awaiting your approval across all events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        <div className="flex justify-center items-center gap-2">
                           <Loader className="animate-spin h-5 w-5"/> Loading requests...
                        </div>
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && pendingRequests.length > 0 ? (
                pendingRequests.map((req) => (
                  <TableRow key={`${req.eventId}-${req.userId}`}>
                    <TableCell className="font-medium">{req.userName}</TableCell>
                    <TableCell>
                      <Button variant="link" asChild className="p-0 h-auto">
                        <Link href={`/admin/events/registrations/${req.eventId}`}>{req.eventName}</Link>
                      </Button>
                    </TableCell>
                    <TableCell>{req.userDept}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-500 hover:text-green-600"
                        onClick={() =>
                          handleRequestStatusChange(req.eventId, req.userId, 'approved')
                        }
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() =>
                          handleRequestStatusChange(req.eventId, req.userId, 'rejected')
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No pending join requests across all events.
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
            A log of all previously reviewed requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                         <div className="flex justify-center items-center gap-2">
                           <Loader className="animate-spin h-5 w-5"/> Loading requests...
                        </div>
                    </TableCell>
                </TableRow>
              )}
              {!isLoading && reviewedRequests.length > 0 ? (
                reviewedRequests.map((req) => (
                  <TableRow key={`${req.eventId}-${req.userId}`}>
                    <TableCell className="font-medium">{req.userName}</TableCell>
                    <TableCell>{req.eventName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : !isLoading && (
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
