import admin from "firebase-admin";

import { env, isProduction } from "./env.js";

let firebaseApp: admin.app.App | null = null;

function createFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (
    !env.FIREBASE_PROJECT_ID ||
    !env.FIREBASE_CLIENT_EMAIL ||
    !env.FIREBASE_PRIVATE_KEY
  ) {
    if (isProduction) {
      throw new Error("Firebase Admin credentials are required in production.");
    }

    return null;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });

  return firebaseApp;
}

export function getFirebaseAuth() {
  const app = createFirebaseApp();
  return app ? admin.auth(app) : null;
}

