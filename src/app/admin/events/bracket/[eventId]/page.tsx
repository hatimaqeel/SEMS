
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Loader } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function BracketPage() {
  const { eventId } = useParams() as { eventId: string };
  const firestore = useFirestore();

  const eventRef = useMemoFirebase(
    () => doc(firestore, 'events', eventId),
    [firestore, eventId]
  );
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);

  if (isLoadingEvent) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin" /> Loading bracket data...
      </div>
    );
  }

  if (!event) {
    return <div>Event not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Bracket for ${event.name}`}
        description="Visualize and manage the tournament bracket."
      />

      <Card>
        <CardHeader>
          <CardTitle>Tournament Bracket</CardTitle>
          <CardDescription>
            This feature is coming soon. The bracket visualization and management
            UI will be displayed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 px-6 bg-muted/50 rounded-lg border-2 border-dashed">
            <p className="font-semibold">Under Construction</p>
            <p className="text-sm text-muted-foreground mt-1">
              The bracket generation logic and UI are being built.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
