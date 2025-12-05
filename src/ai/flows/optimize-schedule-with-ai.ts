
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
  venueAvailability: z.record(z.string(), z.array(z.object({
    startTime: z.string().describe('The start time of the availability slot (ISO format).'),
    endTime: z.string().describe('The end time of the availability slot (ISO format).'),
  }))).describe('A map of venue IDs to available time slots.'),
  teamPreferences: z.record(z.string(), z.array(z.string())).describe('A map of team IDs to preferred venue IDs.'),
  timeConstraints: z.object({
    earliestStartTime: z.string().describe('The earliest start time for any match (ISO format).'),
    latestEndTime: z.string().describe('The latest end time for any match (ISO format).'),
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
  prompt: `You are an AI scheduling assistant for university sports events. Your task is to create a valid, conflict-free match schedule for ONE ROUND of a tournament based on the provided data. You must respect all constraints.

**EVENT FORMAT: {{{eventFormat}}}**

**GLOBAL CONSTRAINTS:**
1.  **Venue Availability:** Do not schedule matches outside of the provided venue availability slots.
2.  **No Overlapping Matches:** Two matches cannot be scheduled in the same venue at the same time.
3.  **Time Constraints:** All matches must be scheduled within the overall earliest start time ({{timeConstraints.earliestStartTime}}) and latest end time ({{timeConstraints.latestEndTime}}).
4.  **Match Duration:** Use the default duration for the sport to calculate the end time of each match.
5.  **Schedule All Matches**: You must provide a valid venue, startTime, and endTime for every match provided in the input. A 'TBD' team ID is a valid placeholder and should be scheduled.

**FORMAT-SPECIFIC CONSTRAINTS:**

*   **If Event Format is 'knockout':**
    *   **Round Progression:** All matches from a previous round must finish before any match from the next round can begin. You will only be asked to schedule one round at a time.
    *   **Rest Day:** There must be at least ONE FULL DAY of rest between the final match of one round and the first match of the next. For example, if Round 1 finishes on Monday, Round 2 cannot start before Wednesday morning.

*   **If Event Format is 'round-robin':**
    *   **One Match Per Team Per Day:** A team **CANNOT** play more than one match on the same calendar day. You are provided with a list of all teams in the 'teams' input field to help enforce this.

**Failure Condition:**
If you cannot generate a valid schedule that respects all of these rules (e.g., not enough time slots, venue conflicts, team daily match limit), you MUST return an empty 'optimizedMatches' array and provide a clear 'reasoning' explaining exactly which constraint could not be met.

**INPUT DATA:**
Event ID: {{{eventId}}}
Venue Availability:
{{#each venueAvailability}}
  - Venue ID: {{@key}}
    - Availability: {{#each this}} Start: {{{startTime}}}, End: {{{endTime}}} {{/each}}
{{/each}}

Matches to Schedule (for the current round):
{{#each matches}}
  - Match ID: {{{matchId}}}, Round: {{{round}}}, Teams: {{{teamAId}}} vs {{{teamBId}}}, Sport: {{{sportType}}}
{{/each}}

Sports Data:
{{#each sports}}
  - Sport: {{@key}}, Duration: {{{defaultDurationMinutes}}} minutes
{{/each}}

{{#if teams}}
All Team IDs: {{{teams}}}
{{/if}}

---
**YOUR TASK:**
Based on all the constraints above, generate the complete, conflict-free schedule for the matches provided for this single round. Provide a detailed reasoning for your choices.
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
