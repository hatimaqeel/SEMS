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
import { events, users } from "@/lib/placeholder-data";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

export default function StudentDashboardPage() {
  const student = users.find(u => u.role === 'student');

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Welcome, {student?.displayName}!</h1>
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
          <p><strong>Name:</strong> {student?.displayName}</p>
          <p><strong>Email:</strong> {student?.email}</p>
          <p><strong>Department:</strong> {student?.dept}</p>
          <p><strong>Registration #:</strong> {student?.registrationNumber}</p>
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
