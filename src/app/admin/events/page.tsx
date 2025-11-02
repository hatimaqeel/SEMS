"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { events } from "@/lib/placeholder-data";
import { MoreHorizontal } from "lucide-react";

export default function EventsPage() {
  const router = useRouter();

  const handleAddEvent = () => {
    // In a real app, this would navigate to a create event page
    console.log("Navigate to add event page");
    // router.push("/admin/events/new");
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "upcoming":
        return "default";
      case "ongoing":
        return "secondary";
      case "completed":
        return "outline";
      default:
        return "destructive";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Events"
        description="Here you can create, view, and manage all sports events."
        actionButtonText="Add New Event"
        onActionButtonClick={handleAddEvent}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.eventId}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{event.sportType}</TableCell>
                  <TableCell>{new Date(event.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                  </TableCell>
                  <TableCell>{event.teams.length}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit Event</DropdownMenuItem>
                        <DropdownMenuItem>View Bracket</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
