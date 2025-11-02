'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Event, Team } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
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

export default function EventRegistrationsPage() {
  const { eventId } = useParams() as { eventId: string };
  const firestore = useFirestore();
  const { toast } = useToast();

  const eventRef = useMemoFirebase(
    () => doc(firestore, 'events', eventId),
    [firestore, eventId]
  );
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);

  const handleTeamStatusChange = async (teamId: string, newStatus: 'approved' | 'rejected') => {
    if (!event) return;

    const updatedTeams = event.teams.map(team =>
      team.teamId === teamId ? { ...team, status: newStatus } : team
    );

    const eventDocRef = doc(firestore, 'events', eventId);
    updateDocumentNonBlocking(eventDocRef, { teams: updatedTeams });

    toast({
      title: `Team ${newStatus}`,
      description: `The team has been successfully ${newStatus}.`,
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
  
  const pendingTeams = event?.teams.filter(t => t.status === 'pending') || [];
  const reviewedTeams = event?.teams.filter(t => t.status !== 'pending') || [];


  if (isLoadingEvent) {
    return <div className="flex items-center justify-center p-8"><Loader className="animate-spin" /> Loading registrations...</div>;
  }

  if (!event) {
    return <div>Event not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Registrations for ${event.name}`}
        description="Approve or reject team registration requests for this event."
      />

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>
            These teams are awaiting your approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTeams.length > 0 ? (
                pendingTeams.map(team => (
                  <TableRow key={team.teamId}>
                    <TableCell className="font-medium">{team.teamName}</TableCell>
                    <TableCell>{team.department}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-500 hover:text-green-600"
                        onClick={() => handleTeamStatusChange(team.teamId, 'approved')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleTeamStatusChange(team.teamId, 'rejected')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No pending registration requests.
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
            These teams have already been reviewed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewedTeams.length > 0 ? (
                reviewedTeams.map(team => (
                  <TableRow key={team.teamId}>
                    <TableCell className="font-medium">{team.teamName}</TableCell>
                    <TableCell>{team.department}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(team.status)}>{team.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No reviewed registrations yet.
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
