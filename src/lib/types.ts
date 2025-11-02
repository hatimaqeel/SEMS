
export type Sport = {
  sportId: string;
  sportName: string;
  teamSize: number;
  defaultDurationMinutes: number;
};

export type Venue = {
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
  departmentId: string;
  name: string;
}

export type Event = {
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
  teamId: string;
  teamName: string;
  department: string;
  status: 'approved' | 'pending';
  sportType: string;
  preferredVenues: string[];
  metadata?: any;
};

export type Match = {
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
  userId: string;
  displayName: string;
  role: 'admin' | 'coordinator' | 'referee' | 'student';
  dept: string;
  email: string;
  registrationNumber?: string;
  gender?: 'male' | 'female' | 'other';
};
