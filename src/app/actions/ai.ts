'use server';

import { generateComplimentSuggestionFlow } from '@/ai/flows/generate-compliment-suggestion';

export async function generateComplimentSuggestionsAction(
    relationship?: string,
    tone?: string,
    keywords?: string
) {
    try {
        const result = await generateComplimentSuggestionFlow({
            relationship: relationship || 'friend',
            tone: tone || 'nice',
            keywords: keywords || ''
        });

        return { success: true, suggestions: result.suggestions };
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return {
            success: false,
            error: 'AI generation failed. Please try again later.'
            // error: error.message // Don't expose internal errors to client
        };
    }
}
