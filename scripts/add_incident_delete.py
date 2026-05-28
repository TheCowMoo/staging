import re

# Step 1: Add deleteIncidentReport to db.ts
with open('server/db.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find deleteAllIncidentReports and add a single-delete function after it
old = '''export async function deleteAllIncidentReports() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(incidentReports);
}'''

new = '''export async function deleteAllIncidentReports() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(incidentReports);
}

export async function deleteIncidentReport(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(incidentReports).where(eq(incidentReports.id, id));
  return (result as any)?.[0]?.affectedRows > 0;
}'''

if old in content:
    content = content.replace(old, new)
    print('db.ts: OK')
else:
    print('db.ts: ERROR - old not found')

with open('server/db.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Step 2: Add delete mutation to incidentRouter in routers.ts
with open('server/routers.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add deleteIncidentReport import
old2 = 'deleteAllIncidentReports,'
new2 = 'deleteAllIncidentReports, deleteIncidentReport,'
content = content.replace(old2, new2)

# Add delete mutation after markRepeat endpoint
old3 = '''  markRepeat: paidProcedure
    .input(z.object({
      id: z.number(),
      repeatGroupId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      await markAsRepeatIncident(input.id, input.repeatGroupId);
      return { success: true };
    }),
});'''

new3 = '''  markRepeat: paidProcedure
    .input(z.object({
      id: z.number(),
      repeatGroupId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      await markAsRepeatIncident(input.id, input.repeatGroupId);
      return { success: true };
    }),

  // Delete an incident report (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const deleted = await deleteIncidentReport(input.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Incident report not found" });
      return { success: true };
    }),
});'''

if old3 in content:
    content = content.replace(old3, new3)
    print('routers.ts: OK')
else:
    print('routers.ts: ERROR - old3 not found')

with open('server/routers.ts', 'w', encoding='utf-8') as f:
    f.write(content)