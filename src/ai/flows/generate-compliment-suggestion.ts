'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateComplimentSuggestionInputSchema = z.object({
    relationship: z.string().optional().describe('Relationship to the person (e.g., friend, crush, coworker)'),
    tone: z.string().optional().describe('Tone of the message (e.g., funny, sweet, professional, poetic)'),
    keywords: z.string().optional().describe('Specific keywords or context to include'),
});

export type GenerateComplimentSuggestionInput = z.infer<typeof GenerateComplimentSuggestionInputSchema>;

const GenerateComplimentSuggestionOutputSchema = z.object({
    suggestions: z.array(z.string()).describe('List of 3 generated compliment suggestions in Mongolian'),
});

export type GenerateComplimentSuggestionOutput = z.infer<typeof GenerateComplimentSuggestionOutputSchema>;

const prompt = ai.definePrompt({
    name: 'generateComplimentSuggestionPrompt',
    input: { schema: GenerateComplimentSuggestionInputSchema },
    output: { schema: GenerateComplimentSuggestionOutputSchema },
    prompt: `You are a helpful and creative AI assistant. Your task is to generate short, meaningful, and context-appropriate compliments or messages (Wisprs) for a user to send anonymously.

The compliments MUST be in Mongolian.
Generate 3 distinct options.

Context:
Relationship: {{relationship}} (if not provided, general)
Tone: {{tone}} (if not provided, warm and positive)
Keywords/Context: {{keywords}} (if provided, incorporate this)

Each suggestion should correspond to the tone and relationship.
Keep them concise (under 280 characters preferably).
Avoid offensive or inappropriate content.

Example input:
Relationship: crush
Tone: sweet
Keywords: smile

Example output:
suggestions: [
  "Чиний инээмсэглэл үнэхээр дулаахан, харахаар л өөрийн эрхгүй баярладаг шүү.",
  "Өнөөдөр инээмсэглэхийг чинь хараад өдөржин гоё мэдрэмжтэй явлаа.",
  "Чамд инээмсэглэх үнэхээр сайхан зохидог юм байна."
]

Now generate suggestions based on the input.
`,
});

export const generateComplimentSuggestionFlow = ai.defineFlow(
    {
        name: 'generateComplimentSuggestionFlow',
        inputSchema: GenerateComplimentSuggestionInputSchema,
        outputSchema: GenerateComplimentSuggestionOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
