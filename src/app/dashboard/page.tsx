'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { events } from "@/lib/placeholder-data";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import type { User } from "@/lib/types";
import { doc } from "firebase/firestore";

export default function StudentDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  if (isUserLoading || isUserDataLoading) {
    return <div className="flex items-center justify-center"><p>Loading dashboard...</p></div>
  }

  if (!userData) {
     return <div className="flex items-center justify-center"><p>Could not load user data.</p></div>
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Welcome, {userData.displayName}!</h1>
        <p className="text-muted-foreground mt-1">
          Here are the upcoming events you can join.
        </p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Your personal and department information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Name:</strong> {userData.displayName}</p>
          <p><strong>Email:</strong> {userData.email}</p>
          <p><strong>Department:</strong> {userData.dept}</p>
          <p><strong>Registration #:</strong> {userData.registrationNumber}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline">Available Events</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.filter(e => e.status === 'upcoming').map(event => (
            <Card key={event.eventId} className="flex flex-col">
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <Badge variant="secondary" className="w-fit">{event.sportType}</Badge>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                 <div className="flex items-center text-muted-foreground text-sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Starts: {new Date(event.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-muted-foreground text-sm">
                  <MapPin className="mr-2 h-4 w-4" />
                  <span>Organized by: {event.department}</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button asChild className="w-full">
                  <Link href="#">
                    Register Team <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
