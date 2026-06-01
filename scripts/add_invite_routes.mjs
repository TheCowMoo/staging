import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, "..", "server", "routers.ts");
let content = readFileSync(filePath, "utf8");

const idx = content.indexOf("Liability Scan Router");
const insertAt = content.lastIndexOf("});", idx);

// The text to insert between the "});" and "// ─── Liability Scan Router"
const procedures = `
  // Ultra Admin: invite a new user to the platform
  inviteUser: ultraAdminProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["ultra_admin", "super_admin", "admin", "auditor", "user", "viewer"]).default("user"),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { createUserInvite } = await import("./db");
      const { nanoid } = await import("nanoid");
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createUserInvite({
        email: input.email,
        role: input.role,
        token,
        invitedByUserId: ctx.user.id,
        expiresAt,
      });
      const inviteUrl = \`\${input.origin}/join?inviteToken=\${token}\`;
      try {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: \`New user invite: \${input.email} -> \${input.role}\`,
          content: \`Invite URL: \${inviteUrl}\\nRole: \${input.role}\\nExpires: \${expiresAt.toISOString()}\`,
        });
      } catch {}
      return { success: true, inviteUrl, token };
    }),

  // Ultra Admin: list pending user invites
  listInvites: ultraAdminProcedure.query(async () => {
    const { listPendingUserInvites } = await import("./db");
    return listPendingUserInvites();
  }),

  // Ultra Admin: cancel a pending invite
  cancelInvite: ultraAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { deleteUserInvite } = await import("./db");
      await deleteUserInvite(input.id);
      return { success: true };
    }),
);

// ─── Liability Scan Router ─`;

// Build result: everything before insertAt + "});" (replaced) + procedures + rest
const before = content.substring(0, insertAt);
const after = content.substring(insertAt + 4); // skip past "});"

// Use \r\n to match file format
const withCRLF = procedures.replace(/\n/g, "\r\n").replace(");", "}),");

const result = `${before}}),${withCRLF}${after}`;
writeFileSync(filePath, result, "utf8");
console.log("SUCCESS! File updated with invite procedures.");