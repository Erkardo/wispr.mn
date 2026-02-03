'use server';

/**
 * @fileOverview Generates a hint about the sender of a compliment.
 *
 * - generateComplimentHint - A function that generates a hint.
 * - GenerateComplimentHintInput - The input type for the function.
 * - GenerateComplimentHintOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateComplimentHintInputSchema = z.object({
  text: z.string().describe('The compliment text to analyze.'),
  hintContext: z.any().optional().describe('Optional context about the sender (location, frequency).'),
  previousHints: z.array(z.string()).optional().describe('A list of previously generated hints for this compliment to avoid repetition.'),
});
export type GenerateComplimentHintInput = z.infer<typeof GenerateComplimentHintInputSchema>;

const GenerateComplimentHintOutputSchema = z.object({
    hint: z.string().describe('The generated hint about the sender.')
});
export type GenerateComplimentHintOutput = z.infer<typeof GenerateComplimentHintOutputSchema>;

export async function generateComplimentHint(input: GenerateComplimentHintInput): Promise<GenerateComplimentHintOutput> {
  return generateComplimentHintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateComplimentHintPrompt',
  input: {schema: GenerateComplimentHintInputSchema},
  output: {schema: GenerateComplimentHintOutputSchema},
  prompt: `You are a thoughtful AI assistant. Analyze the following compliment and the context about the sender to generate a creative, one-sentence hint.

The hint MUST be in Mongolian.
The hint should be intriguing and based on the provided context, but it MUST NOT directly reveal the sender's identity or the exact context provided. It should spark curiosity.

{{#if hintContext}}
Context about the sender:
- How often you notice them: {{hintContext.frequency}}
- Where you notice them: {{hintContext.location}}
{{/if}}

{{#if previousHints}}
You have already provided the following hints. Do not repeat them or provide very similar information. Generate a NEW, different hint.
Previous Hints:
{{#each previousHints}}
- {{{this}}}
{{/each}}
{{/if}}

Compliment Text: {{{text}}}

Example 1 (First Hint):
Context: { frequency: "Өдөр бүр", location: "Ажил" }
Compliment: "Та үргэлж миний ажилд тусалдаг шүү."
Hint: "Энэ хүн таны өдөр тутмын ажлын орчинд байдаг бололтой."

Example 2 (Second Hint, after first one was given):
Context: { frequency: "Өдөр бүр", location: "Ажил" }
Compliment: "Та үргэлж миний ажилд тусалдаг шүү."
Previous Hint: "Энэ хүн таны өдөр тутмын ажлын орчинд байдаг бололтой."
Hint: "Та хоёрын харилцаа ихэвчлэн мэргэжлийн сэдвийн хүрээнд өрнөдөг байх."

Example 3 (No context):
Compliment: "Таны хувцаслалтын мэдрэмж таалагддаг!"
Hint: "Энэ хүн таныг бусдаас ялгаруулдаг бүтээлч талыг тань анзаардаг."

Generate a new, unique hint based on the provided compliment and context (if available). Your response MUST be a single, valid JSON object with a single "hint" field. Do not include any text outside of the JSON object, such as explanations or markdown formatting.
`,
});

const generateComplimentHintFlow = ai.defineFlow(
  {
    name: 'generateComplimentHintFlow',
    inputSchema: GenerateComplimentHintInputSchema,
    outputSchema: GenerateComplimentHintOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
