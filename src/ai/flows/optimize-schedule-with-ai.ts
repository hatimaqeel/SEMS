
'use server';

/**
 * @fileOverview An AI-powered tool to optimize the event schedule considering venue availability, team preferences, and time constraints.
 *
 * - optimizeScheduleWithAI - A function that handles the schedule optimization process.
 * - OptimizeScheduleWithAIInput - The input type for the optimizeScheduleWithAI function.
 * - OptimizeScheduleWithAIOutput - The return type for the optimizeScheduleWithAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeScheduleWithAIInputSchema = z.object({
  eventId: z.string().describe('The ID of the event to optimize the schedule for.'),
  eventFormat: z.enum(['knockout', 'round-robin']).describe('The format of the tournament.'),
  venueAvailability: z.record(z.string(), z.object({
    availability: z.array(z.object({
        startTime: z.string().describe('The start time of the availability slot (ISO format).'),
        endTime: z.string().describe('The end time of the availability slot (ISO format).'),
    })),
    supportedSports: z.array(z.string()).describe('List of sports this venue can host.'),
  })).describe('A map of venue IDs to their availability and supported sports.'),
  teamPreferences: z.record(z.string(), z.array(z.string())).describe('A map of team IDs to preferred venue IDs.'),
  timeConstraints: z.object({
    earliestStartTime: z.string().describe('The earliest start time for any match (ISO format).'),
    latestEndTime: z.string().describe('The latest end time for any match (ISO format).'),
    restMinutes: z.number().optional().describe('Minimum rest time in minutes between matches in the same venue.'),
  }).describe('Overall time constraints for the event.'),
  matches: z.array(z.object({
    matchId: z.string().describe('The ID of the match.'),
    round: z.number().describe('The round number of the match.'),
    teamAId: z.string().describe('The ID of team A.'),
    teamBId: z.string().describe('The ID of team B.'),
    sportType: z.string().describe('The type of sport.'),
    venueId: z.string().optional().describe('The ID of the venue (if already assigned).'),
    startTime: z.string().optional().describe('The start time (ISO format, if already assigned).'),
    endTime: z.string().optional().describe('The end time (ISO format, if already assigned).'),
  })).describe('The list of matches to schedule.'),
  sports: z.record(z.string(), z.object({
    defaultDurationMinutes: z.number().describe('The default duration of a match for this sport.'),
  })).describe('A map of sport types to their default durations.'),
  teams: z.array(z.string()).optional().describe('A list of all team IDs participating in the event. Used for round-robin validation.'),
  teamRosters: z.record(z.string(), z.array(z.string())).describe('A map of team IDs to an array of player IDs on that team.'),
  playerCommitments: z.record(z.string(), z.array(z.object({
    startTime: z.string().describe("The start time of the player's existing commitment."),
    endTime: z.string().describe("The end time of the player's existing commitment."),
  }))).describe("A map of player IDs to their existing scheduled matches across all events."),
  teamDetails: z.record(z.string(), z.object({ teamName: z.string() })).describe('A map of team IDs to team names.'),
  playerDetails: z.record(z.string(), z.object({ displayName: z.string() })).describe('A map of player IDs to player display names.'),
});
export type OptimizeScheduleWithAIInput = z.infer<typeof OptimizeScheduleWithAIInputSchema>;

const OptimizedMatchSchema = z.object({
  matchId: z.string().describe('The ID of the match.'),
  venueId: z.string().describe('The ID of the assigned venue.'),
  startTime: z.string().describe('The start time of the match (ISO format).'),
  endTime: z.string().describe('The end time of the match (ISO format).'),
});

const OptimizeScheduleWithAIOutputSchema = z.object({
  optimizedMatches: z.array(OptimizedMatchSchema).describe('A list of matches with their optimized venue and time assignments.'),
  reasoning: z.string().describe('The AI’s reasoning for the schedule optimization.'),
});
export type OptimizeScheduleWithAIOutput = z.infer<typeof OptimizeScheduleWithAIOutputSchema>;

export async function optimizeScheduleWithAI(input: OptimizeScheduleWithAIInput): Promise<OptimizeScheduleWithAIOutput> {
  return optimizeScheduleWithAIFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeScheduleWithAIPrompt',
  input: {schema: OptimizeScheduleWithAIInputSchema},
  output: {schema: OptimizeScheduleWithAIOutputSchema},
  prompt: `// SYSTEM_PROMPT
You are an expert AI scheduling assistant for university sports events. Your primary goal is to find a valid, conflict-free schedule for all given matches. You must be resourceful and use all available time slots across all provided days to succeed.

// SCHEDULING_RULES
1.  **PLAYER_AVAILABILITY**: This is your highest priority. A player **CANNOT** be scheduled for two overlapping matches. The \`Player Commitments\` data is the master list of all existing obligations. You must check this for every player in a match before assigning a time.
2.  **ONE_MATCH_PER_DAY**: This is a strict rule. A team can play at most **one match per day** for this event. After scheduling a match for a team on a specific day, do not schedule another match for that same team on that same day. You must use the next available day if necessary.
3.  **VENUE_COMPATIBILITY**: A match can only be scheduled in a venue that supports its \`sportType\`.
4.  **STRICT_TIME_WINDOW**: All matches must be scheduled within the venue's available time slots, which are between 08:00 (8 AM) and 18:00 (6 PM) local time.
5.  **REST_PERIOD**: A minimum rest period of \`timeConstraints.restMinutes\` must be maintained between consecutive matches in the same venue.


// PRIMARY_OBJECTIVE: SOLVE THE SCHEDULING PUZZLE
Your main task is to create a complete and valid schedule for **ALL** matches provided in the input. Think of this as a logic puzzle. You have a list of matches, a list of venues with time slots spanning multiple days, and a list of constraints. Your job is to fit every single match into a valid slot.

- **BE_RESOURCEFUL**: If a time slot is taken, a player is busy, or a team has already played on that day, do not give up. Look for the next available time slot, even if it's on the next day. Use the entire event duration provided in the venue availability data.
- **OPTIMIZE_FOR_COMPLETION**: Your goal is to find *any* valid schedule, not necessarily the "best" one. Prioritize finding a slot for every match.

// CRITICAL_FAILURE_CONDITION: IMPOSSIBILITY
You should only fail if it is **mathematically impossible** to schedule all matches. This can happen for three reasons:
1.  **Insufficient Venue Capacity**: There are not enough total hours available in the compatible venues across the entire event duration to accommodate all matches, considering their durations and required rest periods.
2.  **Unresolvable Player Conflict**: A player has so many existing commitments that there is no valid time slot left to schedule their match.
3.  **Insufficient Days for Matches**: The number of days available for the event is less than the number of rounds required for a team to play all its matches (respecting the one-match-per-day rule).

If you must fail, you **MUST** provide a clear, specific reason.
- For a venue capacity issue, explain the calculation. E.g., "Scheduling failed because 10 matches requiring 2 hours each (20 hours total) cannot fit into the 15 total hours of available venue time."
- For a player conflict, identify the player and the nature of the conflict. E.g., "Scheduling failed for match X because Player 'Jane Doe' has unavoidable conflicts from existing commitments during all available time slots for this event."

**DO NOT** fail just because the first time slot you try is taken. Keep searching for a solution.

---
// INPUT DATA FOR THIS RUN

Event ID: {{{eventId}}}
Event Format: {{{eventFormat}}}
Time Constraints: Earliest Start: {{{timeConstraints.earliestStartTime}}}, Latest End: {{{timeConstraints.latestEndTime}}}, Rest between matches: {{timeConstraints.restMinutes}} minutes.

Venue Availability (Across all event days):
{{#each venueAvailability}}
- Venue ID: {{@key}}, Supports: {{#each this.supportedSports}}{{{this}}}{{/each}}, Available Slots:
  {{#each this.availability}}  - Start: {{{startTime}}}, End: {{{endTime}}}
  {{/each}}
{{/each}}

Sports Data:
{{#each sports}}
- Sport: {{@key}}, Duration: {{{this.defaultDurationMinutes}}} minutes
{{/each}}

Team Details (ID to Name):
{{#each teamDetails}}
- Team ID: {{@key}}, Name: {{{this.teamName}}}
{{/each}}

Player Details (ID to Name):
{{#each playerDetails}}
- Player ID: {{@key}}, Name: {{{this.displayName}}}
{{/each}}

Team Rosters (Players per team for this event):
{{#each teamRosters}}
- Team ID: {{@key}}, Player IDs: {{this}}
{{/each}}

Player Commitments (Existing matches across ALL events):
{{#each playerCommitments}}
- Player ID: {{@key}}, Busy Slots:
  {{#each this}}  - Start: {{{startTime}}}, End: {{{endTime}}}
  {{/each}}
{{/each}}

Matches to Schedule This Round:
{{#each matches}}
- Match ID: {{{matchId}}}, Round: {{{round}}}, Teams: {{{teamAId}}} vs {{{teamBId}}}, Sport: {{{sportType}}}
{{/each}}
---
Now, follow your new instructions. Be resourceful and solve the scheduling puzzle. Produce the complete, conflict-free schedule, or if truly impossible, explain why.
  `,
});


const optimizeScheduleWithAIFlow = ai.defineFlow(
  {
    name: 'optimizeScheduleWithAIFlow',
    inputSchema: OptimizeScheduleWithAIInputSchema,
    outputSchema: OptimizeScheduleWithAIOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
