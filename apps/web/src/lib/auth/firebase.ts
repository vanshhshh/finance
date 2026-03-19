"use client";

import { initializeApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { webEnv } from "../env";

const config = {
  apiKey: webEnv.firebaseApiKey,
  authDomain: webEnv.firebaseAuthDomain,
  projectId: webEnv.firebaseProjectId,
  appId: webEnv.firebaseAppId,
  messagingSenderId: webEnv.firebaseMessagingSenderId,
};

const isConfigured = Object.values(config).every(Boolean);
const app = isConfigured
  ? getApps()[0] ?? initializeApp(config as Required<typeof config>)
  : null;
const auth = app ? getAuth(app) : null;

export async function signInWithGooglePopup() {
  if (!auth) {
    throw new Error("Firebase is not configured in this environment.");
  }

  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

export async function signOutFirebase() {
  if (!auth) return;
  await signOut(auth);
}

export const firebaseConfigured = Boolean(auth);

