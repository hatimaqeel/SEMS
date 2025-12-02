

export type AppSettings = {
    secretKey: string;
    eventSchedulingWindowMonths?: number;
}

export type Sport = {
  id?: string;
  sportId: string;
  sportName: string;
  teamSize: number;
  defaultDurationMinutes: number;
};

export type Venue = {
  id?: string;
  venueId: string;
  name: string;
  location: string;
  capacity: number;
  reservations: {
    matchId: string;
    startTime: string;
    endTime: string;
  }[];
};

export type Department = {
  id?: string;
  departmentId: string;
  name: string;
}

export type Event = {
  id?: string;
  eventId: string;
  name:string;
  sportType: string;
  department: string;
  venueId: string;
  startDate: string;
  startTime: string;
  description: string;
  durationDays: number;
  settings: {
    format: 'round-robin' | 'knockout';
    restMinutes: number;
    allowSameDeptMatches: boolean;
  };
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  teams: Team[];
  matches: Match[];
};

export type Team = {
  id?: string;
  teamId: string;
  teamName: string;
  department: string;
  players: User[]; 
  sportType: string;
  status?: 'approved' | 'pending' | 'rejected';
  preferredVenues?: string[];
};

export type Match = {
  id?: string;
  matchId: string;
  teamAId: string;
  teamBId: string;
  sportType: string;
  venueId: string;
  startTime: string;
  endTime:string;
  round: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  winnerTeamId?: string;
};

export type User = {
  id?: string;
  userId: string;
  displayName: string;
  role: 'admin' | 'coordinator' | 'referee' | 'student';
  dept: string;
  email: string;
  status?: 'active' | 'deactivated';
  registrationNumber?: string;
  gender?: 'male' | 'female' | 'other';
  photoURL?: string;
};

export type JoinRequest = {
  id?: string; // Doc ID is the user ID
  userId: string;
  userName: string;
  userDept: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type Bracket = {
  id: string; // Event ID
  rounds: {
    roundIndex: number;
    roundName: string;
    matches: string[]; // This will now store match IDs
  }[];
};
