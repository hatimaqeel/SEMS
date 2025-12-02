import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // Use service account credentials from environment variables if available
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export default admin;
