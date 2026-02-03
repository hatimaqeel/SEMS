'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  UserCredential,
  sendPasswordResetEmail,
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance);
}

/** Initiate email/password sign-up and send verification email (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(authInstance, email, password)
    .then((userCredential) => {
      // Send verification email on successful creation
      if (userCredential.user) {
        sendEmailVerification(userCredential.user);
      }
      return userCredential;
    });
}


/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password);
}

/** Initiate password reset email (non-blocking). */
export function initiatePasswordReset(authInstance: Auth, email: string): Promise<void> {
    return sendPasswordResetEmail(authInstance, email);
}
