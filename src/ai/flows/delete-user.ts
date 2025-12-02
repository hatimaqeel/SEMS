'use server';

/**
 * @fileOverview A secure flow for deleting a Firebase Authentication user.
 * This flow uses the Firebase Admin SDK to perform a privileged operation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import admin from '@/firebase/admin';

const DeleteUserInputSchema = z.object({
  uid: z.string().describe('The UID of the user to delete.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;

export async function deleteUser(
  input: DeleteUserInput
): Promise<DeleteUserOutput> {
  return deleteUserFlow(input);
}

const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async ({ uid }) => {
    try {
      await admin.auth().deleteUser(uid);
      return {
        success: true,
        message: `Successfully deleted user with UID: ${uid}`,
      };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      // Throw an error that the client can catch and display
      throw new Error(error.message || 'Failed to delete user account.');
    }
  }
);
