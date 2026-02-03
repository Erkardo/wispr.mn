'use server';

export async function submitFeedbackAction(text: string): Promise<{ success: boolean; message: string }> {
  if (!text.trim()) {
    return { success: false, message: 'Санал хүсэлтээ бичнэ үү.' };
  }

  // In a real application, you would save this to a database,
  // send an email, or integrate with a feedback tool.
  // For now, we'll just log it on the server.
  console.log('--- New Feedback Received ---');
  console.log(text);
  console.log('-----------------------------');

  // We will always return success for this example.
  return { success: true, message: 'Таны саналыг хүлээн авлаа. Баярлалаа!' };
}
