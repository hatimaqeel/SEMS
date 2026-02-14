
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
  prompt: `
// SYSTEM_PROMPT
You are a meticulous and precise AI scheduling assistant for university sports events. Your single most important duty is to **detect player time conflicts**. You must not attempt to automatically resolve them. Your job is to check for conflicts and report them accurately.

// DATA CONTEXT
You will be provided with the following data:
- Matches to Schedule: A list of matches for the current round.
- Venue Availability: A list of all venues and their available time slots.
- Team Details: A map of team IDs to team names, for readable output.
- Player Details: A map of player IDs to player names, for readable output.
- Team Rosters: A list of which players (by ID) belong to which teams (by ID) in this event.
- Player Commitments: A master schedule of ALL existing commitments for every player (by ID) across ALL other events. This is your source of truth for player availability.

// PRIMARY OBJECTIVE: CONFLICT DETECTION
Your primary task is to determine if scheduling the given matches is possible without any player being booked for two matches at the same time. You will iterate through all possible time slots for the matches and check for player availability.

// CRITICAL FAILURE CONDITION: CONFLICT DETECTED
If you find that it is impossible to schedule the given matches without at least one player having a time conflict with their existing \`Player Commitments\`, you MUST immediately stop and perform the following actions:
1.  **Return an empty \`optimizedMatches\` array.**
2.  **In the \`reasoning\` field, state the specific conflict.** Use the \`playerDetails\` and \`teamDetails\` maps to look up and provide the full names. When stating the conflict time, which will be in ISO format (e.g., "2024-10-26T11:00:00.000Z"), you **MUST** format it into a human-readable format like "11:00 AM on October 26, 2024". For example: "Scheduling failed due to a time conflict. Player 'Jane Doe' (on team 'SE Gladiators') has an unavoidable time conflict at 11:00 AM on October 26, 2024 due to an existing commitment. Please resolve this manually to proceed."
3.  **DO NOT return a partial or invalid schedule. DO NOT try to find an alternative time.** Your job is to report the first conflict you find and stop.

// SUCCESS CONDITION: NO CONFLICTS
Only if you can find a valid, conflict-free time slot for EVERY match in the list, should you proceed to create the full schedule. If successful, you will:
1.  Populate the \`optimizedMatches\` array with the valid schedule.
2.  In the \`reasoning\` field, state that the schedule was generated successfully without conflicts.

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
- Player ID: {{@key}}, Busy Slots: {{#each this}}Start: {{{startTime}}}, End: {{{endTime}}}{{/each}}
{{/each}}

Matches to Schedule This Round:
{{#each matches}}
- Match ID: {{{matchId}}}, Round: {{{round}}}, Teams: {{{teamAId}}} vs {{{teamBId}}}, Sport: {{{sportType}}}
{{/each}}
---
Now, follow your instructions and produce the schedule or report a conflict.
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
