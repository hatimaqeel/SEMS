
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
  prompt: `You are an AI scheduling assistant for university sports events.

  Your primary task is to optimize the match schedule. You must strictly adhere to the following rules:

  1.  **Venue Conflict Validation:** A venue can only host one match at a time. Do not schedule two matches in the same venue if their time slots overlap, regardless of the sport or event.
  2.  **Time Constraints:** All matches must be scheduled within the overall earliest start time and latest end time. A hard rule is that no matches can be scheduled before 8:00 AM or after 6:00 PM (18:00) local time for the event date.
  3.  **Match Duration:** Use the default duration for the given sport to calculate the end time for each match.
  4.  **Team Preferences:** Prioritize assigning teams to their preferred venues where possible, but avoiding conflicts is more important.
  5.  **Efficiency:** Create the most compact and efficient schedule possible.

  Given the following information about an event, optimize the match schedule.
  Provide a reasoning for the schedule optimization and return the optimized match schedule.

  Event ID: {{{eventId}}}

  Venue Availability:
  {{#each venueAvailability}}
    Venue ID: {{@key}}
    Availability: {{#each this}} Start Time: {{{startTime}}}, End Time: {{{endTime}}} {{/each}}
  {{/each}}

  Team Preferences:
  {{#each teamPreferences}}
    Team ID: {{@key}}
    Preferred Venues: {{#each this}} {{{this}}} {{/each}}
  {{/each}}

  Time Constraints:
  Earliest Start Time: {{{timeConstraints.earliestStartTime}}}
  Latest End Time: {{{timeConstraints.latestEndTime}}}

  Matches:
  {{#each matches}}
    Match ID: {{{matchId}}}, Team A: {{{teamAId}}}, Team B: {{{teamBId}}}, Sport Type: {{{sportType}}}
  {{/each}}

  Sports:
  {{#each sports}}
    Sport Type: {{@key}}, Default Duration (minutes): {{{defaultDurationMinutes}}}
  {{/each}}

  Return the optimized schedule in the following JSON format:
  {{json optimizedMatches}}

  Also, include a detailed reasoning for the schedule optimization in the reasoning field, explaining how you handled venue assignments and avoided conflicts.
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
