'use server';

/**
 * @fileOverview Filters confessions for profanity and abusive language using an AI model.
 *
 * - filterConfession - A function that filters the input confession text.
 * - FilterConfessionInput - The input type for the filterConfession function.
 * - FilterConfessionOutput - The return type for the filterConfession function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FilterConfessionInputSchema = z.object({
  text: z
    .string() 
    .describe('The confession text to be filtered for profanity and abusive language.'),
});
export type FilterConfessionInput = z.infer<typeof FilterConfessionInputSchema>;

const FilterConfessionOutputSchema = z.object({
  isSafe: z
    .boolean()
    .describe(
      'Whether the confession text is safe and does not contain profanity or abusive language.'
    ),
  filteredText: z
    .string()
    .describe(
      'The filtered confession text, with profanity and abusive language removed or replaced.'
    ),
});
export type FilterConfessionOutput = z.infer<typeof FilterConfessionOutputSchema>;

export async function filterConfession(input: FilterConfessionInput): Promise<FilterConfessionOutput> {
  return filterConfessionFlow(input);
}

const filterConfessionPrompt = ai.definePrompt({
  name: 'filterConfessionPrompt',
  input: {schema: FilterConfessionInputSchema},
  output: {schema: FilterConfessionOutputSchema},
  prompt: `You are an AI assistant tasked with filtering anonymous confessions for profanity and abusive language.

  Analyze the following confession text and determine if it contains any profanity, hate speech, or abusive content.

  Confession: {{{text}}}

  Respond with a JSON object indicating whether the text is safe (isSafe: true/false) and providing a filtered version of the text (filteredText).
  If the text is unsafe, replace profanity with asterisks or remove abusive phrases. If the text is safe, the filteredText should be identical to the original text.

  Output should be JSON only.
  `,
});

const filterConfessionFlow = ai.defineFlow(
  {
    name: 'filterConfessionFlow',
    inputSchema: FilterConfessionInputSchema,
    outputSchema: FilterConfessionOutputSchema,
  },
  async input => {
    const {output} = await filterConfessionPrompt(input);
    return output!;
  }
);
