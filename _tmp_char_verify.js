const fs = require("fs");
const c = fs.readFileSync("client/src/pages/AuditWalkthrough.tsx", "utf8");
const s = fs.readFileSync("shared/auditFramework.ts", "utf8");
const schema = fs.readFileSync("drizzle/schema.ts", "utf8");
const mig = fs.readFileSync("drizzle/0045_audit_response_enum.sql", "utf8");
const emd = String.fromCharCode(0x2014);
const needle = "No" + emd + " Not in place";
const lineC = (c.split("\n").find((l) => l.includes("Not in place")) || "").trim();
const lineS = (s.split("\n").find((l) => l.includes("Not in place")) || "").trim();
const out = [
  "client line          : " + JSON.stringify(lineC),
  "score-map line       : " + JSON.stringify(lineS),
  "map contains key     : " + s.includes('"' + needle + '": 2'),
  "schema enum has it   : " + schema.includes('"' + needle + '"'),
  "migration has it     : " + mig.includes("'" + needle + "'"),
  "client uses em-dash  : " + lineC.includes(emd),
  "identical literal    : " + lineC.includes(needle),
].join("\n");
fs.writeFileSync("_tmp_char_out.txt", out);
