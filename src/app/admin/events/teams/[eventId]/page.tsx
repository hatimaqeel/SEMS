
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, arrayUnion, arrayRemove, getDocs, query, where } from 'firebase/firestore';
import type { Event, JoinRequest, User, Team } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, PlusCircle, Trash, UserPlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ManageTeamsPage() {
  const { eventId } = useParams() as { eventId: string };
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [isPlayerFormOpen, setIsPlayerFormOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventRef = useMemoFirebase(() => doc(firestore, 'events', eventId), [firestore, eventId]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);

  const joinRequestsRef = useMemoFirebase(() => collection(firestore, 'events', eventId, 'joinRequests'), [firestore, eventId]);
  const { data: joinRequests, isLoading: isLoadingJoinRequests } = useCollection<JoinRequest>(joinRequestsRef);
  
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchApprovedUsers = async () => {
      if (!joinRequests || !firestore) {
        if(!isLoadingJoinRequests) setIsLoadingUsers(false);
        return;
      }
      setIsLoadingUsers(true);
      const approvedRequestIds = joinRequests
        .filter(r => r.status === 'approved')
        .map(r => r.userId);

      if (approvedRequestIds.length === 0) {
        setApprovedUsers([]);
        setIsLoadingUsers(false);
        return;
      }
      
      try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('userId', 'in', approvedRequestIds));
        const userSnaps = await getDocs(q);
        const usersData = userSnaps.docs.map(d => d.data() as User);
        setApprovedUsers(usersData);
      } catch (error) {
        console.error("Error fetching approved users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch approved user data."
        })
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchApprovedUsers();
  }, [joinRequests, firestore, toast, isLoadingJoinRequests]);


  const handleAddTeam = () => {
    setIsTeamFormOpen(true);
  };

  const handleAddPlayers = (team: Team) => {
    setSelectedTeam(team);
    setIsPlayerFormOpen(true);
  };

  const handleTeamFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !event) return;
    setIsSubmitting(true);

    const newTeam: Omit<Team, 'id'> = {
      teamId: doc(collection(firestore, 'temp')).id,
      teamName,
      department: event.department,
      players: [], 
      sportType: event.sportType,
      status: 'approved',
      preferredVenues: [],
    };

    updateDocumentNonBlocking(eventRef, { teams: arrayUnion(newTeam) });

    toast({ title: 'Team Created', description: `"${teamName}" has been added.` });
    setIsSubmitting(false);
    setIsTeamFormOpen(false);
    setTeamName('');
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!event) return;
    const teamToDelete = event.teams.find(t => t.teamId === teamId);
    if (teamToDelete) {
        updateDocumentNonBlocking(eventRef, { teams: arrayRemove(teamToDelete) });
        toast({ title: 'Team Deleted', description: `The team has been deleted.` });
    }
  };

  const handleAddPlayerToTeam = (team: Team, player: User) => {
    if (!event) return;
    const updatedTeams = event.teams.map(t => {
      if (t.teamId === team.teamId) {
        const newPlayers = t.players ? [...t.players, player] : [player];
        return { ...t, players: newPlayers };
      }
      return t;
    });
    updateDocumentNonBlocking(eventRef, { teams: updatedTeams });
    toast({ title: 'Player Added', description: `${player.displayName} added to ${team.teamName}.` });
  };
  
  const handleRemovePlayerFromTeam = (team: Team, player: User) => {
    if (!event) return;
     const updatedTeams = event.teams.map(t => {
      if (t.teamId === team.teamId) {
        return { ...t, players: t.players.filter(p => p.userId !== player.userId) };
      }
      return t;
    });
    updateDocumentNonBlocking(eventRef, { teams: updatedTeams });
    toast({ title: 'Player Removed', description: `${player.displayName} removed from ${team.teamName}.` });
  };


  const isLoading = isLoadingEvent || isLoadingJoinRequests || isLoadingUsers;
  
  const assignedPlayerIds = new Set(event?.teams?.flatMap(t => t.players?.map(p => p.userId) || []) || []);
  const availablePlayers = approvedUsers.filter(u => !assignedPlayerIds.has(u.userId));

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader className="animate-spin" /> Loading team data...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Teams for ${event?.name}`}
        description="Create teams and assign approved students."
      >
        <Button onClick={handleAddTeam}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Team
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {event?.teams?.map(team => (
          <Card key={team.teamId}>
            <CardHeader className='flex-row items-center justify-between'>
              <CardTitle>{team.teamName}</CardTitle>
               <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddPlayers(team)}>
                    <UserPlus className="h-4 w-4" />
                 </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTeam(team.teamId)}>
                    <Trash className="h-4 w-4" />
                </Button>
               </div>
            </CardHeader>
            <CardContent>
                {team.players && team.players.length > 0 ? (
                    <div className="space-y-3">
                        {team.players.map(player => (
                            <div key={player.userId} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        {player.photoURL && <AvatarImage src={player.photoURL} />}
                                        <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{player.displayName}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemovePlayerFromTeam(team, player)}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No players assigned yet.</p>
                )}
            </CardContent>
          </Card>
        ))}
      </div>

       {event?.teams?.length === 0 && !isLoading && (
         <div className="text-center py-10 px-6 bg-muted/50 rounded-lg border-2 border-dashed">
            <p className="font-semibold">No Teams Created Yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Create New Team" to start building your teams.</p>
        </div>
       )}

      {/* Create Team Dialog */}
      <Dialog open={isTeamFormOpen} onOpenChange={setIsTeamFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
            <DialogDescription>Enter a name for the new team for {event?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTeamFormSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g., CS Warriors"
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Team'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      
       {/* Add Player Dialog */}
      <Dialog open={isPlayerFormOpen} onOpenChange={setIsPlayerFormOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Add Players to {selectedTeam?.teamName}</DialogTitle>
                <DialogDescription>Select from the list of approved and available students.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
                <div className="space-y-2 pr-4">
                    {availablePlayers.length > 0 ? availablePlayers.map(player => (
                        <div key={player.userId} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    {player.photoURL && <AvatarImage src={player.photoURL} />}
                                    <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{player.displayName}</p>
                                    <p className="text-xs text-muted-foreground">{player.dept}</p>
                                </div>
                            </div>
                            <Button size="sm" onClick={() => handleAddPlayerToTeam(selectedTeam!, player)}>Add</Button>
                        </div>
                    )) : (
                        <p className="text-sm text-center text-muted-foreground py-8">No available players to add.</p>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>

    </div>
  );
}
