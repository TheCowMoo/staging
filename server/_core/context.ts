import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getOrgPlanForUser, getDb } from "../db";
import { sdk } from "./sdk";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** When impersonation is active, this is the real Ultra Admin's user record. */
  realAdmin: User | null;
  /** Resolved plan for the user's primary organization. 'free' | 'paid'. */
  orgPlan: "free" | "paid";
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let realAdmin: User | null = null;
  let orgPlan: "free" | "paid" = "free";

  // Step 1: authenticate the session — failure is expected for unauthenticated requests
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // Step 2: if the authenticated user is an ultra_admin with an active impersonation,
  // substitute ctx.user with the impersonated user so all actions are attributed to them.
  // The real admin is preserved in ctx.realAdmin for procedures that need it (e.g. stopImpersonation).
  if (user && user.role === "ultra_admin" && user.impersonatingUserId) {
    try {
      const db = await getDb();
      if (db) {
        const { users } = await import("../../drizzle/schema");
        const targetRows = await db.select().from(users).where(eq(users.id, user.impersonatingUserId)).limit(1);
        if (targetRows[0]) {
          realAdmin = user;
          user = targetRows[0];
        }
      }
    } catch {
      // If lookup fails, fall back to the real admin user (safe default)
    }
  }

  // Step 3: look up the org plan — kept separate so a DB error here never
  // wipes the authenticated user and causes a false "not logged in" state
  if (user) {
    try {
      orgPlan = await getOrgPlanForUser(user.id, user.role);
    } catch {
      // If the plan lookup fails (e.g. column not yet migrated), default to free.
      // The user stays authenticated.
      orgPlan = "free";
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    realAdmin,
    orgPlan,
  };
}
