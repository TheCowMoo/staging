# Pursuit Pathways — Recommendations Log

This file is a persistent record of all strategic, compliance, and feature recommendations made during development. It is intended to be recalled in any future session to ensure continuity of direction.

**Last updated:** March 25, 2026

---

## How to Use This File

At the start of any new development session, reference this file to understand the current state of recommendations, which have been acted on, and what the agreed next priorities are. Update the status column as items are completed or deferred.

| Status | Meaning |
|---|---|
| `Pending` | Recommended but not yet started |
| `In Progress` | Currently being built |
| `Complete` | Implemented and checkpointed |
| `Deferred` | Agreed to skip for now; revisit later |
| `Requires Decision` | Needs input from the business owner before proceeding |

---

## Compliance Recommendations

| Priority | Item | Framework | Status | Notes |
|---|---|---|---|---|
| P1 | Audit log table (records all create/update/delete with userId, timestamp, IP) | ISO 27001 A.12.4 / SOC 2 CC7.2 | **Complete** | Implemented Round 14; `audit_logs` table live; Activity Log tab in OrgAdmin |
| P1 | Harden backend query scoping — org membership checks on facility.get, audit.get, incident.list | SOC 2 CC6.3 | **Complete** | Implemented Round 14 |
| P2 | Privacy Policy page — publicly accessible, plain-language | GDPR Art. 13 / CCPA | **In Progress** | Round 15 |
| P2 | Terms of Service — SaaS platform agreement | Legal / SOC 2 | **In Progress** | Round 15 |
| P2 | Professional Services Agreement — training, onsite, TTT | Legal | **In Progress** | Round 15 |
| P2 | Email delivery for org invites (SendGrid or Resend) | SOC 2 CC6.2 | Pending | Currently invite links are copy-pasted manually; email delivery is required for access provisioning evidence |
| P2 | Data retention schedule — document how long each data type is kept | GDPR Art. 5(1)(e) / ISO 27001 A.8.3 | Pending | Add `retainUntil` or `deletedAt` fields; write a retention policy document |
| P2 | GDPR consent checkbox on incident form linked to Privacy Policy | GDPR Art. 7 | Pending | Checkbox exists but has no link to a privacy policy yet |
| P2 | Data subject rights workflow — process for access/correction/deletion requests | GDPR Art. 15–17 | Pending | Must respond within 30 days; needs an admin UI and documented process |
| P3 | Vulnerability scan or third-party penetration test | SOC 2 CC7.1 | Pending | Required before SOC 2 Type I audit; budget $2,000–$8,000 for a basic scan |
| P3 | Written Information Security Policy (WISP) | SOC 2 / ISO 27001 | Pending | A written document (not code); can use a compliance tool like Vanta or Drata to generate templates |
| P3 | Vendor risk register — document all third-party services | SOC 2 CC9.2 / ISO 27001 A.15 | Pending | List: Manus hosting, database provider, LLM provider, Stripe; assess each for SOC 2 / ISO compliance |
| P3 | Business continuity and disaster recovery plan | SOC 2 A1.2 / ISO 27001 A.17 | Pending | Written document; define RTO (Recovery Time Objective) and RPO (Recovery Point Objective) |
| P3 | Formal access review process — quarterly review of who has access | SOC 2 CC6.2 | Pending | Documented procedure; can be partially automated with the org member list |
| P4 | ISO 27001 ISMS scope document and Statement of Applicability (SoA) | ISO 27001 Clause 4–6 | Pending | 6–12 month project; only pursue if enterprise clients explicitly require it |
| P4 | Record of Processing Activities (RoPA) | GDPR Art. 30 | Pending | Internal register of every data type, purpose, legal basis, and retention period |
| P4 | Data Processing Agreements (DPAs) with all vendors | GDPR Art. 28 | Pending | Requires signed contracts with Manus, database provider, LLM provider, Stripe |
| P4 | Employee security awareness training records | SOC 2 CC1.4 / ISO 27001 A.7.2 | Pending | If staff are added; document training completion |

---

## Feature Recommendations

| Priority | Item | Rationale | Status |
|---|---|---|---|
| High | Email delivery for org invites | Security and UX — manual link copying is a risk; required for SOC 2 access provisioning evidence | Pending |
| High | Org-branded incident portal (logo + welcome message per org) | Each client's `/report/:slug` page should feel like their own portal | Pending |
| High | Password-protected report sharing link | Allows sharing a read-only audit report with a client without requiring a platform login | Pending |
| High | Demo / seed data script | Pre-populate a sample org + facility + completed audit for sales demos and reviewer testing | **Complete** (Round 13 — Orchid Dermatology Group seeded) |
| Medium | Corrective action due dates | Add optional target completion date to each checklist item for remediation tracking | Pending |
| Medium | Audit comparison view | Side-by-side comparison of two audits for the same facility — show score changes per category | Pending |
| Medium | Training scenario modules in platform | Expand SaaS to include interactive training scenarios aligned with ACTD framework | Pending — future roadmap |
| Medium | Client-facing report sharing | Generate a read-only link (with optional password) for sharing completed reports | Pending |
| Medium | Incident report email notification to org admin | When a new incident is submitted, notify the org admin by email | Pending |
| Low | Cross-question auto-fill in walkthrough | If a question has been answered elsewhere, pre-populate related questions | Pending (deferred from Round 1) |
| Low | LLM quota exhaustion friendly error | Show a user-friendly state with retry button when AI hits a rate limit | Pending (deferred from Round 3) |
| Low | Audit history comparison chart on facility page | Show score trend over time across multiple audits | Pending |

---

## Architecture Recommendations

| Item | Rationale | Status |
|---|---|---|
| Multi-tenancy / organisation layer | Each client org needs isolated data, their own admin portal, and a public incident report URL | **Complete** (Round 12) |
| Helmet.js security headers | CSP, HSTS, X-Frame-Options, referrer policy | **Complete** (Round 12) |
| Rate limiting on API and incident endpoints | Prevent abuse and brute force | **Complete** (Round 12) |
| WCAG 2.1 AA accessibility baseline | Skip nav, focus rings, reduced motion, touch targets | **Complete** (Round 12) |
| Separate SaaS agreement from Professional Services agreement | Different liability, IP, and payment terms apply to software vs. training services | **In Progress** (Round 15) |
| Stripe integration for subscription billing | Year-1 custom quote → Year 2+ annual license model; 1/2/3-year commit tiers | Pending — add when ready to go live |
| SOC 2 compliance tooling (Vanta / Drata / Secureframe) | Automates evidence collection, policy templates, and vendor risk tracking | Pending — budget $10,000–$20,000/year; pursue before first enterprise client |

---

## Business Model Notes (for future legal/billing work)

Pursuit Pathways Inc. operates a multi-tier service model:

- **Year 1:** Custom-quoted engagement covering onsite assessment, eLearning, in-person training, and/or train-the-trainer delivery
- **Year 2+:** Annual SaaS license for continued platform access, with discounts for 2-year and 3-year commitments
- **Add-ons:** Employee training modules, train-the-trainer certification, custom scenario development
- **Future:** Training scenario modules integrated directly into the SaaS platform

Two separate agreement templates are needed: one for the SaaS platform (subscription, data processing, IP ownership of platform) and one for Professional Services (onsite work, training delivery, SOW-based engagements).

---

## Key Contacts & Business Details

| Field | Value |
|---|---|
| Legal entity | Pursuit Pathways Inc. |
| State of incorporation | Delaware |
| Registered address | 8 The Green, Suite R, Dover, Delaware 19901 |
| Principal place of business | Bradenton, Florida |
| Website | www.pursuitpathways.com |
| Legal / privacy contact | info@pursuitpathways.com |
| Payment processors | Stripe (card), direct bank transfer (ACH/wire) |
| Geographic scope | United States only (no EU/Canada exposure currently) |
| User age assumption | All users assumed to be adults (18+) |
| Liability cap model | Standard SaaS: fees paid in the 12 months preceding the claim |
