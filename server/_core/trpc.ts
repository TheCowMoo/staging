import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const PAID_PLAN_ERR_MSG = "This feature requires a paid plan. Upgrade your organization to unlock full access.";
const NOT_SUPER_ADMIN_ERR_MSG = "You must be a Super Admin or higher to perform this action (10003)";
const NOT_ORG_ADMIN_ERR_MSG = "You must be an Admin or higher to perform this action (10004)";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── requireUser ─────────────────────────────────────────────────────────────
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// ─── auditorProcedure ────────────────────────────────────────────────────────
// Requires login AND role must be auditor or higher.
// Users and viewers are blocked from write/mutation operations.
const requireAuditor = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const blockedRoles = ["viewer", "user"];
  if (blockedRoles.includes(ctx.user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You need Auditor access or higher to perform this action. Contact your administrator.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const auditorProcedure = t.procedure.use(requireAuditor);

// ─── adminProcedure ──────────────────────────────────────────────────────────
// Requires platform-level admin: ultra_admin or admin (legacy platform staff).
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const platformAdminRoles = ["ultra_admin", "admin"];
    const effectiveAdminRole = ctx.realAdmin?.role ?? ctx.user?.role ?? "";
    if (!ctx.user || !platformAdminRoles.includes(effectiveAdminRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ─── ultraAdminProcedure ─────────────────────────────────────────────────────
// Requires ultra_admin role only — Pursuit Pathways staff.
// Grants impersonation and full system override capabilities.
export const ultraAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    // Allow if the real user is ultra_admin OR if impersonation is active (realAdmin is ultra_admin)
    const isUltraAdmin = ctx.user?.role === "ultra_admin" || ctx.realAdmin?.role === "ultra_admin";
    if (!isUltraAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ─── superAdminProcedure ─────────────────────────────────────────────────────
// Requires super_admin, admin (platform), or ultra_admin.
export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    const allowed = ["ultra_admin", "admin", "super_admin"];
    if (!allowed.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_SUPER_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ─── orgAdminProcedure ───────────────────────────────────────────────────────
// Requires admin-level or higher (super_admin, ultra_admin, platform admin).
export const orgAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    const allowed = ["ultra_admin", "admin", "super_admin"];
    if (!allowed.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ORG_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ─── paidProcedure ───────────────────────────────────────────────────────────
// Requires login AND the user's organization must be on the 'paid' plan.
// Platform admins (ultra_admin, admin) are always granted access regardless of plan.
const requirePaidPlan = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const platformAdminRoles = ["ultra_admin", "admin"];
  // During impersonation, the real admin bypasses the paid plan check
  const effectiveRole = ctx.realAdmin?.role ?? ctx.user.role;
  if (!platformAdminRoles.includes(effectiveRole) && ctx.orgPlan !== "paid") {
    throw new TRPCError({ code: "FORBIDDEN", message: PAID_PLAN_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const paidProcedure = t.procedure.use(requirePaidPlan);
