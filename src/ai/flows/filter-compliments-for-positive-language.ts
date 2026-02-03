'use server';

/**
 * @fileOverview Filters compliments to ensure they are safe and do not contain harmful content.
 *
 * - filterCompliment - A function that filters a compliment for safety.
 * - FilterComplimentInput - The input type for the filterCompliment function.
 * - FilterComplimentOutput - The return type for the filterCompliment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FilterComplimentInputSchema = z.object({
  text: z.string().describe('The compliment text to filter for safety.'),
});
export type FilterComplimentInput = z.infer<typeof FilterComplimentInputSchema>;

const FilterComplimentOutputSchema = z.object({
  filteredText: z.string().describe('The filtered compliment text, with harmful content removed or sanitized.'),
  isSafe: z.boolean().describe('Whether the original text is deemed safe and free of harmful content.'),
});
export type FilterComplimentOutput = z.infer<typeof FilterComplimentOutputSchema>;

export async function filterCompliment(input: FilterComplimentInput): Promise<FilterComplimentOutput> {
  return filterComplimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'filterComplimentForSafetyPrompt',
  input: {schema: FilterComplimentInputSchema},
  output: {schema: FilterComplimentOutputSchema},
  prompt: `You are a highly sophisticated and culturally-aware AI content moderator for a Mongolian social app called "Wispr". Your primary task is to filter compliments for safety, ensuring the platform remains positive and uplifting.

You must analyze the INTENT behind the message. The goal is to allow genuine, even if unconventionally phrased, compliments while blocking malicious content.

**Core Rules:**

1.  **Check for genuinely harmful content:**
    *   **Abuse & Harassment:** Direct insults, threats, severe profanity.
    *   **Hate Speech:** Attacks based on identity (ethnicity, religion, etc.).
    *   **Bullying:** This can be subtle. Look for backhanded compliments or language intended to undermine or mock the receiver, even without using swear words.
    *   **PII:** Personally Identifiable Information (phone numbers, addresses, real full names, etc.).

2.  **What you MUST ALLOW (be permissive):**
    *   **Playful Teasing & "Soft" Swears:** In Mongolian, some seemingly negative words are used as positive intensifiers between friends (e.g., "Чи ямар **атаархмаар** гоё юм бэ!"). If the overall context is clearly a compliment, allow it. Don't be overly sensitive to mild slang.
    *   **Informal Language & Transliteration:** Allow informal speech and Mongolian written in Latin script (e.g., "goy baina", "chamd amjilt husie").
    *   **Unconventional Compliments:** People express positivity in many ways. As long as the intent is not malicious, let it pass.

**Examples to guide you:**

*   **ALLOWED (Playful):** "Пөөх, чи ямар аймаар авъяастай юм бэ! Атаархчихлаа." -> { "isSafe": true, "filteredText": "Пөөх, чи ямар аймаар авъяастай юм бэ! Атаархчихлаа." }
*   **ALLOWED (Informal):** "wow, sn bnuu? style-g nugaslaa shuu. goy duuldag yum bnlee." -> { "isSafe": true, "filteredText": "wow, sn bnuu? style-g nugaslaa shuu. goy duuldag юм bnlee." }
*   **BLOCKED (Bullying/Backhanded):** "Энэ даашинз гоё юм. Ядаж нэг удаа зөв хувцаслажээ." -> { "isSafe": false, "filteredText": "Энэ даашинз гоё юм. ************************." }
*   **BLOCKED (Harassment/Profanity):** "Чи бол [хүнд хараал]. Дахиж битгий тааралдаарай." -> { "isSafe": false, "filteredText": "" } // Irredeemably abusive

**Your Task:**

Analyze the following text:
Text: {{{text}}}

Respond with a JSON object. The object must have a boolean field "isSafe" and a string field "filteredText".
- If the text is SAFE, set "isSafe" to true and "filteredText" to the original text.
- If the text is UNSAFE due to mild profanity or a backhanded compliment, set "isSafe" to false and rewrite "filteredText" by replacing the harmful part with asterisks (e.g., "гоё байна, гэхдээ..." -> "гоё байна, *******...").
- If the text is irredeemably abusive, contains severe hate speech, or leaks PII, set "isSafe" to false and return an empty string for "filteredText".

The JSON keys must be in English. The "filteredText" must be in Mongolian (or the original script if transliterated).
  `,
});

const filterComplimentFlow = ai.defineFlow(
  {
    name: 'filterComplimentFlow',
    inputSchema: FilterComplimentInputSchema,
    outputSchema: FilterComplimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
