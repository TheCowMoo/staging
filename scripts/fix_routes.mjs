import { readFileSync, writeFileSync } from "fs";

const filePath = "server/routers.ts";
let c = readFileSync(filePath, "utf8");

// Fix 1: Fix the wrong closing at the end of cancelInvite
// It currently has: return { success: true };\n    }),\n);
// Need: return { success: true };\n    }),\n});

// Use regex approach
// Fix the end of adminUserRouter section
c = c.replace(
  /(\s+return \{ success: true \};\s+}\),\s+);\s*\n\/\/ ─── Liability Scan Router)/,
  "$1}\n\n// \u2500\u2500\u2500\u2500\u2500 Liability Scan Router \u2500\u2500\u2500"
);

// Fix the duplicate comment issue        
c = c.replace(
  /\/\/ ─── Liability Scan Router ─\r?\n\r?\n\/\/ ───── Liability Scan Router/,
  "// \u2500\u2500\u2500\u2500\u2500 Liability Scan Router \u2500\u2500\u2500"
);

// Fix broken `});` → `}),` at the end of adminUserRouter
c = c.replace(
  /    }),\n\);(\r?\n\r?\n\/\/)/,
  "    }),\n});$1"
);

// Fix listPendingUserInvites } 
c = c.replace(/listPendingUserInvites }/g, "listPendingUserInvites");

// Fix extra "});" before the new section
c = c.replace(
  /}\);(\r?\n  \/\/ Ultra Admin: invite)/,
  "$1"
);

// Write result
writeFileSync(filePath, c, "utf8");
console.log("Fixes applied.");
console.log("Context around Liability Scan Router:");
const idx = c.indexOf("Liability Scan Router");
console.log(c.substring(idx - 200, idx + 50));