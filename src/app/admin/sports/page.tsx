"use client";

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
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { sports } from "@/lib/placeholder-data";
import { MoreHorizontal } from "lucide-react";

export default function SportsPage() {
  const handleAddSport = () => {
    // In a real app, this would open a dialog or navigate to a new page
    console.log("Add new sport");
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Sports"
        description="Define the sports that can be part of your tournaments."
        actionButtonText="Add New Sport"
        onActionButtonClick={handleAddSport}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sport Name</TableHead>
                <TableHead>Team Size</TableHead>
                <TableHead>Default Duration (mins)</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sports.map((sport) => (
                <TableRow key={sport.sportId}>
                  <TableCell className="font-medium">{sport.sportName}</TableCell>
                  <TableCell>{sport.teamSize}</TableCell>
                  <TableCell>{sport.defaultDurationMinutes}</TableCell>
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
                        <DropdownMenuItem>Edit Sport</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete Sport
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
