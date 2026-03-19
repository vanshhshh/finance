import type { AppSession } from "../../lib/jwt.js";

import { getFirebaseAuth } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { signSessionToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";

export async function authenticateWithFirebase(idToken: string) {
  const firebaseAuth = getFirebaseAuth();

  if (!firebaseAuth) {
    if (!env.DEV_AUTH_BYPASS) {
      throw new Error("Firebase is not configured.");
    }

    const devEmail = idToken.includes("@") ? idToken : `${idToken}@example.com`;
    const user = await prisma.user.upsert({
      where: {
        email: devEmail.toLowerCase(),
      },
      update: {},
      create: {
        email: devEmail.toLowerCase(),
        name: devEmail.split("@")[0],
        role:
          devEmail.toLowerCase() === env.DEFAULT_ADMIN_EMAIL.toLowerCase()
            ? "ADMIN"
            : "FINANCE",
      },
    });

    return buildSession(user);
  }

  const decoded = await firebaseAuth.verifyIdToken(idToken);
  const email = decoded.email?.toLowerCase();

  if (!email) {
    throw new Error("Verified Firebase token did not contain an email.");
  }

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      firebaseUid: decoded.uid,
      name: decoded.name ?? email.split("@")[0],
    },
    create: {
      firebaseUid: decoded.uid,
      email,
      name: decoded.name ?? email.split("@")[0],
      role:
        email === env.DEFAULT_ADMIN_EMAIL.toLowerCase()
          ? "ADMIN"
          : email === env.DEFAULT_FINANCE_EMAIL.toLowerCase()
            ? "FINANCE"
            : "APPROVER1",
    },
  });

  return buildSession(user);
}

function buildSession(user: {
  id: string;
  email: string;
  name: string;
  role: AppSession["role"];
  branch?: string | null;
}) {
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    branch: user.branch,
  } satisfies AppSession;

  return {
    token: signSessionToken(session),
    user: session,
  };
}

