
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
  prompt: `You are an AI scheduling assistant for university sports events. Your primary task is to create a valid, conflict-free match schedule. You must follow these rules without exception:

CONSTRAINTS FOR MATCH SCHEDULING (STRICT):

1.  **No Double-Booking (Highest Priority)**:
    *   Never schedule two matches at the same venue if their times overlap.
    *   An overlap occurs if one match starts before another match at the same venue has finished. This is forbidden.

2.  **MANDATORY REST DAY for "TBD" Matches**:
    *   Any match where the teams are "TBD vs TBD" (e.g., a Round 2 match) MUST be scheduled at least ONE FULL DAY after the last match of the preceding round (e.g., Round 1) has finished.
    *   Example: If the last Round 1 match finishes on Monday at 5:00 PM, the first Round 2 match can start no earlier than Tuesday at any time. Scheduling it on Monday is a critical failure. This is the most important rule for multi-round tournaments.

3.  **Venue Time Buffer**:
    *   If you must schedule two matches at the same venue on the same day (e.g., for a round-robin tournament), the next match MUST start at least 2 hours after the previous match at that venue ends.

4.  **Overall Time Constraints**:
    *   All matches must be scheduled within the overall earliest start time ({{timeConstraints.earliestStartTime}}) and latest end time ({{timeConstraints.latestEndTime}}).
    *   A hard rule is that no matches can be scheduled before 8:00 AM or after 6:00 PM (18:00) local time for any given day.

5.  **Conflict Resolution Order**:
    *   If a match conflicts with another:
        a. First, try to assign a different available venue at the same time.
        b. If no other venue is available, move the match to the earliest available time slot that respects all rules (rest days, buffer time).
        c. Never allow an overlapping match at the same venue.

6.  **Schedule ALL Matches**:
    *   You must provide a valid venue, startTime, and endTime for every single match provided in the input. This includes matches where the teams are "TBD vs TBD". These are placeholders for future rounds and must be scheduled in advance according to the mandatory rest day rule.

7.  **Match Duration**:
    *   Calculate the end time for each match using the default duration for the given sport.

8.  **Team Preferences (Lowest Priority)**:
    *   You can consider team venue preferences, but this is the least important rule. Adhering to all other constraints (especially no conflicts and rest days) is mandatory and takes precedence.

---
**INPUT DATA:**

Event ID: {{{eventId}}}

Venue Availability:
{{#each venueAvailability}}
  Venue ID: {{@key}}
  Availability: {{#each this}} Start: {{{startTime}}}, End: {{{endTime}}} {{/each}}
{{/each}}

Matches to Schedule:
{{#each matches}}
  - Match ID: {{{matchId}}}, Round: {{{round}}}, Teams: {{{teamAId}}} vs {{{teamBId}}}, Sport: {{{sportType}}}
{{/each}}

Sports Data:
{{#each sports}}
  Sport: {{@key}}, Duration: {{{defaultDurationMinutes}}} minutes
{{/each}}

---
**YOUR TASK:**

Based on the strict rules above, generate the complete, conflict-free schedule. Provide a detailed reasoning for your choices, explaining how you avoided conflicts and managed round progression, especially the mandatory rest day for TBD matches.
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
