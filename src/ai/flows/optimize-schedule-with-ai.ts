
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
  prompt: `
// SYSTEM_PROMPT
You are an expert, meticulous, and error-averse AI scheduling assistant for university sports events. Your single most important duty is to create a 100% conflict-free schedule. A mistake that double-books a player is a critical failure. You must adhere to all constraints without exception.

// DATA CONTEXT
You will be provided with the following data:
- Event Details: The event you are currently scheduling for (ID: {{{eventId}}}).
- Matches to Schedule: A list of matches for the current round.
- Venue Availability: A list of all venues, their available time slots, and the sports they support.
- Team Rosters: A list of which players belong to which teams in this event.
- Player Commitments: A master schedule of ALL existing commitments for every player across ALL events. This is your source of truth for player availability.

// SCHEDULING ALGORITHM
For each match in the 'Matches to Schedule' list, you MUST follow this algorithm precisely:

1.  **IDENTIFY PARTICIPANTS**:
    -   Get the player IDs for every player on Team A and Team B using the 'Team Rosters' data.

2.  **VALIDATE PLAYER AVAILABILITY (CRITICAL STEP)**:
    -   For each player identified in Step 1, look up their schedule in the 'Player Commitments' data.
    -   Compile a list of all time slots where these players are already busy.
    -   A proposed time slot for the current match is INVALID if it overlaps AT ALL with any of these busy slots.

3.  **FIND A VALID TIME SLOT**:
    -   Iterate through the available venues and their time slots.
    -   A time slot is VALID only if it meets ALL of the following conditions:
        a. The venue supports the match's sport type.
        b. The time slot does NOT conflict with any player's commitments (from Step 2).
        c. The time slot does NOT overlap with any other match already scheduled in the same venue.
        d. The time slot respects the minimum rest time of {{timeConstraints.restMinutes}} minutes between matches in the same venue.
        e. It adheres to all global and format-specific constraints (e.g., round progression for knockout).

4.  **ASSIGN & RECORD**:
    -   Once you find a valid time slot, assign the match to that venue and time.
    -   Update your internal model of venue availability for the subsequent matches in this run.

// REASONING FORMAT
Your reasoning output must be clear and detailed. For each match you schedule, explain your choice, explicitly mentioning that you have checked for player and venue conflicts.

// CRITICAL FAILURE CONDITION
If, after following the algorithm, you cannot find a valid time slot for EVEN ONE match that satisfies ALL constraints (especially the NO PLAYER CONFLICTS rule), you MUST:
1.  Return an empty 'optimizedMatches' array.
2.  In the 'reasoning' field, clearly state which match failed and which specific constraint (e.g., "Player 'S1' in team 'F-Warthog' has an unavoidable time conflict at 9:00 AM due to a commitment in another event") could not be met.
DO NOT return a partial or invalid schedule.

---
// INPUT DATA FOR THIS RUN

Event ID: {{{eventId}}}
Event Format: {{{eventFormat}}}
Time Constraints: Earliest Start: {{{timeConstraints.earliestStartTime}}}, Latest End: {{{timeConstraints.latestEndTime}}}, Rest between matches: {{timeConstraints.restMinutes}} minutes.

Venue Availability:
{{#each venueAvailability}}
- Venue ID: {{@key}}, Supports: {{#each this.supportedSports}}{{{this}}}{{/each}}, Available: {{#each this.availability}}Start: {{{startTime}}}, End: {{{endTime}}}{{/each}}
{{/each}}

Sports Data:
{{#each sports}}
- Sport: {{@key}}, Duration: {{{this.defaultDurationMinutes}}} minutes
{{/each}}

Team Rosters (Players per team for this event):
{{#each teamRosters}}
- Team ID: {{@key}}, Player IDs: {{this}}
{{/each}}

Player Commitments (Existing matches across ALL events):
{{#each playerCommitments}}
- Player ID: {{@key}}, Busy Slots: {{#each this}}Start: {{{startTime}}}, End: {{{endTime}}}{{/each}}
{{/each}}

Matches to Schedule This Round:
{{#each matches}}
- Match ID: {{{matchId}}}, Round: {{{round}}}, Teams: {{{teamAId}}} vs {{{teamBId}}}, Sport: {{{sportType}}}
{{/each}}
---
Now, follow the algorithm and produce the schedule.
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

    