# Pursuit Pathways — Compliance Roadmap

**Last updated:** March 25, 2026  
**Prepared by:** Manus (AI Development Agent)  
**Scope:** ISO 27001, SOC 2 Type II, GDPR, WCAG 2.1 AA, and multi-tenancy data isolation

---

## Executive Summary

This document records the current compliance posture of the Pursuit Pathways platform, the work already completed, and the full list of remaining tasks required to achieve ISO 27001, SOC 2 Type II, and GDPR readiness. It is intended as a living reference — each section can be recalled and handed back to the development agent to continue implementation.

---

## 1. What Has Already Been Implemented

### 1.1 Multi-Tenancy & Data Isolation

The platform now has a full organisation layer. Every client agency has its own organisation record, and all data (facilities, audits, incident reports, attachments, corrective actions) is scoped to an `orgId`. The following guarantees are in place:

- Facilities and audits are only returned to users who are members of the owning organisation.
- Incident reports submitted through a public portal (`/report/:slug`) are tagged to the organisation and are only visible to users with the `org_admin` role in that organisation.
- Platform admins (role: `admin`) can see all organisations but cannot access org-scoped data without being an explicit member.
- The `org_members` table records each user's role (`org_admin`, `auditor`, `viewer`) and join timestamp.
- The `org_invites` table issues 7-day expiring token links; tokens are single-use and marked `usedAt` on acceptance.

**Remaining gap:** The `facilities`, `audits`, and `incident` list queries in `server/routers.ts` still fall back to returning all records for platform admins. These should be explicitly scoped or paginated with org filtering enforced at the query level, not just the UI level.

### 1.2 Authentication & Session Security

- Authentication is delegated entirely to Manus OAuth — no passwords are stored in the application database.
- Session cookies are `httpOnly: true`, `secure: true`, `sameSite: none`.
- JWT tokens are signed with `JWT_SECRET` (injected from the platform secrets vault, never committed to code).
- No sensitive credentials appear in any source file or `.env` committed to version control.

### 1.3 Transport Security

- All traffic is served over HTTPS (enforced by the hosting platform).
- HSTS header is set with `maxAge: 31536000`, `includeSubDomains: true`, `preload: true`.

### 1.4 Security Headers (Helmet.js)

Implemented in `server/_core/index.ts`:

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'`; scripts/styles from self + Google Fonts only |
| X-Frame-Options | `DENY` (via `frameSrc: ['none']`) |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `no-referrer` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` |
| X-DNS-Prefetch-Control | `off` |

### 1.5 Rate Limiting

- General API: 200 requests per 15 minutes per IP address.
- Incident report submission: 10 requests per hour per IP address (stricter to prevent anonymous report flooding).
- IPv6-safe key generation using `ipKeyGenerator`.

### 1.6 Anonymous Incident Reporting

- No IP address is stored with incident reports.
- Contact email is optional and explicitly labelled as such.
- A privacy consent checkbox is required before submission on the public portal.
- The `checkStatus` endpoint returns only safe fields (status, type, severity, date) — no admin notes or internal data are exposed publicly.
- Reports are tagged to the organisation and are only accessible to `org_admin` members of that organisation.

### 1.7 Accessibility (WCAG 2.1 AA — Partial)

- Skip navigation link added (visible on keyboard focus).
- `focus-visible` rings enforced globally.
- `prefers-reduced-motion` media query applied to all animations.
- `sr-only` utility class available for screen reader text.
- WCAG 2.5.5 minimum touch target sizes (24×24px) enforced for interactive elements.

---

## 2. Remaining Work — Prioritised

### Priority 1 — Must Complete Before Any Client Goes Live

These items directly affect data security and legal exposure.

#### 2.1 Enforce Org Scoping on All List Queries (Backend)

**File:** `server/routers.ts`  
**What to do:** In the `facility.list`, `audit.list`, `incident.list`, and `attachment.list` procedures, add a check: if `ctx.user.role !== 'admin'`, filter results by the user's `orgId` (fetched from `org_members`). Platform admins should only see all data when explicitly in a super-admin context, not by default.

**Why it matters:** Without this, a user who somehow obtains a valid session token could query data from other organisations.

#### 2.2 Audit Log Table

**What to build:**
- New table: `audit_logs` (id, userId, orgId, action, entityType, entityId, metadata JSON, ipAddress, userAgent, createdAt)
- Log every create, update, delete, and login event.
- Expose a read-only log view in the org admin panel (filtered to that org's events).
- Platform admin can see all logs.

**Why it matters:** Required for ISO 27001 A.12.4 (logging and monitoring) and SOC 2 CC7.2 (monitoring of security events). Also essential for incident forensics.

#### 2.3 Data Retention Policy & Enforcement

**What to build:**
- Add a `retainUntil` timestamp field to `incident_reports` and `audits`.
- Create a scheduled job (cron) that soft-deletes records past their retention date.
- Add a retention policy setting per organisation (default: 7 years for OSHA records, 3 years for general audit records).
- Add a `deletedAt` soft-delete column to `facilities`, `audits`, `incident_reports`.

**Why it matters:** GDPR Article 5(1)(e) requires data not be kept longer than necessary. OSHA 29 CFR 1904.33 requires injury/illness records be retained for 5 years.

#### 2.4 Right to Erasure (GDPR Article 17)

**What to build:**
- A "Delete My Data" button in user profile settings.
- Server procedure that anonymises (not hard-deletes) the user record: replace name/email with `[Deleted User]`, remove `openId`, retain audit records with anonymised auditor name for OSHA compliance.
- Platform admin can trigger erasure for any user on request.

**Why it matters:** Mandatory under GDPR for any EU-resident users or clients.

#### 2.5 Data Processing Agreement (DPA) Template

**What to provide:**
- A standard DPA template that your clients (the organisations) sign before using the platform.
- The DPA should identify: Pursuit Pathways as the Data Processor, the client organisation as the Data Controller, the categories of personal data processed (employee names in incident reports, contact emails), the purpose (workplace safety assessment), and the sub-processors (Manus hosting platform, TiDB database, S3 storage).

**This is a legal document, not a code task.** You should have a lawyer review it before client onboarding.

---

### Priority 2 — Complete Within 30 Days of First Client Onboarding

#### 2.6 Privacy Policy & Terms of Service Pages

**What to build:**
- `/privacy` — Privacy Policy page explaining what data is collected, how it is used, retention periods, and how to request deletion.
- `/terms` — Terms of Service page.
- Link both from the footer of the public incident report portal and the landing page.
- Add a "I have read and agree to the Privacy Policy" checkbox to the user registration/first-login flow.

#### 2.7 Email Delivery for Invites

**What to build:**
- Integrate an email service (Resend or SendGrid — both have free tiers).
- When an org admin sends an invite, automatically email the invite link to the recipient.
- Email should include: org name, inviter name, role being assigned, link (with token), and expiry date.
- Add `RESEND_API_KEY` (or equivalent) to the secrets vault.

**Why it matters:** Currently invite links must be copied and shared manually, which is a security risk (links shared over insecure channels).

#### 2.8 Password-Protected Report Sharing

**What to build:**
- A "Share Report" button on the AuditReport page that generates a time-limited (30-day) read-only link.
- Optional password protection on the shared link.
- Shared links stored in a `shared_reports` table (auditId, token, expiresAt, passwordHash, viewCount).
- Public `/shared/:token` route that renders a read-only version of the report.

#### 2.9 Two-Factor Authentication Readiness

**Current state:** Authentication is fully delegated to Manus OAuth. 2FA is therefore controlled by the user's Manus account settings, not by this application.  
**Action needed:** Document this in the security policy and advise clients to enable 2FA on their Manus accounts. If you move to a different auth provider in the future, 2FA must be implemented at that layer.

---

### Priority 3 — Required for ISO 27001 Certification

These items are process and documentation tasks, not code. They are required if you pursue formal ISO 27001 certification.

#### 2.10 Information Security Policy Document

A written policy covering: access control, acceptable use, incident response, change management, and supplier security. This is a business document, not a code task.

#### 2.11 Risk Register

A documented register of information security risks, their likelihood, impact, and mitigating controls. The platform itself is a risk management tool — you should apply the same methodology to your own operations.

#### 2.12 Supplier/Sub-Processor Register

A list of all third-party services that process client data on your behalf:

| Supplier | Role | Data Processed | Location |
|---|---|---|---|
| Manus Platform | Hosting, OAuth, LLM API | All application data | US |
| TiDB Cloud | Database | All structured data | US |
| S3-compatible storage | File storage | Attachments, photos | US |

#### 2.13 Business Continuity & Disaster Recovery Plan

A documented plan for: what happens if the database is unavailable, how data is backed up, recovery time objective (RTO), and recovery point objective (RPO). The Manus platform handles infrastructure-level backups, but you should document your own recovery procedures.

#### 2.14 Penetration Testing

Before going live with sensitive client data, commission a penetration test from a qualified third party. The test should cover: authentication bypass, SQL injection, XSS, CSRF, insecure direct object reference (IDOR), and rate limit bypass.

---

### Priority 4 — SOC 2 Type II Specific Requirements

SOC 2 is an audit of your operational controls over a period of time (typically 6–12 months). The following controls must be in place and demonstrably operating before an audit.

#### 2.15 Change Management Process

Document and follow a process for: code review before merging, staging environment testing, and deployment approval. Even if you are a solo developer, having a written process satisfies the control requirement.

#### 2.16 Vulnerability Management

Subscribe to security advisories for your key dependencies (Node.js, Express, Drizzle ORM, React). Run `pnpm audit` on a scheduled basis and document remediation of high/critical findings.

#### 2.17 Incident Response Plan

A written plan for: how you detect a security incident, who is notified, how you contain it, how you notify affected clients, and how you document the post-incident review.

#### 2.18 Employee Security Training

If you have employees or contractors with access to the production environment, document their security training. For a solo operator, this means documenting your own security practices.

---

## 3. Compliance Status Summary Table

| Requirement | Framework | Status | Priority |
|---|---|---|---|
| Multi-tenancy data isolation | All | Partially complete — UI enforced, backend queries need hardening | P1 |
| HTTPS / TLS | All | Complete | — |
| Security headers (CSP, HSTS, etc.) | ISO 27001, SOC 2 | Complete | — |
| Rate limiting | SOC 2, OWASP | Complete | — |
| Session security (httpOnly, secure) | All | Complete | — |
| No passwords stored | ISO 27001, SOC 2 | Complete (OAuth delegation) | — |
| Audit log table | ISO 27001, SOC 2 | Not started | P1 |
| Data retention enforcement | GDPR, OSHA | Not started | P1 |
| Right to erasure | GDPR | Not started | P1 |
| Data Processing Agreement | GDPR | Not started (legal doc) | P1 |
| Privacy Policy page | GDPR | Not started | P2 |
| Terms of Service page | All | Not started | P2 |
| Email invite delivery | Security best practice | Not started | P2 |
| Password-protected report sharing | SOC 2 | Not started | P2 |
| 2FA (via Manus OAuth) | ISO 27001, SOC 2 | Delegated to OAuth provider | P2 |
| Information Security Policy | ISO 27001 | Not started (business doc) | P3 |
| Risk Register | ISO 27001 | Not started (business doc) | P3 |
| Supplier/Sub-processor Register | GDPR, ISO 27001 | Partially documented here | P3 |
| Business Continuity Plan | ISO 27001, SOC 2 | Not started (business doc) | P3 |
| Penetration Testing | ISO 27001, SOC 2 | Not started | P3 |
| Change Management Process | SOC 2 | Not started (process doc) | P4 |
| Vulnerability Management | SOC 2 | Not started | P4 |
| Incident Response Plan | ISO 27001, SOC 2 | Not started (business doc) | P4 |
| WCAG 2.1 AA accessibility | ADA, Section 508 | Partially complete | P2 |
| Org-scoped backend query enforcement | All | Not started | P1 |

---

## 4. How to Resume This Work

To hand this roadmap back to the development agent at any time, say:

> "Please continue the compliance roadmap. Start with [item name or priority level]."

The agent will read this document, understand the current state, and implement the next items without needing to re-explain the architecture.

**Key files to reference:**
- `drizzle/schema.ts` — database tables and types
- `server/routers.ts` — all tRPC procedures (auth, facility, audit, incident, org)
- `server/db.ts` — database query helpers
- `server/_core/index.ts` — Express server, security middleware
- `client/src/App.tsx` — routes
- `client/src/components/AppLayout.tsx` — sidebar navigation
- `client/src/pages/OrgAdmin.tsx` — org admin dashboard
- `client/src/pages/AdminOrgs.tsx` — platform admin org management
- `client/src/pages/OrgIncidentReport.tsx` — public anonymous incident portal

---

*This document is stored at `/COMPLIANCE_ROADMAP.md` in the project root and is included in every checkpoint.*
