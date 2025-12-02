
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
  prompt: `You are an AI scheduling assistant for university sports events.

  Your primary task is to optimize the match schedule. You must strictly adhere to the following rules:

  1.  **No Conflicts:** A venue can only host one match at a time. Do not schedule two matches in the same venue if their time slots overlap. This is the most important rule.
  2.  **Rest Days for Rounds:** Matches from different rounds must be scheduled on different days. Specifically, Round 2 matches must be scheduled at least one day after the last Round 1 match. Round 3 matches must be one day after the last Round 2 match, and so on. This gives teams time to rest.
  3.  **Time Constraints:** All matches must be scheduled within the overall earliest start time ({{timeConstraints.earliestStartTime}}) and latest end time ({{timeConstraints.latestEndTime}}). A hard rule is that no matches can be scheduled before 8:00 AM or after 6:00 PM (18:00) local time for any given day.
  4.  **Buffer Time:** If you must schedule two matches in the same venue on the same day (for example, in a round-robin tournament), ensure there is at least a 2-hour gap between the end of one match and the start of the next.
  5.  **Match Duration:** Use the default duration for the given sport to calculate the end time for each match.
  6.  **Team Preferences:** Prioritize assigning teams to their preferred venues, but avoiding conflicts (Rule #1) and respecting rest days (Rule #2) is more important.
  7.  **Efficiency:** Create the most compact and efficient schedule possible while following all the above rules.
  8.  **Schedule ALL Matches**: You must provide a venue, startTime, and endTime for every single match provided in the input, including matches where the teams are "TBD".

  Given the following information about an event, optimize the match schedule.
  Provide a reasoning for the schedule optimization and return the optimized match schedule.

  Event ID: {{{eventId}}}

  Venue Availability:
  {{#each venueAvailability}}
    Venue ID: {{@key}}
    Availability: {{#each this}} Start: {{{startTime}}}, End: {{{endTime}}} {{/each}}
  {{/each}}

  Team Preferences:
  {{#each teamPreferences}}
    Team ID: {{@key}}
    Preferred Venues: {{#each this}} {{{this}}} {{/each}}
  {{/each}}

  Matches to Schedule:
  {{#each matches}}
    - Match ID: {{{matchId}}}, Round: {{{round}}}, Teams: {{{teamAId}}} vs {{{teamBId}}}, Sport: {{{sportType}}}
  {{/each}}

  Sports Data:
  {{#each sports}}
    Sport: {{@key}}, Duration: {{{defaultDurationMinutes}}} minutes
  {{/each}}

  Return the optimized schedule in the following JSON format:
  {{json optimizedMatches}}

  Also, include a detailed reasoning for the schedule optimization in the reasoning field, explaining how you handled venue assignments, avoided conflicts, and managed round progression.
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
