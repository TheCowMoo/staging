import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to get DB connection");
    process.exit(1);
  }

  // Check facilities columns
  const facResult = await db.execute(sql`SHOW COLUMNS FROM facilities`);
  const facCols = (facResult as unknown as any[][])[0] as any[];
  const facColNames = facCols.map((c: any) => c.Field);
  console.log("facilities columns:", facColNames.filter((c: string) => ['emergencyRoles','aedOnSite','aedLocations'].includes(c)));

  // Check flagged_visitors columns
  const fvResult = await db.execute(sql`SHOW COLUMNS FROM flagged_visitors`);
  const fvCols = (fvResult as unknown as any[][])[0] as any[];
  const fvColNames = fvCols.map((c: any) => c.Field);
  console.log("flagged_visitors columns:", fvColNames.filter((c: string) => ['flagLevel'].includes(c)));

  // Check staff_checkins table
  try {
    const scResult = await db.execute(sql`SHOW COLUMNS FROM staff_checkins`);
    const scCols = (scResult as unknown as any[][])[0] as any[];
    const scColNames = scCols.map((c: any) => c.Field);
    console.log("staff_checkins columns:", scColNames);
  } catch (err: any) {
    console.log("staff_checkins: NOT FOUND —", err.message);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
