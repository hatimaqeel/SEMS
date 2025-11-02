'use server';

/**
 * @fileOverview An AI agent for generating event descriptions.
 *
 * - generateEventDescription - A function that generates event descriptions based on input parameters.
 * - GenerateEventDescriptionInput - The input type for the generateEventDescription function.
 * - GenerateEventDescriptionOutput - The return type for the generateEventDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEventDescriptionInputSchema = z.object({
  eventName: z.string().describe('The name of the event.'),
  sportType: z.string().describe('The type of sport for the event.'),
  department: z.string().describe('The department organizing the event.'),
  startDate: z.string().describe('The start date of the event.'),
  durationDays: z.number().describe('The duration of the event in days.'),
  format: z.string().describe('The format of the event (e.g., round robin, knockout).'),
  additionalDetails: z.string().optional().describe('Any additional details about the event.'),
});
export type GenerateEventDescriptionInput = z.infer<
  typeof GenerateEventDescriptionInputSchema
>;

const GenerateEventDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated description of the event.'),
});
export type GenerateEventDescriptionOutput = z.infer<
  typeof GenerateEventDescriptionOutputSchema
>;

export async function generateEventDescription(
  input: GenerateEventDescriptionInput
): Promise<GenerateEventDescriptionOutput> {
  return generateEventDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEventDescriptionPrompt',
  input: {schema: GenerateEventDescriptionInputSchema},
  output: {schema: GenerateEventDescriptionOutputSchema},
  prompt: `You are an event description generator. Your task is to create an engaging and informative description for a university sports event, using the provided details.

Event Name: {{{eventName}}}
Sport Type: {{{sportType}}}
Organizing Department: {{{department}}}
Start Date: {{{startDate}}}
Duration: {{{durationDays}}} days
Format: {{{format}}}
Additional Details: {{{additionalDetails}}}

Write a compelling description that captures the essence of the event, highlighting its key features and appealing to potential participants and spectators. Please use less than 200 words.
`,
});

const generateEventDescriptionFlow = ai.defineFlow(
  {
    name: 'generateEventDescriptionFlow',
    inputSchema: GenerateEventDescriptionInputSchema,
    outputSchema: GenerateEventDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
