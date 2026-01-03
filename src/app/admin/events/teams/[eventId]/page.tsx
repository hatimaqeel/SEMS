
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection, arrayUnion, arrayRemove, getDocs, query, where } from 'firebase/firestore';
import type { Event, JoinRequest, User, Team, Department, Sport } from '@/lib/types';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, PlusCircle, Trash, UserPlus, X, Users } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function ManageTeamsPage() {
  const { eventId } = useParams() as { eventId: string };
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [isPlayerFormOpen, setIsPlayerFormOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDepartment, setTeamDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventRef = useMemoFirebase(() => doc(firestore, 'events', eventId), [firestore, eventId]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);
  
  const sportsRef = useMemoFirebase(() => collection(firestore, 'sports'), [firestore]);
  const { data: sports, isLoading: isLoadingSports } = useCollection<Sport>(sportsRef);

  const departmentsRef = useMemoFirebase(() => collection(firestore, 'departments'), [firestore]);
  const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsRef);

  const joinRequestsRef = useMemoFirebase(() => collection(firestore, 'events', eventId, 'joinRequests'), [firestore, eventId]);
  const { data: joinRequests, isLoading: isLoadingJoinRequests } = useCollection<JoinRequest>(joinRequestsRef);
  
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  const eventSport = useMemo(() => {
    if (!event || !sports) return null;
    return sports.find(s => s.sportName === event.sportType);
  }, [event, sports]);

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
        // Firestore 'in' queries are limited to 30 items. If more are needed, chunking is required.
        if (approvedRequestIds.length > 30) {
            console.warn("More than 30 approved requests, fetching users in chunks may be needed.");
        }
        const q = query(usersRef, where('userId', 'in', approvedRequestIds.slice(0, 30)));
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
    setTeamName('');
    setTeamDepartment('');
    setIsTeamFormOpen(true);
  };

  const handleAddPlayers = (team: Team) => {
    setSelectedTeam(team);
    setIsPlayerFormOpen(true);
  };

  const handleTeamFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !teamDepartment || !event) return;
    setIsSubmitting(true);

    const newTeam: Omit<Team, 'id'> = {
      teamId: doc(collection(firestore, 'temp')).id,
      teamName,
      department: teamDepartment,
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
    setTeamDepartment('');
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
    if (!event || !eventSport) return;
    
    const teamSizeLimit = eventSport.teamSize;
    if (team.players && team.players.length >= teamSizeLimit) {
        toast({
            variant: "destructive",
            title: "Team Full",
            description: `This team cannot have more than ${teamSizeLimit} players.`
        });
        return;
    }

    const updatedTeams = event.teams.map(t => {
      if (t.teamId === team.teamId) {
        const currentPlayers = t.players || [];
        if (currentPlayers.some(p => p.userId === player.userId)) {
          toast({ variant: 'destructive', title: 'Player already in team' });
          return t;
        }
        return { ...t, players: [...currentPlayers, player] };
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


  const isLoading = isLoadingEvent || isLoadingJoinRequests || isLoadingUsers || isLoadingDepts || isLoadingSports;
  
  const assignedPlayerIds = useMemo(() => new Set(event?.teams?.flatMap(t => t.players?.map(p => p.userId) || []) || []), [event?.teams]);
  
  const availablePlayersForSelectedTeam = useMemo(() => {
    if (!selectedTeam) return [];
    return approvedUsers.filter(u => 
      u.dept === selectedTeam.department && !assignedPlayerIds.has(u.userId)
    );
  }, [selectedTeam, approvedUsers, assignedPlayerIds]);


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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
        {event?.teams?.map(team => {
          const teamIsFull = eventSport && team.players.length >= eventSport.teamSize;
          return (
            <Card key={team.teamId} className="flex flex-col">
              <CardHeader className='flex-row items-start justify-between gap-4'>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl whitespace-nowrap overflow-hidden text-ellipsis">{team.teamName}</CardTitle>
                  <CardDescription>{team.department}</CardDescription>
                </div>
                 <div className="flex items-center gap-1 flex-shrink-0">
                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddPlayers(team)}>
                      <UserPlus className="h-4 w-4" />
                   </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTeam(team.teamId)}>
                      <Trash className="h-4 w-4" />
                  </Button>
                 </div>
              </CardHeader>
              <CardContent className="flex-grow">
                  {team.players && team.players.length > 0 ? (
                      <div className="space-y-3">
                          {team.players.map(player => (
                              <div key={player.userId} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <Avatar className="h-6 w-6">
                                          {player.photoURL && <AvatarImage src={player.photoURL} />}
                                          <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className="truncate">{player.displayName}</span>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleRemovePlayerFromTeam(team, player)}>
                                      <X className="h-3 w-3" />
                                  </Button>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground">No players assigned yet.</p>
                  )}
              </CardContent>
              {eventSport && (
                <div className="p-4 border-t">
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Players</span>
                    </div>
                    <Badge variant={teamIsFull ? 'destructive' : 'secondary'}>{team.players.length} / {eventSport.teamSize}</Badge>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
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
            <DialogDescription>Enter a name and department for the new team for {event?.name}.</DialogDescription>
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
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team-dept">Department</Label>
               <Select onValueChange={setTeamDepartment} value={teamDepartment} disabled={isSubmitting || isLoadingDepts} required>
                  <SelectTrigger id="team-dept">
                    <SelectValue placeholder={isLoadingDepts ? "Loading..." : "Select a department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map(dept => (
                       <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <DialogDescription>Select from approved students in the {selectedTeam?.department} department.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
                <div className="space-y-2 pr-4">
                    {availablePlayersForSelectedTeam.length > 0 ? availablePlayersForSelectedTeam.map(player => {
                       const teamIsFull = eventSport ? (selectedTeam?.players?.length || 0) >= eventSport.teamSize : false;
                       return (
                        <div key={player.userId} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Avatar className="h-8 w-8">
                                    {player.photoURL && <AvatarImage src={player.photoURL} />}
                                    <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm truncate">{player.displayName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{player.dept}</p>
                                </div>
                            </div>
                            <Button size="sm" onClick={() => handleAddPlayerToTeam(selectedTeam!, player)} disabled={teamIsFull}>Add</Button>
                        </div>
                       )
                    }) : (
                        <p className="text-sm text-center text-muted-foreground py-8">No available players from this department.</p>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>

    </div>
  );
}
