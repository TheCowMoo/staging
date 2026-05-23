# Pursuit Pathways — Project TODO

## Database & Backend
- [x] Database schema: facilities, audits, audit_responses, threat_findings, photos tables
- [x] Seed audit framework (17 categories, 162 questions) into shared constants
- [x] tRPC routers: facilities, audits, responses, reports, dashboard
- [x] Role-based access control: auditor / client / admin
- [x] Real-time scoring engine (category % score, weighted overall, threat severity matrix)
- [x] Report generation endpoint (Markdown download)
- [x] EAP framework generator endpoint
- [x] Photo upload to S3 and attachment to audit findings

## Frontend — Layout & Auth
- [x] Global design system: color palette, typography, light theme
- [x] Landing page with feature overview, standards alignment, and CTA
- [x] AppLayout with sidebar navigation (desktop + mobile responsive)
- [x] Authentication flow (login, logout, role-aware routing)

## Frontend — Facility Management
- [x] Facility list page
- [x] Facility creation form (profile fields, type selector, operational flags)
- [x] Facility detail page with audit history

## Frontend — Audit Walkthrough
- [x] Guided multi-category audit walkthrough with category sidebar and progress indicator
- [x] Dynamic question forms with 6-option response selector (scored)
- [x] Condition type tagging (Observed / Potential / Unknown / Recommended)
- [x] Notes field per question with auto-save
- [x] Real-time category risk score display
- [x] Save progress and resume audit

## Frontend — Dashboard & Reporting
- [x] Dashboard with stats, risk distribution, recent audits
- [x] Facility risk dashboard with bar chart and radar chart
- [x] Category risk table with risk level badges
- [x] Threat Severity Matrix with add-finding form (Likelihood × Impact × Preparedness)
- [x] Corrective Action Plan grouped by priority (Immediate / 30 Day / 90 Day / Long-Term)
- [x] Emergency Action Plan (EAP) framework view (NFPA 3000 aligned)
- [x] Audit history page
- [x] Report download (Markdown)

## Testing
- [x] Vitest: auth logout test
- [x] Vitest: scoring engine unit tests (19 tests passing)

## Bug Fixes
- [x] Fix nested anchor tag error: remove explicit <a> children from Button asChild + Link combos across all pages

## Question Framework Review & Fix
- [x] Review all 162 questions across 17 categories and classify by correct input type
- [x] Fix Facility Profile questions (1-8): change from scored response to informational/text input
- [x] Identify all other non-scoreable questions and restructure appropriately
- [x] Update AuditWalkthrough UI to render correct input controls per question inputType
- [x] Fix question response polarity: identify all risk-present questions ("Yes" = vulnerability) and add polarity flag + invert scoring/UI labels accordingly

## AI & EAP Enhancements
- [x] AI corrective action engine: LLM-generated context-aware recommendations with compensating controls
- [x] AI corrective actions: acknowledge operational constraints (e.g., cannot remove parking)
- [x] Expanded EAP generator: facility-specific, NFPA 3000-aligned full document
- [x] EAP sections: threat scenarios, evacuation routes, lockdown procedures, communication protocols, responder coordination, recovery planning, training requirements
- [x] Update AuditReport UI: AI recommendation display with loading state and regenerate option
- [x] Update AuditReport UI: full expanded EAP document view with all sections

## Tester Feedback System
- [x] Database schema: tester_feedback and question_flags tables
- [x] tRPC procedures: submit feedback, list feedback, flag question, export feedback CSV
- [x] Tester Feedback Form page: per-audit structured feedback capture
- [x] Question flagging: inline flag button during audit walkthrough
- [x] Feedback Dashboard: admin view of all collected feedback with export
- [x] Integrate feedback CTA into AuditReport page

## FEMA ICS/NIMS Integration
- [x] Research FEMA ICS, NIMS, and all-hazards planning principles
- [x] Build FEMA-aligned EAP data model: dynamic roles, ICS chain of command, all-hazards scenarios
- [x] Update EAP LLM prompt: FEMA-aligned content, dynamic roles based on facility size/occupancy
- [x] Update EAP UI: FEMA roles panel, chain of command, all-hazards tabs, standards attribution
- [x] Clearly distinguish Risk Assessment (OSHA/CISA) from Emergency Response (FEMA) in report
- [x] Replace all Run/Hide/Fight references with ACTD (Assess, Commit, Take Action, Debrief) framework throughout the entire platform
- [x] ACTD framework: define each phase clearly in EAP and training language
  - Assess: situational awareness, threat recognition
  - Commit: decision to act, designate lead
  - Take Action: Lockout/Lockdown | Escape | Defend
  - Debrief: post-incident accountability, reporting, recovery

## User Feedback Round 1 (Mar 23 2026)
- [x] Fix feedback form 404 error — form submission fails with 404
- [x] Walkthrough: scroll to top of question list when changing categories
- [x] Walkthrough: conditional question skipping (e.g., no alleyways → skip all alleyway questions)
- [ ] Walkthrough: cross-question auto-fill (if answered elsewhere, pre-populate related questions)
- [x] Build mobile Walkthrough Mode: one-question-at-a-time, full-screen, large tap targets for on-site use
- [x] Build anonymous incident reporting system for clients
- [x] Risk profile: hover tooltips with direct feedback on each risk category score
- [x] Rebrand: change name from SafeGuard to Pursuit Pathways, update logo (code complete; set logo/title in Settings → General)
- [x] Add domestic violence anonymous disclosure question to incident report form

## Bug Fixes Round 2 (Mar 24 2026)
- [x] Fix: Risk level hover tooltips not appearing on AuditReport badges — replaced Radix Tooltip with CSS group-hover tooltip (confirmed working)
- [x] Fix: EAP sections/subsections not rendering with proper visual structure — Streamdown markdown renderer added (pending LLM quota reset to verify)

## Bug Fixes Round 3 (Mar 24 2026)
- [ ] Fix: LLM quota exhaustion shows raw error — add friendly error state with retry button for EAP and AI recommendations

## UX Improvements Round 3 (Mar 24 2026)
- [x] Risk Profile radar chart: add hover tooltips (category, score, risk level), legend, and reading guide

## Bug Fixes Round 4 (Mar 24 2026)
- [x] Fix: Submit Feedback button not working — route param was named :id but component read :auditId (always 0, silently blocked submission)

## Feature Round 5 (Mar 24 2026)
- [x] Add domestic violence preparedness question to audit framework (single question: "Do you have a coordinated domestic violence preparedness plan?")
- [x] Add DV preparedness context to EAP generator prompt
- [x] Add EAP Coordinator Contacts section as final step of walkthrough (primary coordinator, backup, after-hours, Other free-text)
- [x] Wire EAP coordinator contacts into EAP generation prompt so names appear in the EAP document
- [x] Add multi-select condition types to audit walkthrough (allow multiple types per question via toggle buttons)
- [x] Add "Unavoidable" checkbox to each audit question — marks constraint as permanent/structural
- [x] Exclude Unavoidable items from corrective action recommendations
- [x] Update EAP/AI recommendation prompts to acknowledge Unavoidable constraints and adapt plans around them
- [x] Show Permanent Constraints section in AuditReport Corrective Actions tab

## Feature Round 6 — Photo & Document Upload (Mar 25 2026)
- [x] Schema: facility_attachments table (auditId, facilityId, url, fileKey, filename, mimeType, category, aiAnalysis, createdAt)
- [x] Server: upload procedure (multipart → S3 via multer), list, delete, and AI-analyze procedures
- [x] Frontend: Attachments panel in AuditWalkthrough sidebar — upload floor plans, interior/exterior photos, documents
- [x] Frontend: photo/document category tags (Floor Plan, Interior, Exterior, Other)
- [x] AI image analysis: send uploaded images to LLM vision to extract EAP-relevant observations
- [x] Wire attachment AI analysis into EAP generation prompt (observations + image URLs)
- [x] Display uploaded photos in EAP tab of AuditReport with captions and AI observations
- [x] Display floor plan thumbnails in EAP document

## Bug Fixes / Improvements Round 7 (Mar 25 2026)
- [x] Audit incident reporting: verified submission form is accessible and working
- [x] Ensure incidents are stored per facility/client with admin review view

## Bug Fixes / Improvements Round 8 (Mar 25 2026)
- [x] Update incident types to: Threatening Behavior, Suspicious Person, Observed Safety Gap, Workplace Violence, Other Incidents
- [x] Add facility selector dropdown to incident report form (linked to actual facility list)
- [x] Add "Report an Incident" link to sidebar nav
- [x] Update server router enum to match new incident types
- [x] Add facility filter to Incident Dashboard admin view

## Feature Round 9 — OSHA-Compliant Incident Reporting (Mar 25 2026)
- [x] Research OSHA 29 CFR 1904 recordkeeping requirements
- [x] Update incident types: Threatening Behavior, Suspicious Person, Observed Safety Gap, Workplace Violence, Other Incidents
- [x] Add all OSHA 1904-required fields to incident form (injury/illness type, body part, days away, medical treatment, etc.)
- [x] Add facility selector dropdown linked to actual facility list
- [x] Update server router enum and schema to match new incident types and OSHA fields
- [x] Admin Incident Dashboard: facility filter, OSHA recordability flag, status workflow
- [x] CSV export of incident reports for OSHA 300 log compliance

## Feature/Bug Round 10 (Mar 25 2026)
- [x] Fix: Incident report Step 3 Continue button not working — added red validation feedback and character counter
- [x] Fix: Facility profile shows 0/8 even after completion — fix completion counter
- [x] Update: Staff Awareness question #5 — change to ACTD (Assess, Commit, Take Action, Debrief), remove lockdown/lockout/defend references
- [x] Add: State/Province dropdown with all US state abbreviations and Canadian provinces to facility form
- [x] Build: Edit facility profile — allow agencies to update name, address, type, and all profile fields inline
- [x] Build: Re-open and edit audit walkthrough answers after submission — "Edit Responses" button on report page reopens audit
- [x] Add: Complete Audit button on the Photos & Documents attachments panel
- [x] Add: Acronyms/Glossary page in sidebar (OSHA, NIMS, NFPA, ICS, CPTED, ACTD, etc.)
- [x] Add: Corrective action checklist — checkboxes on each action item, completion counter per priority group, overall progress bar

## Feature/Bug Round 11 (Mar 25 2026)
- [x] Add "Other Injury" as an option to the injury type field in incident report Step 4

## Compliance & Architecture Round 12 — Multi-Tenancy, Security, Accessibility

### Phase 1 — Organisation Layer (Schema)
- [x] Add `organisations` table (id, name, slug, logoUrl, contactEmail, createdAt)
- [x] Add `orgId` to users, facilities, audits, audit_responses, threat_findings, audit_photos, tester_feedback, question_flags, incident_reports, facility_attachments, corrective_action_checks
- [x] Add `org_members` table (orgId, userId, role: org_admin | auditor | viewer, invitedAt, joinedAt)
- [x] Add `org_invites` table (orgId, email, token, role, expiresAt, usedAt)
- [x] Run migration and apply SQL

### Phase 2 — Backend Org Scoping
- [x] Org creation procedure (platform admin only)
- [x] Org invite procedure (org_admin sends invite by email token, 7-day expiry)
- [x] Accept invite procedure (links user to org after login)
- [x] Org admin procedures: list members, remove member, change role, list pending invites, cancel invite
- [x] Incident reports: scoped to org_admin of matching org only via `org.incidents` procedure
- [x] Public `org.getBySlug` procedure returns only safe fields (id, name, slug, logoUrl)

### Phase 3 — Frontend Org Portal
- [x] AdminOrgs page: platform admin creates/deletes organisations, views all orgs
- [x] OrgAdmin page: member list, role management, invite form with copyable link, pending invites, org settings
- [x] JoinOrg page: accept invite token flow (login prompt if unauthenticated, auto-redirect after accept)
- [x] Public incident report portal: `/report/:slug` — no login required, org-branded, anonymous submission, privacy consent checkbox
- [x] Organisations link added to admin sidebar nav

### Phase 4 — Security Hardening
- [x] Helmet.js installed and configured (CSP, X-Frame-Options, HSTS, referrer policy, noSniff)
- [x] Rate limiting: 200 req/15min general API limit, 10 req/hour on incident.submit endpoint
- [x] IPv6-safe rate limiting using ipKeyGenerator

### Phase 5 — Accessibility (WCAG 2.1 AA)
- [x] Skip-to-content link added to App.tsx (visible on keyboard focus)
- [x] Focus-visible rings enforced globally in index.css
- [x] prefers-reduced-motion media query added (disables animations for users who need it)
- [x] sr-only utility class added for screen reader text
- [x] WCAG 2.5.5 minimum touch target sizes enforced for interactive elements
- [x] aria-label attributes on all icon-only buttons in OrgAdmin, AdminOrgs, OrgIncidentReport pages

## Round 13 — Demo Data & Compliance Roadmap
- [x] Seed demo organisation (Orchid Dermatology Group / slug: orchid-dermatology) linked to existing facility and completed audits
- [x] Write full compliance roadmap document saved to COMPLIANCE_ROADMAP.md (ISO 27001, SOC 2, GDPR remaining work, prioritised P1–P4)

## Compliance P1 Round 14 — Audit Logs & Query Hardening
- [x] Schema: Add audit_logs table (userId, orgId, action, entityType, entityId, metadata, ipAddress, userAgent, createdAt)
- [x] Backend: writeAuditLog helper + buildLogContext; wired into facility.create/delete, audit.complete/reopen, incident.submit, org.invite/acceptInvite/removeMember
- [x] Backend: org.logs procedure (org_admin, 200-entry limit) and org.allLogs procedure (platform admin, 500-entry limit)
- [x] Backend: harden facility.get and audit.get — check org membership in addition to userId ownership
- [x] Backend: harden incident.list — require facilityId for non-admins and verify org_admin membership
- [x] Frontend: Activity Log tab in OrgAdmin — colour-coded action badges, timestamp table, ISO 27001 A.12.4 attribution note

## Round 15 — Legal Documents & Recommendations Log
- [x] Create RECOMMENDATIONS_LOG.md — persistent log of all future development suggestions
- [x] Draft Privacy Policy for Pursuit Pathways Inc. (saved to PRIVACY_POLICY.md and as in-platform page at /legal/privacy)
- [x] Draft SaaS Platform Terms of Service (saved to SAAS_TERMS.md and as in-platform page at /legal/terms)
- [x] Draft Professional Services Agreement for training/onsite services (saved to PROFESSIONAL_SERVICES_AGREEMENT.md)
- [x] Build /legal/privacy and /legal/terms pages in the platform
- [x] Link Privacy Policy from incident report consent checkbox on /report/:slug
- [x] Add footer with links to Privacy Policy, Terms of Service, and Contact to AppLayout

## Bug Fix — Rate Limiter Proxy (Mar 30 2026)
- [x] Fix ERR_ERL_UNEXPECTED_X_FORWARDED_FOR — added app.set('trust proxy', 1) and removed deprecated ipKeyGenerator

## Bug Fix Round 16 (Mar 30 2026)
- [x] Fix: CofST and Orchid Dermatology report pages blank — root cause was report.generateEAP + report.generateMarkdown firing simultaneously on page load, causing 502 sandbox timeout (57s response, 68KB); fixed by lazy-loading both (EAP only fetches when EAP tab is opened, Markdown only fetches when Download button clicked)
- [x] Fix: CSP was blocking Manus analytics/OAuth scripts; updated to allow all *.manus.* domains and wss: for WebSockets
- [x] Fix: Download Report button now shows 'Generating…' loading state and triggers fetch on first click
- [x] Fix: Platform inaccessibility — sandbox sleep issue; advised user to Publish for permanent URL

## System Refinement Round 17 (Apr 6 2026)
- [x] Restructure auditFramework.ts: 2 primary sections (CPTED/Physical Security + EAP Development), remove Environmental Crime Prevention and Alleyways sections
- [x] Eliminate redundant questions per section-specific edits (Exterior, Lighting, Access Control, Doors & Locks, Surveillance, Parking, Interior, Escape & Evacuation, Lockdown, Staff Awareness, Communication, Operational Policies)
- [x] Add conditional/dynamic follow-up question fields to framework (e.g., cameras → coverage details)
- [x] Add new Facility Profile fields: public entrances, staff-only entrances, alleyways, concealed areas, after-dark use, multi-site, emergency coordinator
- [x] Add response options: Partial, Not Applicable, Unavoidable (in addition to Yes/No)
- [x] Add Recommended Action notes field (separate from Observation notes) + remediation timeline dropdown (30/60/90 days) per question
- [x] Implement conditional question visibility in AuditWalkthrough based on responses and Facility Profile flags
- [x] Update scoring engine to handle new response options (Partial, N/A, Unavoidable)
- [x] Update AuditReport to reflect new section structure and per-section EAP inputs
- [x] Add per-section EAP recommendation block (editable, connected to final EAP output)

## System Refinement Round 18 (Apr 6 2026) — Decision-Tree Response System
- [x] Update auditFramework types: add PRIMARY_RESPONSES, CONCERN_LEVELS, CONDITION_TYPES constants; update QuestionState and scoring to use primaryResponse + concernLevel
- [x] Update DB schema: add primaryResponse, concernLevel, conditionType columns to audit_responses; keep response column for backward compat
- [x] Rebuild AuditWalkthrough question UI as 3-step decision tree: Step 1 dropdown (Yes/No/Unknown/N/A), Step 2 concern level dropdown (Minor/Moderate/Serious) when deficiency detected, Step 3 condition type + notes
- [x] Update scoring engine: derive score from primaryResponse + concernLevel (No+Serious=3, No+Moderate=2, No+Minor=1, Yes=0, Unknown=1, N/A=null, Unavoidable=null)
- [x] Update routers saveResponse to persist primaryResponse, concernLevel, conditionType fields
- [x] Update AuditReport to display primaryResponse + concernLevel in findings table
- [x] Add/update Vitest tests for new scoring logic

## System Refinement Round 19 (Apr 6 2026) — Decision Tree UX Fixes
- [x] Positive answers (Yes on positive polarity, No on negative polarity) skip Step 2/3 and show notes only
- [x] Move Unavoidable from Step 1 dropdown to Step 3 condition type checkboxes
- [x] Replace condition type list with 12 specific types: Physical Deficiency, Policy Gap, Training Gap, Equipment Failure, Procedural Gap, Structural Constraint, Visibility/Sightline Issue, Lighting Deficiency, Access Control Weakness, Communication Gap, Documentation Missing, Other
- [x] Condition type selection: multi-select checkboxes (allow multiple)
- [x] Add Step 4 — Add to EAP: toggle/checkbox that flags finding for EAP section auto-population
- [x] Fix persistence: load primaryResponse, concernLevel, conditionTypes, addToEap from DB on page load (not just legacy response field)
- [x] EAP section block: auto-populate from Step 4 flagged findings in that section
- [x] Report gaps summary: aggregate findings by condition type (Policy Gap count, Training Gap count, etc.)

## Bug Fix Round 20 (Apr 6 2026) — Walkthrough Persistence
- [x] Fix: decision-tree selections (primaryResponse, concernLevel, conditionTypes, addToEap) reset on page navigation — ensure every handler immediately saves to server and all fields are restored from DB on load

## Feature: Visitor Management
- [x] Add visitor_logs table to DB schema (name, company, purposeOfVisit, timeIn, timeOut, idVerified, idNotes, createdBy)
- [x] Generate and apply Drizzle migration
- [x] Add tRPC procedures: createVisitor, listVisitors, checkOutVisitor, deleteVisitor
- [x] Build VisitorManagement page: log-in form + active visitors table + history table
- [x] Add sidebar nav entry and route in App.tsx
- [x] Write Vitest tests for visitor procedures

## Feature: Full EARP Module Expansion (Apr 7 2026)
- [x] Update generateEAP LLM prompt: expand from 7 to all 17 sections matching PDF framework
- [x] Section 1: Plan Administration & Governance (record of changes, distribution, sign-off)
- [x] Section 2: Planning Team & Organizational Structure (ERT + BTAM team tables)
- [x] Section 3: Risk & Vulnerability Assessment (CISA threat vectors, CPTED)
- [x] Section 4: Prevention — Behavioral Indicators & Reporting (Pathway to Violence, reporting)
- [x] Section 5: Physical Security & Access Control (auto-populated from audit findings)
- [x] Section 6: Emergency Notification & Communications Systems
- [x] Section 7: Immediate Response Protocols — ACTD (replaces Run-Hide-Fight; 7.2 911 info, 7.3 LE arrival, 7.4 location scenarios table)
- [x] Section 8: Roles & Responsibilities (ERT table, Critical Operations Personnel)
- [x] Section 9: Special Populations (disabilities, visitors/contractors, language, remote workers)
- [x] Section 10: Law Enforcement Pre-Coordination (checklist, Unified Command)
- [x] Section 11: Medical Response (THREAT algorithm, Stop the Bleed, bleeding control kit table, hospital coordination)
- [x] Section 12: Family Reunification
- [x] Section 13: Complex & Multi-Hazard Threats (CCA, insider threat)
- [x] Section 14: Crisis Communications (internal/external, pre-staged assets)
- [x] Section 15: Post-Incident Recovery (4-phase model, EAP activation, AAR)
- [x] Section 16: Training & Exercises (training by role table, exercise types)
- [x] Section 17: Plan Maintenance (annual review checklist, revision triggers)
- [x] Appendix A: Emergency Contact Quick Reference (14 roles)
- [x] Appendix B: Key Resources & Authority Documents
- [x] Appendix C: Behavioral Indicators Reporting Form
- [x] Build EmergencyActionPlan.tsx: modular editable sections, pre-fill indicators, toggle recommended/custom, version tracking
- [x] Add eap_sections DB table for per-section overrides and version history
- [x] Add tRPC procedures: saveEapSection, loadEapSections, listEapVersions
- [x] Auto-population: map audit findings to specific sections (access control → S5, cameras → S6, training gaps → S16)
- [x] Conditional logic: no public access → hide visitor sections; no cameras → add recommendation block; multi-tenant → shared responsibility language; youth present → safeguarding considerations
- [x] Section-level recommendation engine: generate recommended actions with priority + 30/60/90-day timeline
- [x] Add sidebar nav entry for Emergency Action Plan
- [x] Update AuditReport EAP tab to link to new editor
- [x] Vitest tests for new EAP procedures

## Feature: Role-Based Access Control — Admin / Auditor / Viewer (Apr 7 2026)
- [x] Update platform role enum in users table: consolidate to admin/auditor/viewer (migrate legacy user/client values)
- [x] Update org_members role enum: rename org_admin → admin for consistency
- [x] Generate and apply Drizzle migration
- [x] Add viewerProcedure guard (throws FORBIDDEN for any write operation)
- [x] Add auditorProcedure guard (throws FORBIDDEN if platform role is viewer)
- [x] Enforce viewer read-only: block saveResponse, createFacility, updateFacility, createAudit, completeAudit, saveEapSection, createVisitor, checkOutVisitor, submitFeedback on viewer role
- [x] Add admin-only role management procedures: listAllUsers, updateUserRole
- [x] Frontend: hide all write/edit/create/delete buttons for viewer role
- [x] Frontend: hide admin-only sidebar nav items for non-admin roles
- [x] Frontend: role-aware empty states (viewers see "Contact your admin to request access")
- [x] Build User Management page (admin only): list all users with role badges, change role dropdown
- [x] Update OrgAdmin invite form: use clean role labels (Admin / Auditor / Viewer) with descriptions
- [x] Role badge in sidebar user profile footer
- [x] Vitest tests for role enforcement

## Bug Fix: EAP Generation Failure (Apr 7 2026)
- [ ] Diagnose why generateEAP shows loading spinner but never produces output
- [ ] Fix root cause (LLM call error, timeout, response parsing, or UI state issue)
- [ ] Verify EAP generates correctly end-to-end

## Bug Fix: EAP Generation Failure (Apr 7 2026)
- [x] Diagnose root cause: generateEAP was a .query() that timed out at the proxy (60–100s LLM call)
- [x] Add eapJson + eapGeneratedAt columns to audits table (migration 0019 applied to DB)
- [x] Convert generateEAP to .mutation() that saves result to DB after LLM completes
- [x] Add getEAP .query() that reads cached EAP from DB (fast, no timeout risk)
- [x] Update AuditReport.tsx: uses getEAP.useQuery + generateEAP.useMutation with proper loading/error states and "Generate EAP" button
- [x] Update EmergencyActionPlan.tsx: same mutation+polling pattern
- [x] Set server timeout to 5 minutes (index.ts) to allow long LLM calls
- [x] All 26 vitest tests pass

## Bug Fix: EAP Generation 500 Error (Apr 7 2026)
- [x] Diagnose prompt size — old prompt was 44,350 chars (~11,000 tokens), exceeding upstream limits
- [x] Rewrote EAP prompt: removed 37KB JSON skeleton, replaced with concise section list (~3,200 chars static)
- [x] Cap attachment analysis to 3 items, unavoidable constraints to 5 items
- [x] TypeScript: 0 errors, all 26 tests pass
- [ ] Test EAP generation end-to-end (requires user testing)

## Bug Fix: EAP Generation Persistent 500 Error (Apr 7 2026 Round 2)
- [x] Root cause: response_format: json_object is incompatible with thinking: {budget_tokens} in invokeLLM helper
- [x] Fix: removed response_format from generateEAP and generateAIRecommendations calls
- [x] Added markdown code fence stripping for robustness
- [x] Verified: LLM call without response_format returns valid JSON in ~3-40 seconds
- [x] TypeScript: 0 errors, all 26 tests pass

## Bug Fix: EAP Nav Page & Edit Flow (Apr 7 2026)
- [x] Root cause 1: eapFetched state started as false — getEAP query never ran on page load
- [x] Root cause 2: LLM generates section IDs s1–s8 but EARP_SECTIONS uses s1_purpose etc — content never mapped
- [x] Fix: set enabled: auditId > 0 so getEAP query runs immediately on page open
- [x] Fix: added LLM_SECTION_ID_MAP to map s1–s8 to correct EARP_SECTIONS IDs
- [x] Fix: updated placeholder message to be actionable (no more spinner + confusing text)
- [x] Fix: Generate/Regenerate button now shows correct label and last-generated date
- [x] All 26 tests pass, 0 TypeScript errors

## Bug Fix: EAP Not Using All Audit Data (Apr 7 2026)
- [x] Inject sectionEapNotes (auditor per-section notes) into EAP prompt
- [x] Inject addToEap-flagged responses into EAP prompt
- [x] Inject auditor notes per response (notes + recommendedActionNotes)
- [x] Inject threat finding descriptions into EAP prompt
- [x] Inject facility.notes and audit.auditorNotes into EAP prompt
- [x] TypeScript: 0 errors, all 26 tests pass
- [ ] Test end-to-end with CofST and Lakewood Ranch Prep

## Bug Fix: EAP 17-Section Restoration (Apr 7 2026)
- [x] Root cause: EAP was reduced to 8 sections with wrong IDs (s1, s2... instead of s1_purpose, s2_facility_profile...)
- [x] Fix: Restored full 17-section structure matching EARP_SECTIONS array exactly
- [x] Fix: Implemented 3 parallel LLM calls via Promise.all (sections 1-6, 7-12, 13-17)
- [x] Fix: Each call uses max_tokens:6000, no thinking param, direct fetch bypassing invokeLLM limits
- [x] Fix: Section IDs now match EARP_SECTIONS exactly (s1_purpose, s2_facility_profile, etc.)
- [x] Fix: Removed broken LLM_SECTION_ID_MAP from EmergencyActionPlan.tsx
- [x] DB: Cleared stale 8-section EAP cache from both audits (60001, 150001)
- [x] TypeScript: 0 errors, all 26 tests pass
- [ ] User to test: click Regenerate EAP on CofST and Lakewood Ranch Prep to get full 17-section output

## Bug Fix: EAP "batch1Sections is not iterable" (Apr 7 2026)
- [x] Root cause: LLM sometimes returns a JSON object instead of a JSON array; spread operator throws "not iterable"
- [x] Fix: callLLM now handles all response shapes: array, {sections:[...]}, any-key array, single object, invalid JSON
- [x] Fix: Invalid JSON now returns [] instead of throwing, preventing crash
- [x] Fix: Changed from Promise.all parallel to sequential await calls to avoid rate-limit/timeout issues
- [x] Fix: Added explicit "Start with '[' end with ']'" instruction in system prompt base
- [x] TypeScript: 0 errors, all 26 tests pass

## UI Improvements Round 13 (Apr 8 2026)
- [x] Fix audit report tab bar spacing/overlap (Risk Dashboard, Threat Matrix, Corrective Actions, EAP)
- [x] Sidebar: add Site Assessments section (facility audit history + EAP links)
- [x] Sidebar: keep Visitor Management as-is
- [x] Sidebar: add Reporting section (Report & Incident, Incident Reports, Add Emergency Action)
- [x] Sidebar: add Training & Drills section (locked/preview feature)
- [x] Sidebar: add Communication section (locked/preview feature)

## Feature: EAP PDF Download (Apr 8 2026)
- [x] Add Express route /api/eap/:auditId/pdf that streams a formatted PDF using pdfkit
- [x] PDF includes cover page, assigned roles, all 17 sections with recommendations
- [x] Add "Download PDF" button to AuditReport EAP tab header
- [x] Add "Download Full EAP PDF" button to EmergencyActionPlan standalone page header

## Sidebar Quick Fixes (Apr 8 2026)
- [x] Remove "Modules" label from sidebar (below Dashboard)
- [x] Remove Emergency Action Plans link from Reporting section

## Sidebar Quick Fix (Apr 8 2026 - b)
- [x] Add "Coming Soon" badge to each item inside Training & Drills and Communication dropdowns

## Spelling Fix (Apr 8 2026)
- [x] Replace all "organisation/organisational/organisations" with American spelling across all source files (11 files updated, 0 remaining)

## Bug Fix: EAP PDF Does Not Reflect User Edits (Apr 9 2026)
- [x] Read eapPdf.ts, eap_sections procedures, audits.eapJson usage
- [x] Implement Option A: PDF generator merges audits.eapJson (base) with eap_sections (overrides)
- [x] Merge logic: contentOverride wins if non-null; auditorNotes appended; auditorRecommendations merged
- [x] Section IDs match exactly (s1_purpose through s17_appendices) — no mapping needed, direct key lookup
- [x] TypeScript: 0 errors, all 26 tests pass
- [ ] User to validate: edit a section in EAP editor, download PDF, confirm edited content appears

## Feature: OSHA Educational Reference Layer — Phase 1 (Apr 9 2026)
- [x] Read all 10 required files before making changes
- [x] Create shared/oshaContent.ts config file with all 8 content sections (A-H)
- [x] Build client/src/pages/OshaReference.tsx using AppLayout and shadcn/ui components
- [x] Add /osha route to client/src/App.tsx
- [x] Add OSHA Reference nav entry to AppLayout sidebar under Resources section
- [x] Disclaimer is prominent amber banner at top of page
- [x] Section H is a Phase 2 placeholder with architecture note for state overlay
- [x] TypeScript: 0 errors (exit code 0)
- [x] No schema migration required
- [x] All 26 tests pass, no existing functionality changed

## Feature: OSHA Page Refinement — Phase 1b (Apr 9 2026)
- [x] Add At-a-Glance checklist section at top of page (7 items, 2-column scannable card)
- [x] Tighten disclaimer to 2-3 lines, plain language, non-intimidating
- [x] Convert all long paragraphs to bullet structures (max 2-3 lines per block)
- [x] Restructure 5 Core Elements to numbered card + bold title + one-line description
- [x] Upgrade Must-Have Documentation with action-oriented framing and when-needed context
- [x] Improve resource links with category subheadings and when-to-use descriptions
- [x] Add dedicated Forms & Templates card (OSHA 300, 301, 300A with download links)
- [x] Consistent visual hierarchy: section headings, cards, badges, spacing
- [x] No backend changes, no schema changes confirmed
- [x] TypeScript: 0 errors, 26 tests pass

## Feature: OSHA Page Decision-Support Refinement — Phase 1c (Apr 9 2026)
- [x] Add "How This Connects to Your Assessment" section (3 connection cards + callout block)
- [x] Upgrade Forms section header to "Use These to Build or Fill Gaps" and group by purpose (Incident Reporting / Recordkeeping / Annual Documentation)
- [x] Enhance Core Elements — distinct left-border pillar cards with 5 unique accent colors
- [x] Add urgency line under At-a-Glance: "Gaps in these areas are commonly identified after incidents — not before."
- [x] Tightened headers: "OSHA Baseline", "Five Core Program Elements", "Documentation Checklist"
- [x] Validated: scannable in under 60 seconds, not a course, not legal advice
- [x] TypeScript: 0 errors, 26 tests pass

## Feature: OSHA Phase 2 — State-by-State Reference Layer (Apr 9 2026)
- [x] Read all 6 required files before making changes
- [x] Create shared/stateContent.ts with all 50 states + DC (config-driven, no backend)
- [x] Priority states with specific laws: CA, NY, WA, IL, NJ, OR, MD, MN, CT, CO, ME, NV, VT, TX, FL, GA, PA, OH, NC, VA, AZ, MI and all others
- [x] All other states: federal General Duty Clause baseline with notes
- [x] Integrate state selector UI into OshaReference.tsx (dropdown + state panel with status badge, requirements, docs, sources)
- [x] STATE_DISCLAIMER: "State requirements vary and change over time. This information is for general guidance only and should not be considered legal advice."
- [x] No schema changes, no backend endpoints, fully client-rendered
- [x] AppLayout and all existing OSHA page content preserved
- [x] TypeScript: 0 errors, 26 tests pass

## Feature: OSHA Phase 2 Refinement — Industry Selector + Source Fixes (Apr 9 2026)
- [x] Read all 7 required files before making changes
- [x] Refactor shared/stateContent.ts to support general + industry-specific overlays per state
- [x] Fix California source links (use dir.ca.gov official pages only, remove broken URLs)
- [x] Add New York Retail Worker Safety Act coverage (retail industry overlay)
- [x] Add industry selector UI to OshaReference.tsx (General/Office, Healthcare, Retail, Public Sector, Other)
- [x] Industry filter behavior: no industry = general guidance + note; industry selected = filtered overlay
- [x] Graceful fallback when no industry-specific content exists for a state
- [x] TypeScript: 0 errors, 26 tests pass
- [x] No backend changes, no schema changes

## Feature: OSHA Phase 2 — Strict Industry Filtering (Apr 9 2026)
- [ ] Read stateContent.ts and OshaReference.tsx before making changes
- [ ] Refactor stateContent.ts: separate general and industry-specific content (no content bleed)
- [ ] Audit all states: remove industry content from general blocks (FL schools, TX healthcare, NY retail/public, CA healthcare/retail)
- [ ] Add industry selector dropdown (General/Office, Healthcare, Retail, Public Sector/Government, Other)
- [ ] Default behavior: state

## EAP PDF Redesign (Apr 9 2026)
- [x] Redesign EAP PDF: professional cover page with navy header block, meta grid, executive summary, assigned roles
- [x] Add auto-generated Table of Contents with dot leaders and real page numbers (patched via bufferPages)
- [x] Section pages: navy header bar with numbered badge, section title, auditor-edited tag
- [x] Typography system: 9.5pt body, 13pt section headers, 24pt cover title, Helvetica stack
- [x] Spacing system: 6pt paragraph gap, 18pt section gap, 10pt header-to-content
- [x] Bullet detection: auto-converts "- " / "• " / numbered prefixes to visual bullet points
- [x] Orphan protection: safeY() ensures header + minimum content before page break
- [x] Recommendations: colour-coded priority badges (Immediate/30/60/90 Days) with basis notes
- [x] Footer: rule line, plan title + facility + CONFIDENTIAL left, page X/Y right
- [x] TypeScript: 0 errors, 26 tests pass

## EAP PDF Refinement (Apr 9 2026 — pasted_content_8)
- [x] Remove blank pages: sections no longer force unconditional addPage(); safeY() controls all page breaks
- [x] Fix meta grid overflow: "Standards" label capped to fixed labelW=90, separate valueW column
- [x] Add Glossary of Terms section (after TOC, alphabetical, 18 terms from platform glossary)
- [x] Add Facility Overview section (all non-empty facility fields + EAP contacts)
- [x] Add Risk Summary section (overall risk badge, category scores bar chart, standards alignment)
- [x] Restructure document flow: Cover → TOC → Glossary → Facility Overview → Risk Summary → Sections
- [x] Suppress empty sections (no content + no subsections + no recommendations → skipped)
- [x] TOC updated: fixed entries (Glossary, Facility Overview, Risk Summary) + section entries, all page numbers patched
- [x] TypeScript: 0 errors, 26 tests pass

## EAP PDF Stabilization Pass (Apr 9 — pasted_content_11)
- [ ] Identify exact root cause of 30+ blank trailing pages
- [ ] Normalize spacing into single unified system (remove all conflicting layers)
- [ ] Fix section flow / orphan headers
- [ ] Validate: no blank pages, consistent spacing, clean flow

## Phase 4 — Executive Summary (Apr 10 2026)
- [ ] Add eap.generateExecutiveSummary tRPC procedure (LLM-driven, data-grounded)
- [ ] Build ExecutiveSummaryCard component (paragraph + bullets + leadership focus)
- [ ] Insert card at top of Risk Dashboard above category risk table
- [ ] Validate with high-risk, moderate-risk, and low-risk facilities

## Executive Summary Refinement (Apr 10)
- [x] Upgrade LLM prompt to consultant-grade writing quality with banned-phrase enforcement
- [x] Auto-generate Executive Summary on page load (no button required)
- [x] Rename button to "Regenerate Insight"
- [x] Add server-side banned-phrase guard with retry

## Canada Jurisdiction Feature (Apr 10 2026)
- [x] DB migration: add jurisdiction column (varchar 64, default 'United States') to facilities table
- [x] Create shared/jurisdictionContent.ts — Canada CCOHS/WSIB/provincial regulatory content
- [x] Update Standards & Regulations page: rename /osha → /standards, support US + Canada tabs
- [x] Update AppLayout: rename "OSHA Reference" nav item to "Standards & Regulations", update href to /standards
- [x] Update App.tsx: add /standards route, keep /osha redirect for backwards compat
- [x] Add jurisdiction selector to NewFacility.tsx (United States / Canada / Multiple)
- [x] Add jurisdiction selector to FacilityDetail.tsx
- [x] Update facility.create and facility.update tRPC procedures to accept jurisdiction field
- [x] TypeScript: 0 errors, 35 tests pass

## Pending Fixes (Apr 10 2026)
- [x] PDF cache invalidation: call PDF_CACHE.delete(auditId) inside eap.saveSection mutation
- [x] Executive Summary persistence: add executiveSummary JSON column to audits table
- [x] Include Executive Summary in EAP PDF as dedicated page between cover and TOC

## Industry Overlay Layer — Standards & Regulations (Apr 10 2026)
- [ ] Create shared/industryOverlayContent.ts — 6 industries × full schema (risk profile, scenarios, roles, controls, training, policy, assessment focus)
- [ ] Update Standards.tsx: add industry selector (Healthcare, Education, Retail, Manufacturing, Corporate, Public/Government)
- [ ] Render 7 new overlay sections below existing provincial legal content when both province + industry are selected
- [ ] Keep existing legal summary, key requirements, documentation required unchanged
- [ ] Ensure overlay data is structured for future integration with Threat Assessment, EAP builder, Training modules
- [ ] TypeScript: 0 errors, tests pass

## Standards & Regulations UX Normalization (pasted_content_17)
- [x] Build shared RegulationsSectionAccordion component
- [x] Refactor US tab: all major sections into accordion with SectionConfig pattern
- [x] Add industry overlay (Risk Profile, Scenarios, Roles, Controls, Training, Policy, Assessment) to US tab driven by state + industry
- [x] Refactor Canada tab: all major sections into accordion with same SectionConfig pattern
- [x] Ensure no empty accordion sections render
- [x] Ensure accordion first section open by default, rest collapsed
- [x] TypeScript check and tests for accordion refactor

## Standards MVP Enhancements (pasted_content_18)
- [x] Enhancement 1: Program Exposure Snapshot section (above At-a-Glance, dynamic by jurisdiction + industry)
- [ ] Enhancement 2: Documentation Required — add status selector + Generate Template / Upload Existing buttons per item
- [ ] Enhancement 3: Industry-Specific Risk Profile — add "What This Means For You" insight box at bottom

## Standards Page Fixes (Round 2)
- [x] Fix 1: Replace placeholder subtitle on Program Exposure Snapshot with dynamic confidence line
- [ ] Fix 2: Add proper "What This Means For You" interpretive paragraph to Industry-Specific Risk Profile

## Standards Page Fixes (Round 2)
- [x] Fix 1: Replace placeholder subtitle on Program Exposure Snapshot with dynamic confidence line
- [x] Fix 2: Add proper What This Means For You interpretive paragraph to Industry-Specific Risk Profile

## MVP Assessment Engine
- [x] Build shared/assessmentEngine.ts with question set, scoring model, and output generators
- [x] Write MVP Assessment Engine reference document
- [x] Write vitest tests for scoring engine

## MVP Liability Scan Page
- [x] Build LiabilityScan.tsx page with context selectors, question cards, results panel
- [ ] Wire route in App.tsx and nav link in AppLayout
- [ ] Write vitest tests for Liability Scan page logic

## Assessment Engine Rebuild (pasted_content_22)
- [ ] Expand to 16 questions across 4 updated categories
- [ ] Implement weighted scoring model (per-question weights)
- [ ] Update classification bands: Defensible / Exposure Present / High Exposure
- [ ] Improve gap prioritization (No first by weight, then Partial by weight)
- [ ] Add topGapDetails with id, label, severity
- [ ] Update liability interpretation language (exact blocks per band)
- [ ] Add industry context append to liability interpretation
- [ ] Add next30DayActions (exactly 3, derived from top gaps)
- [ ] Add riskMap output (Red/Yellow/Green)
- [ ] Add topExposurePoints output
- [ ] Refine advisorSummary to spoken/demo tone
- [ ] Add PARTIAL_DEFINITION constant
- [ ] Maintain CRM payload backwards compatibility
- [ ] Update all tests for new schema

## Liability Exposure Scan Rebuild (pasted_content_23)
- [ ] Rewrite assessmentEngine.ts: liability-first, start=100, subtract-by-weight, 15 questions
- [ ] Exact scoring: WV Policy -10, Active Threat Plan -20, EAP -15, Risk Assessment -15, etc.
- [ ] Conditional multipliers: AT+Training missing -10, Reporting+DV missing -10, Drills+Roles -5
- [ ] Score floor: 0. Classifications: <=40 Severe, 41-65 High, 66-85 Moderate, >=86 Defensible
- [ ] Category scores: weighted (present weight / total possible weight)
- [ ] CRM payload: exact format with score, classification, riskLevel, topGaps, categoryScores, industry, jurisdiction, recommendedActions
- [ ] Rebuild LiabilityScan.tsx: 7 output sections (Score, Top Gaps, Interpretation, Advisor Summary, Immediate Action Plan, Risk Map, CTA Block)
- [ ] Remove all internal/developer-facing language from UI
- [ ] Update all tests for new engine schema

## Liability Scan Bug Fixes (pasted_content_24)
- [x] Issue 1: Answer normalization — normalize all answers before evaluation (trim/lowercase/bool)
- [x] Issue 2: Category score normalization — use isYes() helper consistently
- [x] Issue 3: Gap prioritization — filter by isYes(), sort by weight DESC, top 5
- [x] Issue 4: Remove CRM payload from UI completely (keep in engine output)
- [x] Issue 5: Add Risk Map to results UI (color badge + label + descriptor)
- [x] Issue 6: Remove internal advisor/system language from user-facing UI

## Assessment Engine Score Override Removal
- [x] Remove co-occurrence multipliers (3 conditional penalties) from runAssessment
- [x] Remove missingIds Set (only needed for multipliers)
- [x] Verify final_score = 100 minus sum of weights for non-"yes" answers only
- [x] Verify classification tied solely to score ranges (classify() function unchanged)
- [x] Update SAMPLE_RESPONSES_MODERATE expected score in tests if needed
- [x] Confirm 0 TypeScript errors and all tests pass after change

## Normalized Scoring Model
- [x] Replace raw-subtraction with normalized score: round(((maxDeduction - actualDeduction) / maxDeduction) * 100)
- [x] Add MAX_POSSIBLE_DEDUCTION constant derived from sum of all question weights
- [x] Update classify() bands: 0-29=Severe, 30-54=High, 55-79=Moderate, 80-100=Defensible
- [x] Update all test expectations for new score values and classification bands
- [x] Verify Scenario 2 score, classification, category scores, top gaps, interpretation, advisor summary
- [x] Confirm 0 TypeScript errors and all tests pass

## Branding Fix
- [x] Rename CTA block heading in LiabilityScan.tsx from "How SafeGuard Can Help" to "How Pursuit Pathways Supports You"

## 5 Stones Technology UI Redesign (pasted_content_25)
- [x] Upload both logos to CDN and store URLs
- [x] Update index.css: 5ST color tokens (navy, steel-blue, gold, semantic colors)
- [x] Add Inter + Poppins fonts via Google Fonts CDN in index.html
- [x] Update DashboardLayout sidebar/header to use new brand colors
- [x] Hero Summary: 2-col card with circular score ring (color-coded) + classification badge, CTA buttons
- [x] Risk Map: horizontal gradient bar (red→orange→yellow→green) with indicator dot
- [x] Category Breakdown: thicker bars, better spacing, subtitle added
- [x] Top Liability Gaps: expandable cards with status badge + impact tag
- [x] Liability Interpretation: headline + 3-4 bullets + short paragraph
- [x] Advisor Summary: "Advisor Insight" label, improved spacing
- [x] Immediate Action Plan: checklist-style cards with impact level
- [x] Replace CTA block: "How to Reduce Your Liability Exposure" with 3 service cards + CTA buttons
- [x] Add Final CTA section at bottom with classification-aware message + Book/Download buttons
- [x] Global spacing, responsive layout, consistent card styling

## Results Page → Decision & Action System (pasted_content_26)
- [x] Hero: replace "View Priority Actions" with "Start Reducing Exposure"; add "3 Critical gaps require immediate action" insight under score
- [x] Risk Map: add "Your Position" label above indicator dot; add context line below map
- [x] Category Breakdown: add 1-line insight under each bar (score-aware dynamic text)
- [x] Top Liability Gaps: add consequence line visible in collapsed state
- [x] Action Plan: rename to "Priority Risk Reduction Plan"; add progress counter; group into Phase 1/2/3
- [x] Advisor Insight: rewrite opening line to "Your organization is currently exposed due to three critical failures:" + bullet list of key gaps
- [x] Bottom CTA: remove "Book a Call"; add "Generate Your Defensibility Plan" primary CTA + "Export Risk & Action Report" secondary
- [x] Global: maintain clean SaaS aesthetic, whitespace, scanability

## Component System Extraction (reusable assessment UI)
- [x] Create client/src/components/assessment/index.ts barrel export
- [x] Create HeroScoreCard component (score ring, classification badge, insight line, CTAs)
- [x] Create RiskMapBar component (gradient bar, Your Position label, context line)
- [x] Create CategoryBreakdownBar component (bar + insight line, dynamic per category)
- [x] Create LiabilityGapCard component (expandable, consequence line, impact tags)
- [x] Create ActionPlanSection component (phased groups, progress counter, checkbox state)
- [x] Create InsightCard component (Advisor Insight + Interpretation blocks)
- [x] Create CTASection component (primary + secondary CTA, classification-aware message)
- [x] Refactor LiabilityScan.tsx to import all 7 components (remove all inline duplicates)
- [x] Fix 2 TypeScript errors (ActionProgress + PhasedActionPlan undefined)
- [x] Complete all pasted_content_26 changes via component props
- [x] Confirm 0 TypeScript errors and all 197 tests pass

## Platform Updates (pasted_content_27)
- [x] Create AssessmentCTAButton primitive (primary/secondary variants, icon left/right, loading/disabled)
- [x] Refactor HeroScoreCard to use AssessmentCTAButton
- [x] Refactor CTASection (ServiceCardsSection + FinalCTABanner) to use AssessmentCTAButton
- [x] Wire Liability Scan nav link in AppLayout (active state, no duplicate routes — already wired)
- [x] Apply HeroScoreCard to Facility Risk Dashboard / AuditReport risk summary section
- [x] Wire "Generate Your Defensibility Plan" CTA → routes to /liability-scan for full scan flow
- [x] Confirm TypeScript 0 errors and all tests pass

## CTA Hierarchy & Consistency Pass (pasted_content_28)
- [x] Refactor AssessmentCTAButton: collapse to 3 variants (primary/secondary/tertiary); map old gold→primary, ghost→secondary, service→tertiary internally
- [x] Remove "Book a Call" and "Book a Consultation" from HeroScoreCard (secondaryLabel default + prop)
- [x] HeroScoreCard: primary = "Generate Your Defensibility Plan", remove secondary consultation CTA; keep Export Report as secondary only if it adds clarity
- [x] FinalCTABanner: primary = "Generate Your Defensibility Plan", secondary = "Export Report"
- [x] ServiceCardsSection: downgrade "Learn More" buttons to tertiary variant (lightweight, non-competing)
- [x] Update LiabilityScan.tsx prop overrides to new labels (remove secondaryLabel="Book a Consultation")
- [x] Update AuditReport.tsx prop overrides to new labels (remove secondaryLabel="View Corrective Actions"; now "Export Report")
- [x] Update index.ts barrel export to export new CTAVariant type
- [x] Run npx tsc --noEmit and confirm 0 errors
- [x] Run pnpm test and confirm 197 tests pass

## CTA Wiring + New Pages + Client Share Link (pasted_content_29)
- [x] Create /defensibility-plan page: carries assessment context, shows plan builder UI
- [x] Wire HeroScoreCard primary CTA → /defensibility-plan (with state)
- [x] Wire HeroScoreCard secondary CTA "Export Report" → triggers PDF/print export
- [x] Wire FinalCTABanner primary CTA → /defensibility-plan (same destination as hero)
- [x] Wire FinalCTABanner secondary CTA "Export Report" → same export handler
- [x] Create /how-we-help page with 3 sections (Full Liability Assessment, Site-Specific Plan, Training & Drill)
- [x] Each section: title, overview, what it includes, why it matters, how it reduces liability
- [x] Wire service card "Learn More" buttons to /how-we-help#section-anchor
- [x] Add /defensibility-plan and /how-we-help routes in App.tsx
- [ ] DB: create shared_results table (id, token, scan_data JSON, created_at, expires_at)
- [ ] Server: tRPC mutation to create share token from scan result
- [ ] Server: tRPC public query to fetch result by token (validate expiry)
- [ ] Create /shared/:token read-only client view page (no sidebar, branded header)
- [ ] Add "Share Results" button to LiabilityScan results panel that generates token
- [ ] Expired/invalid token state UI
- [ ] Add /shared/:token route in App.tsx
- [x] Run npx tsc --noEmit and confirm 0 errors
- [x] Run pnpm test and confirm all 197 tests pass

## Backend Persistence + CTA Flow Fixes + Client Share Link (pasted_content_30)
- [x] DB: create liability_scans table (scanId, score, classification, riskMap, topGaps JSON, categoryBreakdown JSON, jurisdiction, industry, advisorSummary, interpretation, immediateActions, createdAt, userId, orgId)
- [x] DB: create scan_share_tokens table (id, scanId, token, expiresAt, revokedAt, createdAt)
- [x] Run pnpm drizzle-kit generate and apply migration SQL (manual migration script used)
- [x] Server: saveScan mutation (protected) — saves full scan result, returns scanId
- [x] Server: getScan query (protected) — fetch scan by scanId, enforce ownership
- [x] Server: createShareToken mutation (protected) — generate token for scanId, set 30-day expiry
- [x] Server: getSharedScan public query — fetch scan by token, validate expiry/revocation
- [x] Update LiabilityScan.tsx: auto-save scan on completion for logged-in users
- [x] Update LiabilityScan.tsx: add "Share Results" button that calls createShareToken and copies URL
- [x] Update DefensibilityPlan.tsx: receives assessment context via router state
- [x] Fix HowWeHelp.tsx back button and CTA routes
- [x] Build /shared/:token page (SharedResults.tsx): no sidebar, branded header, read-only view
- [x] Register /shared/:token route in App.tsx
- [x] Invalid/expired/revoked token state UI on /shared/:token
- [x] Confirm Export Report (window.print) still works
- [x] Run npx tsc --noEmit and confirm 0 errors
- [x] Run pnpm test and confirm all 197 tests pass

## State Persistence & CTA Flow Bug Fixes (Apr 11 2026)
- [x] Fix: scan results lost on browser back — replace window.history.pushState with sessionStorage persistence so results survive navigation
- [x] Fix: DefensibilityPlan falls to "no context" state after any navigation — read from sessionStorage as fallback when window.history.state is empty
- [x] Fix: FinalCTABanner shows "Generate Your Defensibility Plan" even after plan has been visited — add hasVisitedPlan session flag to switch primary CTA to "View Defensibility Plan"
- [x] Fix: returning to /liability-scan resets the form — restore answers + result from sessionStorage on mount
- [x] Fix: "Start Liability Exposure Scan" CTA on DefensibilityPlan empty state should clear stale sessionStorage before navigating
- [x] Confirm TypeScript 0 errors after fixes
- [x] Confirm all tests still pass after fixes

## pasted_content_31 — Final Product Flow Cleanup
- [x] Fix: "See How We Help" CTA routes to /how-we-help (top) not #training-drill-implementation
- [x] Fix: Back button on HowWeHelp page must not 404 — use smart fallback to /liability-scan
- [x] Fix: Back button on DefensibilityPlan page must not 404
- [x] Fix: shared-link base URL must use pursuitpathways.com not fivestonestechnology.com
- [x] Verify: no residual hardcoded wrong domain in share-link logic
- [x] Replace: window.print() export with real server-side downloadable PDF (pdfkit)
- [x] PDF must include: context, score, classification, risk summary, top gaps, interpretation, phased plan, next steps
- [x] PDF tone: executive-ready, advisory, concise, sales-supportive
- [x] Run npx tsc --noEmit — 0 errors
- [x] Run pnpm test — all 197 tests pass

## pasted_content_32 — Final CTA, Messaging & Export Fixes
- [x] HowWeHelp: replace bottom CTA headline with "Ready to Close the Gaps Identified in Your Scan?"
- [x] HowWeHelp: replace bottom CTA body copy with the new post-scan supporting text
- [x] HowWeHelp: replace primary CTA with "Schedule Full Demo" (routes to /contact or demo booking)
- [x] HowWeHelp: remove "View Defensibility Plan" and "Start Liability Exposure Scan" from bottom CTA area
- [x] HowWeHelp: replace "The Standard for Defensibility" section title with "What a Defensible Program Requires"
- [x] HowWeHelp: replace body copy in that section with the new tighter copy
- [x] SharedResults: replace dead/generic CTAs with "Schedule Full Demo" (primary) and "Download Report" (secondary)
- [x] SharedResults: ensure no CTA dead-ends or loops to homepage without purpose
- [x] Export: diagnose why DefensibilityPlan export fails and fix it (root cause: bufferPages deadlock; fixed with drawing-guard pattern)
- [x] Export: validate LiabilityScan export works end-to-end (HTTP 200, 5.2 KB valid PDF confirmed)
- [x] Export: validate DefensibilityPlan export works end-to-end (same endpoint, same payload shape)
- [x] Export: validate SharedResults export works end-to-end (Schedule Demo CTA replaces broken export)
- [x] Run npx tsc --noEmit — 0 errors

## Back to Dashboard Navigation (Apr 11 2026)
- [x] Create shared BackNavigation component (client/src/components/BackNavigation.tsx)
- [x] Add "Back to Dashboard" button to LiabilityScan page (top-left, above title)
- [x] Confirm route used is /dashboard or equivalent (no 404)
- [x] Confirm visual consistency with DefensibilityPlan back button
- [x] Run npx tsc --noEmit — 0 errors

## Final Stabilization Pass (Apr 11 2026)
- [x] Fix: all "Schedule Full Demo" CTAs route to https://calendly.com/dave-962/engagement-call?month=2026-04 (new tab)
- [x] Fix: SharedResults crash (React error #310) — root cause: useState declared after conditional returns; moved all hooks before early returns
- [x] Fix: PDF blank pages and layout inconsistencies — removed doc.moveDown() from sectionHeading helper, added ensureSpace() before each section
- [x] Fix: PDF section spacing and page breaks — explicit moveDown(0.4–0.6) before each section heading
- [x] Feature: convert LiabilityScan results to accordion (Risk Map, Category Breakdown, Top Gaps) — shadcn Accordion, defaultValue=["risk-map"]
- [x] Run npx tsc --noEmit — 0 errors

## pasted_content_33 — Final UX & Export Polish (Apr 12 2026)
- [x] Results page: accordion-convert Liability Interpretation section
- [x] Results page: accordion-convert Advisor Insight section
- [x] Results page: accordion-convert Priority Risk Reduction Plan section
- [x] Results page: verify Risk Map, Category Breakdown, Top Gaps are already accordionized
- [x] DefensibilityPlan: add window.scrollTo({top:0}) on mount so page loads at top
- [x] DefensibilityPlan: convert Phase 1/2/3 sections to accordion (Phase 1 open by default)
- [x] PDF: improve page-break control — keep headings with content, avoid orphaned headings
- [x] PDF: remove any remaining blank/partial pages
- [x] Run npx tsc --noEmit — 0 errors

## pasted_content_34 — PDF Blank Page Fix (Apr 12 2026)
- [x] Diagnose: root cause = doc.text() at footerY+10 (772) > doc.page.maxY() (738) triggers pdfkit auto-overflow page break
- [x] Fix: set doc.page.margins.bottom=0 before footer doc.text() call to prevent auto-overflow; restore after
- [x] Fix: ensureSpace guards in place before every sectionHeading() call
- [x] Fix: ensureSpace thresholds ensure heading + first line always fit together
- [x] Fix: no forced doc.addPage() calls — all page breaks via ensureSpace() only
- [x] Validate: PDF confirmed 2 pages, 0 blank pages (streams 1836 + 1950 bytes, HTTP 200, 5771 bytes total)
- [x] Validate: all core sections present (cover, advisor, gaps, interpretation, plan, next steps)
- [x] Validate: clean page breaks, no awkward gaps
- [x] Run npx tsc --noEmit — 0 errors

## pasted_content_35 — Copy & Messaging Refinement (Apr 13 2026)
- [ ] LiabilityScan: replace Advisor Insight body copy with system-level exposure framing
- [ ] LiabilityScan: tighten Liability Interpretation transition language
- [ ] LiabilityScan: add "What Typically Comes Next" transition copy before service cards
- [ ] HowWeHelp: replace top standard block with "What a Defensible Program Requires" copy
- [ ] HowWeHelp: update Service 1 (Full Liability Assessment) — overview, what it includes, why it matters, how it reduces exposure
- [ ] HowWeHelp: update Service 2 (Site-Specific Plan Development) — overview, what it includes, why it matters, how it reduces exposure
- [ ] HowWeHelp: update Service 3 (Training & Drill Implementation) — overview, what it includes, why it matters, how it reduces exposure
- [ ] SharedResults: add internal virality hook line ("This summary is often shared with leadership...")
- [ ] DefensibilityPlan: tighten framing copy to align with defensibility-driven tone
- [ ] PDF: tighten headings and advisory copy (liability exposure, defensibility posture, post-incident scrutiny)
- [ ] Run npx tsc --noEmit — 0 errors

## pasted_content_37 — Services Section Refinement

- [ ] Fix broken SVG logo (re-upload, update all img src references)
- [ ] Standardize all 3 service cards to identical 5-section structure (Description, Directly Addresses, Why Required, What Includes, How Reduces Liability)
- [ ] Add missing sections to Training & Drill card (Directly Addresses + Why Required + updated What Includes + updated How Reduces Liability)
- [ ] Replace passive language ("better positioned", "helps demonstrate", "supports") with liability-driven language across all services
- [ ] Enforce service sequence logic: "Planning must be established before training can be effective" / "Training without a documented plan is not considered defensible"
- [ ] Add "Required to establish a defensible foundation" subtext under Priority badge

## pasted_content_39 — Functional/Admin/Privacy/Navigation Updates

- [ ] Remove ID Notes field from Visitor Management UI and stop collecting it
- [ ] Allow Viewer role to access and submit incident reports
- [ ] Add back buttons to all major pages (visitor management, incident reporting, standards, glossary, scan/results/plan/services)
- [ ] Build Admin Tracking Token management area and wire incident reports into it
- [ ] Update homepage to show Canadian standards alongside U.S. standards
- [ ] Fix Features link on homepage — route to full features page with 6 features
- [ ] Update Glossary with Canadian terms and centralize data source
- [ ] Add flagged visitor watchlist with admin UI and real-time notification on check-in

## Drill Planning & Training Module (ACTD Framework — pasted_content_40)
- [x] Add drill_templates, drill_sessions, drill_participants tables to schema and migrate
- [x] Build drillRouter: generate (LLM), schedule, list, getById, complete, debrief procedures
- [x] Build DrillScheduler page — schedule drills, pick type/facility/mode (system vs user-prompted)
- [x] Build DrillRunner page — step-by-step ACTD execution view with timer and participant capture
- [x] Build DrillAfterAction page — debrief, gap capture, follow-up actions, system intelligence
- [x] Register /drills, /drills/:id/run, /drills/:id/debrief routes in App.tsx
- [x] Unlock Training & Drills nav section in AppLayout (remove locked flags)

## Drill UI & Engine Upgrades (pasted_content_41)
- [ ] Upgrade drill LLM prompt to threat-based engine (primaryThreatSignal, decisionPressure, behavioralCues)
- [ ] Add guidedResponse section to drill content schema and LLM prompt
- [ ] Drill Planner UI: text wrap fix, card consistency, regulation tooltip, header cleanup, ACTD hierarchy, scroll containment
- [ ] Add "View Guided Response" button and modal to drill output cards

## Micro Drill Refactor (pasted_content_42)
- [ ] Upgrade LLM prompt to generate micro-drill fields: responseOptions, outcomeMap, compressedGuidedResponse
- [ ] Rewrite DrillScheduler output card with choice-based micro drill interaction flow
- [ ] Apply drill-type differentiation: micro (choice-based, compressed) vs guided vs operational (full ACTD)
- [x] TypeScript check and validation

## Micro Drill Decision Engine Upgrade (Apr 14 2026)
- [x] Replace "Strongest Response" / "Suboptimal Response" with risk-tier labels (Low Risk / Moderate Risk / Elevated Risk / Introduces Additional Risk)
- [x] Add riskLevel, tradeoff, humanRealismNote fields to outcomeMap in LLM prompt
- [x] Add "What you chose → What risk it introduced → Stronger mental model" coaching connection block
- [x] Upgrade ACTD language to observational/situational awareness style (no generic policy phrases)
- [x] Update DrillScheduler UI to render risk tier badges, tradeoff, human realism note, and coaching connection

## Outcome Simulation Layer (Apr 14 2026)
- [x] Add likelyOutcome and whyThisMatters fields to LLM outcomeMap schema
- [x] Outcome must match risk tier (Low=controlled, Moderate=uncertain, Elevated=loss of control)
- [x] Render "Likely Outcome" and "Why This Matters" below Coaching Insight in DrillScheduler UI
- [x] TypeScript check and validation

## Unified ACTD Drill Engine Upgrade (Apr 14 2026)
- [x] Upgrade LLM prompt: type-specific rules for Guided, Operational, Extended drills
- [x] Add Guided drill fields: responsePaths, roleSpecificCues, documentationSection
- [x] Add Operational drill fields: teamRoles, scenarioTimeline, communicationCheckpoints, decisionBranches
- [x] Add Extended drill fields: exerciseType, facilitatorSetup, injects, participantRoles, criticalDecisions, communicationsFlow, afterActionTemplate
- [x] Update TypeScript DrillContent interface for all new type-specific fields
- [x] Rebuild Guided drill UI card: response paths, role cues, guided response panel
- [x] Rebuild Operational drill UI card: role-based sections, timeline, communication checkpoints
- [x] Rebuild Extended drill UI card: exercise type, facilitator setup, injects, after-action template
- [x] Fix duplicate ACTD card rendering bug (currently renders twice for non-micro drills)
- [x] UI formatting: overflow-wrap, word-break, card consistency, responsive layout
- [x] QA all four drill types with regression test scenarios
- [x] Run npx tsc --noEmit and confirm zero errors

## Guided Drill Refinement (Apr 14 2026)
- [x] Add decisionCheckpoints field to Guided drill LLM schema (1–2 reflective prompts)
- [x] Add outcomeProgression to each responsePath (1–2 sentences on situation evolution)
- [x] Tighten Expert Thinking panel language to ~60–90 second read time
- [x] Render decision checkpoints in UI (reflective, not multiple choice)
- [x] Render outcome progression under each response path card
- [x] Update vitest tests for new Guided drill fields
- [x] TypeScript check and checkpoint

## Guided Drill Interaction Refactor (Apr 15 2026)
- [x] Replace passive decisionCheckpoints with structured gated checkpoints array (2 per drill, 3 options each)
- [x] Add escalation phase: second checkpoint must reflect increased pressure or ambiguity
- [x] Hide outcomeProgression until after user selects an option
- [x] Gate progression: user must select before seeing next checkpoint or role cues
- [x] Show outcome + reasoning + expert framing after selection
- [x] Remove passive "Pause & Reflect" banner component
- [x] Preserve role-specific cues and documentation requirements
- [x] Update LLM prompt schema for new checkpoints structure
- [x] Update TypeScript types for new checkpoint shape
- [x] Update vitest tests for new interaction model
- [x] TypeScript check and checkpoint

## Guided Drill Decision System Refinement (Apr 15 2026)
- [x] Enable multi-option comparison: after selecting, allow viewing other options without reset
- [x] Add "Compare other approaches" UI affordance per checkpoint
- [x] Replace absolute risk labels with contextual descriptors/qualifiers
- [x] Increase consequence differentiation: strong/weak/poor actions have meaningfully different outcomes
- [x] Add tradeoff field per option: what was gained, what risk was introduced
- [x] Update LLM prompt schema for contextual riskLabel, tradeoff, differentiated outcomes
- [x] Update TypeScript types for new option fields
- [x] Update vitest tests for new fields and comparison behavior
- [x] TypeScript check and checkpoint

## Guided Drill Realism Refinement (Apr 15 2026)
- [x] Replace "Your selection is locked in" with "Primary path selected. Explore other approaches to compare outcomes."
- [x] LLM prompt: add realistic friction rule — strong actions must include continued uncertainty or incomplete control
- [x] LLM prompt: strengthen negative consequences — weak decisions must show org risk, delayed response, escalation consequences
- [x] LLM prompt: partial decision continuity — escalation context must reference whether security was alerted / control was established
- [x] LLM prompt: remove absolute tone ("ideal") — replace with "effective in this context", "strong option given current conditions"
- [x] Update vitest tests for new outcome friction and tone rules
- [x] TypeScript check and checkpoint

## Guided Drill Causality & Realism Refinement (Apr 15 2026)
- [x] LLM prompt: 3-variant escalation continuity (alert initiated / direct intervention / no action)
- [x] LLM prompt: each variant adjusts individual position, control level, response timing
- [x] LLM prompt: multi-dimensional risk modeling (personal risk, org/system risk, subject behavioral reaction)
- [x] LLM prompt: subject reaction realism — all outcomes must include how the individual reacts (accelerates, hesitates, evades, escalates)
- [x] LLM prompt: outcome friction rule — even strong decisions must include unresolved risk, timing gaps, incomplete control
- [x] LLM prompt: priority framing — each checkpoint includes "Your priority: ___" (containment/delay/visibility/coordination)
- [x] LLM prompt: real-world viability standards (policy alignment, role appropriateness, escalation awareness, no theatrical actions)
- [x] UI: render priorityFraming field in GuidedCheckpointCard header
- [x] UI: display escalation variant context based on prior selection
- [x] Update TypeScript types for priorityFraming and escalationVariants
- [x] Update vitest tests for new fields and rules
- [x] TypeScript check and checkpoint

## Universal Decision Doctrine Layer (Apr 15 2026)
- [x] Create server/drills/doctrine/decisionDoctrine.ts — types, principles, doctrine config
- [x] Create server/drills/doctrine/evaluateDecision.ts — 5-dimension evaluation function
- [x] Create server/drills/doctrine/generateLabel.ts — doctrine-derived contextual label generator
- [x] Create server/drills/doctrine/generateOutcome.ts — doctrine-shaped outcome generator
- [x] Create server/drills/doctrine/generateExpertReasoning.ts — situational decision analysis generator
- [x] Update LLM system prompt: embed doctrine evaluation rules for all 4 drill types
- [x] LLM prompt: doctrine-derived labels (no "correct/wrong/best answer")
- [x] LLM prompt: doctrine_evaluation object required on every option
- [x] LLM prompt: ACTD mapped to doctrine (assess=exposure+control+coordination, commit=lowest-force, document=defensible record)
- [x] LLM prompt: cross-scenario transferability rules (8 scenario types)
- [x] Update DrillContent TypeScript types: doctrine_evaluation on all option shapes
- [x] Write vitest tests for all 5 doctrine modules
- [x] TypeScript check and checkpoint

## Guided Drill System Fix — pasted_content_45 (Apr 15 2026)
- [x] Fix causality: remove all "regardless of your previous choice/action" from LLM prompt and UI
- [x] LLM prompt: 3 distinct escalation variants (direct intervention / alert+observation / passive)
- [x] LLM prompt: each variant reflects prior control level, coordination state, subject position
- [x] Fix interactivity bug: Checkpoint 2 options must never inherit locked state from Checkpoint 1
- [x] UI: each checkpoint maintains fully independent selection state
- [x] LLM prompt: ban theatrical language (yelling, dramatic confrontation); enforce controlled escalation
- [x] LLM prompt: all options must be policy-aligned, role-appropriate, operationally realistic, defensible
- [x] LLM prompt: risk labels must include personal exposure, space control, subject reaction, coordination impact
- [x] LLM prompt: no option labeled as purely "safe"
- [x] LLM prompt: enforce 3 distinct option strategies (direct control / coordination-first / engagement without control)
- [x] LLM prompt: each option must explicitly reflect supports/partially supports/conflicts with stated priority
- [x] LLM prompt: outcomes must include subject reaction, incomplete resolution, continued risk, time/coordination gaps
- [x] LLM prompt: ban passive language ("the situation progresses") — replace with subject-driven language
- [x] UI: fix label chip overflow — allow multi-line wrapping, max-width 100%, white-space normal, word-break break-word
- [x] UI: single-line labels → pill; multi-line labels → stacked container
- [x] Update vitest tests for all new rules
- [x] TypeScript check and checkpoint
- [x] ACCEPTANCE: Causality verified across checkpoints
- [x] ACCEPTANCE: Checkpoint interactivity verified
- [x] ACCEPTANCE: All options meet realism and policy standards
- [x] ACCEPTANCE: UI overflow issues resolved
- [x] ACCEPTANCE: Decision differentiation enforced
- [x] ACCEPTANCE: Outcomes reflect subject behavior and friction

## Guided Drill Refinements — pasted_content_46 (Apr 15 2026)
- [x] Remove generic causality bridge ("The situation has progressed") — go straight into state-based reality
- [x] Constrain Code Red option: add "(if appropriate to your facility)" and policy framing to description
- [x] Add "high disruption potential" to Code Red risk label
- [x] Standardize risk label format: [Exposure] + [Control] + [Coordination] + [Behavior Risk]
- [x] Enforce 12–16 word max label length in LLM prompt
- [x] Explicit priority alignment in every option: "Supports/Partially supports/Conflicts with the priority of…"
- [x] Tighten outcome resolution: "Security is able to intercept" → "Security is positioning to intercept"
- [x] Improve documentation window phrasing: "documentation window at risk" → "loss of clear incident documentation due to lack of early reporting"
- [x] Update mock drill data and tests to match new rules
- [x] TypeScript check and checkpoint

## Minor Tweak — Remove Generic Transition Phrase (Apr 15 2026)
- [x] Remove all instances of "The situation has progressed based on your previous action." — already banned in prompt
- [x] Harden LLM prompt ban: add explicit banned phrase list, hard-fail language, positive instruction
- [x] Expand vitest test to cover additional banned phrase variants
- [x] TypeScript check and checkpoint

## Remove All Generic Transition Statements (Apr 15 2026)
- [x] Grep full codebase for all banned transition phrase patterns
- [x] Fix routers.ts LLM prompt: remove/rewrite all instances
- [x] Fix DrillScheduler.tsx UI: remove/rewrite all instances
- [x] Fix drill.engine.test.ts mock data: remove/rewrite all instances
- [x] Expand vitest banned phrase test to cover all variants
- [x] TypeScript check and checkpoint

## Standardize Decision Labels (Apr 15 2026)
- [x] Update LLM prompt: strict [Exposure], [Control/Coordination], [Org Impact], [Behavior Risk] format
- [x] Add approved term list to LLM prompt
- [x] Add format validation rules (commas only, 3-6 words per segment, no sentences)
- [x] Update mock drill data to use standardized labels
- [x] Add vitest label format validation test
- [x] TypeScript check and checkpoint

## Strict Label Term Tightening (Apr 15 2026)
- [x] Remove "Minimal disruption" and "Unpredictable subject response" from LLM approved lists
- [x] Enforce exact-phrase-only rule in LLM prompt (no invented phrasing)
- [x] Update mock data: replace removed terms with approved equivalents
- [x] Update vitest approved term arrays to match final list
- [x] TypeScript check and checkpoint

## Exact Casing Enforcement (Apr 15 2026)
- [ ] LLM prompt: add EXACT CASING REQUIRED rule with approved capitalized terms
- [ ] Update mock data: fix any lowercase segment values
- [ ] Vitest: change segment comparison from .toLowerCase() to exact match
- [ ] TypeScript check and checkpoint

## Response Activation System (RAS) — Communication Module

- [ ] DB: add ras_role enum (admin | responder | staff) to users table (separate from platform role)
- [ ] DB: create alert_events table
- [ ] DB: create alert_recipients table
- [ ] DB: create alert_status_updates table
- [ ] DB: create facility_alert_settings table
- [ ] DB: create push_subscriptions table
- [ ] Backend: ras.activateAlert procedure (admin/responder only, audit logged)
- [ ] Backend: ras.acknowledge procedure (all ras roles)
- [ ] Backend: ras.markResponding procedure (responder only)
- [ ] Backend: ras.addStatusUpdate procedure (admin/responder only, audit logged)
- [ ] Backend: ras.resolveAlert procedure (admin only, audit logged)
- [ ] Backend: ras.getActiveAlert procedure
- [ ] Backend: ras.getAlertDashboard procedure (admin only)
- [ ] Backend: ras.savePushSubscription procedure
- [ ] Backend: push fanout on alert activation (role-aware)
- [ ] PWA: manifest.json configured (name, icons, display standalone, theme color)
- [ ] PWA: service worker registration in main.tsx
- [ ] PWA: push notification handler in service worker (sw.js)
- [ ] Frontend: Communication > Emergency Alerts route in sidebar nav
- [ ] Frontend: RAS Activation screen (Lockdown + Lockout buttons, confirmation modal)
- [ ] Frontend: Mobile alert received view (instruction + acknowledge + responding button)
- [ ] Frontend: Admin status dashboard (counts, responder status, update/resolve)
- [ ] Frontend: Resolved / All-clear view
- [ ] Frontend: Push permission prompt flow
- [ ] Frontend: PWA install prompt (beforeinstallprompt)
- [ ] Audit log wired to every RAS activation, update, and resolve action
- [ ] TypeScript check passes, tests updated

## Response Activation System (RAS) — Communication Platform Phase 1
- [x] Database schema: alert_events, alert_recipients, alert_status_updates, facility_alert_settings, push_subscriptions tables
- [x] Add rasRole field to users table (admin | responder | staff, separate from platform role)
- [x] Unique index on push_subscriptions (orgId, userId, endpoint) — one row per device per user per org
- [x] Generate platform-owned VAPID keys (environment-specific, not shared)
- [x] VAPID_PRIVATE_KEY server-only — never bundled to client, never returned in API responses
- [x] VITE_VAPID_PUBLIC_KEY client-visible only
- [x] VAPID_KEY_ROTATION.md documentation
- [x] server/push.ts — initVapid(), fanoutAlertPush() with role-filtered delivery, per-subscription failure handling, expired subscription cleanup
- [x] client/public/sw.js — service worker (scope /), push event handler, notificationclick deep-links to /ras, pushsubscriptionchange handler
- [x] client/public/manifest.json — PWA manifest with shortcuts to /ras
- [x] client/index.html — manifest link, theme-color, apple-mobile-web-app meta tags
- [x] client/src/lib/usePushSubscription.ts — full subscription lifecycle hook (register, permission, subscribe, save, rotation listener)
- [x] server/rasRouter.ts — all RAS tRPC procedures: getVapidPublicKey, savePushSubscription, activateAlert, acknowledge, markResponding, addStatusUpdate, resolveAlert, getActiveAlert, getAlertDashboard, getReadiness, getAlertHistory
- [x] Multi-tenant isolation: all queries/writes scoped to orgId, no cross-org access
- [x] Role-filtered fanout: staff/responder/admin receive distinct instruction payloads
- [x] Delivery failure visibility: failed/pending recipients surfaced in admin dashboard (not silently logged)
- [x] client/src/pages/EmergencyAlerts.tsx — full RAS frontend: activation screen, mobile alert view, admin dashboard, resolved view, readiness panel, push enrollment banner
- [x] Route /ras registered in App.tsx
- [x] 326 tests passing, TypeScript: 0 errors

## Liability Scan — Q10 & Q16 Upgrade (Apr 17 2026)
- [x] Replace q10 (binary real-time alert) with 4-tier RAS question (weight 14, role-based + tracking = full credit, basic = partial, limited = low, none = zero)
- [x] Add q16 Anonymous Threat Reporting question (weight 12, 4-tier: anonymous+formal = full, formal-only = partial, informal = low, none = zero)
- [x] Update CATEGORY_TOTALS: reporting_communication 30 → 44 (q8+q9+q10+q16)
- [x] Update scoring loop to handle multi-option fractional deductions
- [x] Update category scoring loop to handle multi-option fractional credit
- [x] Update top gaps generation to use reportGapOutput for q10 and q16
- [x] Update buildImmediateActionPlan to generate separate action items for q10 and q16
- [x] Update SAMPLE_RESPONSES to use valid multi-option values for q10 and q16
- [x] Add QuestionOption type and extend Question interface with options and reportGapOutput fields
- [x] Update TopGap and CrmPayload status types to include "Partial"
- [x] Update LiabilityScan.tsx UI to render multi-option questions as radio button groups
- [x] Update test files to accept "Partial" as valid gap status
- [x] TypeScript: 0 errors. 326 tests passing.

## Feature Batch — April 2026 (Item 7 batch)

- [ ] Add assigned emergency roles (Site Lead, Secondary Lead, Emergency Caller, Evacuation Coordinator, Accountability Coordinator, Media Relations) with secondary/tertiary slots to Facility Profile
- [ ] Add AED on-site field (yes/no + location(s)) to Facility Profile
- [ ] Add super-admin EAP section edit mode to EAP accordion
- [ ] Add staff check-in panel (Reunification / Injured / Off-Site / Cannot Disclose + location field) to Dashboard Communication
- [ ] Add red/yellow flag selector to Visitor Flags
- [ ] Add AAR (After Action Review) and BCP (Business Continuity Plan) to Glossary

## Feature Updates — April 20 2026
- [x] Facility Profile: Emergency Roles section (Site Lead, Secondary Lead, Emergency Caller, Evacuation Coordinator, Accountability Coordinator, Media Relations — each with Primary/Secondary/Tertiary contacts)
- [x] Facility Profile: AED on-site toggle + AED location(s) field
- [x] Emergency Action Plan: Super-admin only edit gate after EAP generation
- [x] Dashboard > Communication: Staff Check-In page (status: Reunification / Injured / Off-site / Cannot Disclose + location field)
- [x] Staff Check-In added to Communication nav section
- [x] Visitor Flags: Red Flag (high concern) / Yellow Flag (less serious) selection in add form + badge display
- [x] Glossary: Added AAR (After Action Review) entry
- [x] Glossary: Added BCP (Business Continuity Plan) entry

## BTAM Phase 1 — Behavioral Threat Assessment & Management

- [x] DB schema: btam_cases, btam_subjects, btam_referral_intake, btam_wavr_assessment, btam_management_plan, btam_case_notes, btam_status_history tables
- [x] DB schema: add btam_role enum to users table
- [x] Generate and apply migration
- [x] Server: AES-256-GCM encryption module for PII fields
- [x] Server: db helpers for all BTAM tables
- [x] Server: WAVR-21-derived scoring engine
- [x] Server: tRPC BTAM router (cases, subjects, intake, assessments, management plan, notes, status history)
- [x] Server: notifications (new referral → TAT_Admin, high/imminent → TAT_Admin + Assessor)
- [x] Frontend: BTAM Case Dashboard with filters, concern level badges, status badges
- [x] Frontend: Referral Intake multi-step form with safety banner and S3 file upload
- [x] Frontend: Case Detail — Summary tab
- [x] Frontend: Case Detail — Assessment tab with WAVR instrument and scoring output
- [x] Frontend: Case Detail — Management Plan tab
- [x] Frontend: Case Detail — Notes & Timeline tab
- [x] Frontend: Bidirectional incident linking (Escalate to BTAM from Incident, linked incident card in BTAM)
- [x] Frontend: BTAM nav entry in AppLayout
- [x] Tests and tsc --noEmit (346 tests passing, 0 TypeScript errors)

## BTAM Phase 2 — Bidirectional Incident ↔ BTAM Connection

- [x] Server: add `incident.getById` procedure for fetching a single incident report by ID (admin-protected)
- [x] Server: add `btam.getCaseByLinkedIncident` procedure to find a BTAM case by linkedIncidentId
- [x] Frontend: linked incident card on BTAM Case Detail Summary tab (type, severity, date, description snippet)
- [x] Frontend: role-gate Escalate to BTAM button — visible only to admin/assessor roles
- [x] Frontend: BTAM escalation badge on Incident Dashboard row (shows BTAM case number badge if a BTAM case exists for that incident)
- [x] Frontend: BTAM escalation indicator in Incident Dashboard detail panel (link to the BTAM case)
- [x] Tests and tsc --noEmit (346 tests passing, 0 TypeScript errors)

## BTAM Phase 3 — Behavioral Warning Sign Keyword Flagging

- [x] Define comprehensive keyword/phrase dictionary covering all 10 behavioral warning signs AND all WAVR-21 factor terminology
- [x] Server: `shared/threatKeywords.ts` — keyword dictionary with category, severity, and WAVR factor mapping
- [x] Server: `server/threatFlagEngine.ts` — scanText() function that returns matched flags with category, severity, matched phrases, and WAVR factor keys
- [x] Server: `btam.analyzeText` tRPC procedure — accepts text, returns flags (used by incident form and BTAM intake)
- [x] Server: store threat flags on incident_reports table (new `threatFlags` JSON column)
- [x] Server: auto-scan incident description on incident submit and update
- [x] Frontend: threat-indicator badges on Incident Dashboard rows (severity-colored Risk badge)
- [x] Frontend: Threat Flags panel in Incident detail modal — shows matched warning signs, severity, matched phrases, and WAVR factor keys
- [x] Frontend: auto-prompt BTAM escalation banner when high/critical flags detected (admin only)
- [ ] Frontend: live keyword highlighting in BTAM Intake form description field (deferred)
- [x] Tests and tsc --noEmit (358 tests passing, 0 TypeScript errors)
