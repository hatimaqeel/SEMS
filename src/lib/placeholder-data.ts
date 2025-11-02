import type { Sport, Venue, Event, User, Team, Match } from './types';

export const sports: Sport[] = [
  { sportId: 'sp01', sportName: 'Cricket', teamSize: 11, defaultDurationMinutes: 120 },
  { sportId: 'sp02', sportName: 'Football', teamSize: 11, defaultDurationMinutes: 90 },
  { sportId: 'sp03', sportName: 'Basketball', teamSize: 5, defaultDurationMinutes: 48 },
  { sportId: 'sp04', sportName: 'Volleyball', teamSize: 6, defaultDurationMinutes: 60 },
];

export const venues: Venue[] = [
  { venueId: 'vn01', name: 'Main Ground', location: 'Central Campus', capacity: 5000, reservations: [] },
  { venueId: 'vn02', name: 'Sports Complex A', location: 'North Campus', capacity: 1000, reservations: [] },
  { venueId: 'vn03', name: 'Indoor Arena', location: 'West Campus', capacity: 2000, reservations: [] },
];

export const users: User[] = [
  { userId: 'us01', displayName: 'Admin User', role: 'admin', dept: 'Administration', email: 'admin@unisport.com' },
  { userId: 'us02', displayName: 'John Doe', role: 'student', dept: 'Computer Science', email: 'john.doe@student.com', registrationNumber: 'CS-101', gender: 'male' },
  { userId: 'us03', displayName: 'Jane Smith', role: 'student', dept: 'Software Engineering', email: 'jane.smith@student.com', registrationNumber: 'SE-202', gender: 'female' },
  { userId: 'us04', displayName: 'Coordinator Sam', role: 'coordinator', dept: 'Sports Department', email: 'sam@unisport.com' },
];

export const teams: Team[] = [
  { teamId: 'tm01', teamName: 'CS Warriors', department: 'Computer Science', status: 'approved', sportType: 'Cricket', preferredVenues: ['vn01'] },
  { teamId: 'tm02', teamName: 'SE Gladiators', department: 'Software Engineering', status: 'approved', sportType: 'Cricket', preferredVenues: ['vn01', 'vn02'] },
  { teamId: 'tm03', teamName: 'Math Mavericks', department: 'Mathematics', status: 'approved', sportType: 'Cricket', preferredVenues: ['vn02'] },
  { teamId: 'tm04', teamName: 'Physics Phantoms', department: 'Physics', status: 'pending', sportType: 'Cricket', preferredVenues: ['vn01'] },
  { teamId: 'tm05', teamName: 'CS Strikers', department: 'Computer Science', status: 'approved', sportType: 'Football', preferredVenues: ['vn01'] },
  { teamId: 'tm06', teamName: 'SE Rovers', department: 'Software Engineering', status: 'approved', sportType: 'Football', preferredVenues: ['vn01'] },
];

export const matches: Match[] = [
    { matchId: 'm01', teamAId: 'tm01', teamBId: 'tm02', sportType: 'Cricket', venueId: 'vn01', startTime: '2024-09-10T09:00:00Z', endTime: '2024-09-10T12:00:00Z', round: 1, status: 'scheduled' },
    { matchId: 'm02', teamAId: 'tm05', teamBId: 'tm06', sportType: 'Football', venueId: 'vn02', startTime: '2024-09-10T10:00:00Z', endTime: '2024-09-10T11:30:00Z', round: 1, status: 'scheduled' },
];


export const events: Event[] = [
  {
    eventId: 'ev01',
    name: 'Inter-Department Cricket Championship',
    sportType: 'Cricket',
    department: 'Sports Department',
    startDate: '2024-09-10',
    durationDays: 5,
    settings: { format: 'knockout', restMinutes: 30, allowSameDeptMatches: false },
    status: 'upcoming',
    teams: [teams[0], teams[1], teams[2], teams[3]],
    matches: [matches[0]]
  },
  {
    eventId: 'ev02',
    name: 'University Football League',
    sportType: 'Football',
    department: 'Sports Department',
    startDate: '2024-09-15',
    durationDays: 7,
    settings: { format: 'round-robin', restMinutes: 60, allowSameDeptMatches: true },
    status: 'upcoming',
    teams: [teams[4], teams[5]],
    matches: [matches[1]]
  },
  {
    eventId: 'ev03',
    name: 'Annual Basketball Tournament',
    sportType: 'Basketball',
    department: 'Student Affairs',
    startDate: '2024-10-01',
    durationDays: 3,
    settings: { format: 'knockout', restMinutes: 20, allowSameDeptMatches: false },
    status: 'upcoming',
    teams: [],
    matches: []
  },
];
