import re

with open('server/routers.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add deleteLiabilityScan to imports
old_import = 'insertLiabilityScan, getLiabilityScanById, getLiabilityScansForUser,'
new_import = 'insertLiabilityScan, getLiabilityScanById, getLiabilityScansForUser, deleteLiabilityScan,'
content = content.replace(old_import, new_import)

# Add delete mutation after the list endpoint
old_list = """  // List all scans for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return getLiabilityScansForUser(ctx.user.id);
  }),

  // Create a tokenized share link"""

new_list = """  // List all scans for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return getLiabilityScansForUser(ctx.user.id);
  }),

  // Delete a scan (must belong to the requesting user)
  delete: protectedProcedure
    .input(z.object({ scanId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteLiabilityScan(input.scanId, ctx.user.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Scan not found or not authorized" });
      return { success: true };
    }),

  // Create a tokenized share link"""

if old_list in content:
    content = content.replace(old_list, new_list)
    print('OK - mutations added')
else:
    print('ERROR: old_list not found')
    # Try to find what's around there
    idx = content.find('return getLiabilityScansForUser(ctx.user.id);')
    print(content[idx:idx+200])

with open('server/routers.ts', 'w', encoding='utf-8') as f:
    f.write(content)