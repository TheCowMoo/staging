/**
 * California Violent Incident Log (SB 553 / LC 6401.9) router + scheduler tests.
 *
 * Acceptance criteria:
 *  - create/list/get are admin-only (orgAdminProcedure) and org-scoped.
 *  - requestLog is available to any authenticated employee (15-day deadline).
 *  - fulfillRequest transitions pending -> fulfilled.
 *  - The hourly scheduler fires Day 1 / 10 / 14 reminders.
 *  - There is NO delete procedure (5-year retention requirement).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbState = {
  rows: [] as any[],
  adminRows: [] as any[],
  insertId: 7,
  insertedValues: [] as any[],
  updatedValues: [] as any[],
};

const dbMock = vi.hoisted(() => ({
  getDb: vi.fn(),
  getOrgMembershipForUser: vi.fn(),
  getFacilityById: vi.fn(),
  getAuditById: vi.fn(),
  getPhotoById: vi.fn(),
  getIncidentReportById: vi.fn(),
}));

vi.mock("./db", () => dbMock);
vi.mock("./notificationDb", () => ({ createNotification: vi.fn(async () => {}) }));
vi.mock("./_core/ghl", () => ({ sendGhlEmail: vi.fn(async () => true) }));

import { violentIncidentLogRouter } from "./violentIncidentLogRouter";
import { checkDueRequests } from "./violentIncidentLogScheduler";

function makeDb() {
  const thenable = (rows: any[]) => {
    const p = Promise.resolve(rows);
    (p as any).limit = async () => rows;
    (p as any).orderBy = async () => rows;
    return p as any;
  };
  return {
    insert: vi.fn(() => ({
      values: vi.fn(async (vals: any) => {
        dbState.insertedValues.push(vals);
        return [{ insertId: dbState.insertId }];
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => thenable(dbState.rows)),
        leftJoin: vi.fn(() => ({ where: vi.fn(async () => dbState.adminRows) })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((vals: any) => ({
        where: vi.fn(async () => {
          dbState.updatedValues.push(vals);
          return [];
        }),
      })),
    })),
  };
}

function caller(role: string, userId = 1) {
  return violentIncidentLogRouter.createCaller({
    user: { id: userId, name: "tester", email: `u${userId}@example.com`, role },
  } as any);
}

beforeEach(() => {
  Object.values(dbMock).forEach((m) => m.mockReset());
  dbMock.getDb.mockResolvedValue(makeDb());
  dbMock.getOrgMembershipForUser.mockResolvedValue([{ orgId: 5 }] as any);
  dbState.rows = [];
  dbState.adminRows = [{ userId: 2, name: "Admin", email: "admin@example.com" }];
  dbState.insertedValues = [];
  dbState.updatedValues = [];
});

describe("California Violent Incident Log — access control", () => {
  it("rejects create from a non-admin employee", async () => {
    await expect(caller("user").create({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects list from a non-admin employee", async () => {
    await expect(caller("user").list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects get from a non-admin employee", async () => {
    await expect(caller("user").get({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects fulfillRequest from a non-admin employee", async () => {
    await expect(caller("user").fulfillRequest({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("California Violent Incident Log — admin create/view", () => {
  it("allows an org admin to create a log entry scoped to their org", async () => {
    const res = await caller("super_admin", 1).create({ orgId: 5, violenceType: "type_ii_client" });
    expect(res.id).toBe(7);
    const vals = dbState.insertedValues[0];
    expect(vals.orgId).toBe(5);
    expect(vals.loggedByUserId).toBe(1);
    expect(vals.loggedByName).toBe("tester");
    expect(vals.loggedByTitle).toBe("Organization Administrator");
  });

  it("blocks an org admin from creating for a foreign org", async () => {
    dbMock.getOrgMembershipForUser.mockResolvedValue([{ orgId: 5 }] as any);
    await expect(caller("super_admin", 1).create({ orgId: 999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to view a log in their org", async () => {
    dbState.rows = [{ id: 1, orgId: 5, violenceType: "type_ii_client" }];
    const res = await caller("super_admin", 1).get({ id: 1 });
    expect(res.id).toBe(1);
  });

  it("blocks an admin from viewing a log in a foreign org", async () => {
    dbState.rows = [{ id: 1, orgId: 999, violenceType: "type_ii_client" }];
    await expect(caller("super_admin", 1).get({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("California Violent Incident Log — employee request workflow", () => {
  it("allows any employee to request a copy with a 15-day deadline", async () => {
    const res = await caller("user", 3).requestLog({ orgId: 5 });
    expect(res.id).toBe(7);
    const vals = dbState.insertedValues[0];
    expect(vals.orgId).toBe(5);
    expect(vals.requestedByUserId).toBe(3);
    const due = new Date(vals.dueAt).getTime();
    expect(due - new Date(vals.requestedAt).getTime()).toBe(15 * 24 * 60 * 60 * 1000);
    expect(new Date(res.dueAt).getTime()).toBe(due);
  });

  it("notifies org admins (in-app + email) when a request is submitted", async () => {
    const { createNotification } = await import("./notificationDb");
    const { sendGhlEmail } = await import("./_core/ghl");
    await caller("user", 3).requestLog({ orgId: 5 });
    expect(createNotification).toHaveBeenCalled();
    expect(sendGhlEmail).toHaveBeenCalled();
  });
});

describe("California Violent Incident Log — admin request handling", () => {
  it("allows an admin to list requests for their org", async () => {
    dbState.rows = [{ id: 9, orgId: 5, status: "pending" }];
    const res = await caller("super_admin", 1).listRequests({ orgId: 5 });
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe(9);
  });

  it("allows an admin to fulfill a request (pending -> fulfilled)", async () => {
    dbState.rows = [{ id: 9, orgId: 5, status: "pending" }];
    const res = await caller("super_admin", 1).fulfillRequest({ id: 9 });
    expect(res.success).toBe(true);
    expect(dbState.updatedValues[0].status).toBe("fulfilled");
    expect(dbState.updatedValues[0].fulfilledAt).toBeInstanceOf(Date);
  });

  it("rejects fulfilling a request from a foreign org", async () => {
    dbState.rows = [{ id: 9, orgId: 999, status: "pending" }];
    await expect(caller("super_admin", 1).fulfillRequest({ id: 9 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("California Violent Incident Log — 15-day scheduler", () => {
  it("fires Day 1 and Day 10 reminders for a pending request past day 10", async () => {
    const requestedAt = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000);
    const dueAt = new Date(requestedAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    dbState.rows = [{ id: 1, orgId: 5, status: "pending", requestedAt, dueAt, notifiedDay1At: null, notifiedDay10At: null, notifiedDay14At: null }];
    await checkDueRequests();
    expect(dbState.updatedValues.some((v) => v.notifiedDay1At)).toBe(true);
    expect(dbState.updatedValues.some((v) => v.notifiedDay10At)).toBe(true);
    expect(dbState.updatedValues.some((v) => v.notifiedDay14At)).toBe(false);
  });

  it("fires the Day 14 final reminder past the 14-day mark", async () => {
    const requestedAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const dueAt = new Date(requestedAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    dbState.rows = [{ id: 1, orgId: 5, status: "pending", requestedAt, dueAt, notifiedDay1At: null, notifiedDay10At: null, notifiedDay14At: null }];
    await checkDueRequests();
    expect(dbState.updatedValues.some((v) => v.notifiedDay14At)).toBe(true);
  });

  it("skips fulfilled requests entirely", async () => {
    const requestedAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    dbState.rows = [{ id: 1, orgId: 5, status: "fulfilled", requestedAt, notifiedDay1At: null, notifiedDay10At: null, notifiedDay14At: null }];
    await checkDueRequests();
    expect(dbState.updatedValues).toHaveLength(0);
  });
});

describe("California Violent Incident Log — retention", () => {
  it("exposes no delete or update endpoint (5-year retention lock)", () => {
    const procedures = Object.keys(violentIncidentLogRouter._def.procedures);
    expect(procedures).not.toContain("delete");
    expect(procedures).not.toContain("update");
  });
});