'use server';

/**
 * @fileOverview Weaves a user's compliments into an inspiring story.
 *
 * - createComplimentStory - A function that generates the story.
 * - CreateComplimentStoryInput - The input type for the function.
 * - CreateComplimentStoryOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateComplimentStoryInputSchema = z.object({
  compliments: z.array(z.string()).describe('A list of compliments the user has received.'),
});
export type CreateComplimentStoryInput = z.infer<typeof CreateComplimentStoryInputSchema>;

const CreateComplimentStoryOutputSchema = z.object({
    story: z.string().describe('A short, uplifting story generated from the compliments.')
});
export type CreateComplimentStoryOutput = z.infer<typeof CreateComplimentStoryOutputSchema>;

export async function createComplimentStory(input: CreateComplimentStoryInput): Promise<CreateComplimentStoryOutput> {
  return createComplimentStoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createComplimentStoryPrompt',
  input: {schema: CreateComplimentStoryInputSchema},
  output: {schema: CreateComplimentStoryOutputSchema},
  prompt: `You are a thoughtful and creative storyteller. Your task is to read a list of anonymous compliments a person has received and weave them into a short, beautiful, and uplifting story about that person.

The story MUST be in Mongolian.
The story should be in the second person ("Чи бол...", "Таны...").
Do not simply list the compliments. Instead, synthesize their themes and feelings into a cohesive and inspiring narrative. Capture the essence of how others see this person.

Compliments:
{{#each compliments}}
- {{{this}}}
{{/each}}

Example:
Compliments:
- "Таны инээд халдварладаг шүү!"
- "Та үргэлж маш эелдэг, тусч байдаг."
- "Ажил дээрх таны илтгэл надад үнэхээр сэтгэгдэл төрүүлсэн."
- "Та гоё хувцасладаг."

Story: "Та бол эргэн тойрныхондоо гэрэл түгээдэг нэгэн. Таны инээд хэн нэгний өдрийг гийгүүлж чаддаг бол таны эелдэг, тусч зан бусдад үргэлж урам зориг өгдөг. Ажил дээрээ та ур чадвараараа бусдыг алмайруулж, таны өвөрмөц хувцаслалт үргэлж олны анхаарлыг татдаг. Та олон талаараа онцгой хүн юм."

Now, generate a new story based on the provided compliments. Your response MUST be a single, valid JSON object with a single "story" field.
`,
});

const createComplimentStoryFlow = ai.defineFlow(
  {
    name: 'createComplimentStoryFlow',
    inputSchema: CreateComplimentStoryInputSchema,
    outputSchema: CreateComplimentStoryOutputSchema,
  },
  async input => {
    // Handle the case of too many compliments to avoid hitting token limits
    const complimentsToProcess = input.compliments.slice(0, 20); // Process up to 20 compliments
    const {output} = await prompt({compliments: complimentsToProcess});
    return output!;
  }
);
