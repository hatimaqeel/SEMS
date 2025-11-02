
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { User } from "@/lib/types";
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
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UsersPage() {
  const firestore = useFirestore();
  const usersRef = useMemoFirebase(
    () => collection(firestore, "users"),
    [firestore]
  );
  const { data: users, isLoading } = useCollection<User>(usersRef);

  const handleAddUser = () => {
    // In a real app, this would open a dialog or navigate to a new page
    console.log("Add new user");
  };

  const roleVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "coordinator":
        return "secondary";
      case "referee":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manage Users"
        description="View and manage all users with access to the system."
      >
        <Button onClick={handleAddUser}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Loading users...
                  </TableCell>
                </TableRow>
              )}
              {users && users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName}/>}
                            <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-0.5">
                            <span className="font-medium">{user.displayName}</span>
                            <span className="text-xs text-muted-foreground">{user.registrationNumber}</span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.dept}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
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
                        <DropdownMenuItem>Edit User</DropdownMenuItem>
                        <DropdownMenuItem>Change Role</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Deactivate User
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
