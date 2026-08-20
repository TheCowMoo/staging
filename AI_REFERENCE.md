# AI Reference Map — Safeguard Audit Platform (Five Stones Technology)

> **Purpose**: This file is a canonical mapping reference for AI programming tools.  
> **Usage**: Read this file first before making any changes. It describes the entire codebase: file organization, route-to-component mapping, tRPC router structure, database schema, shared logic, and key architectural patterns.

---

## 1. Project Identity

- **Product Name**: Five Stones Safeguard Audit Platform (formerly PursuitPathways Workplace App)
- **What it does**: A self-hosted workplace safety assessment platform. Users conduct facility audits (up to 180 questions across 17 categories), generate corrective action plans, create NFPA 3000–aligned Emergency Action Plans (EAPs), manage incidents, schedule drills, track personnel/visitors, run behavioral threat assessments (BTAM), and send mass notifications.
- **Repository**: `https://github.com/TheCowMoo/staging.git`
- **Hosting**: Self-hosted Node.js (Vercel, Render, Railway, AWS, DigitalOcean, etc.)

---

## 2. Tech Stack

| Layer        | Technology                                                        |
|-------------|-------------------------------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, shadcn/ui, React Query, wouter (routing) |
| Backend     | Node.js, Express, tRPC (server + client), Drizzle ORM             |
| Database    | MySQL / TiDB                                                      |
| Auth        | Custom JWT-based email/password (bcrypt, httpOnly cookies)        |
| Storage     | AWS S3 (or S3-compatible: Cloudflare R2, MinIO)                   |
| AI/LLM      | OpenAI API (or any OpenAI-compatible endpoint)                     |
| Maps        | Google Maps API                                                    |
| Push Notif  | VAPID (Web Push API) + desktop app (C# .NET, ras-desktop-alert/)   |
| Payments    | Stripe (externalSubscriptionId on organizations table)            |

---

## 3. Directory Map

```
├── AI_REFERENCE.md              ← THIS FILE — AI mapping reference
├── README.md                    ← User-facing getting-started guide
├── package.json                 ← Monorepo root (scripts, dependencies)
├── tsconfig.json                ← TypeScript config
├── vite.config.ts               ← Vite config (client dev server)
├── drizzle.config.ts            ← Drizzle Kit config
├── .env.example                 ← Required environment variables
├── client/                      ← React frontend
│   ├── index.html               ← Vite entry point
│   ├── src/
│   │   ├── main.tsx             ← App bootstrap (mounts React)
│   │   ├── App.tsx              ← ALL ROUTES defined here (wouter <Switch>)
│   │   ├── index.css            ← Global styles + Tailwind imports
│   │   ├── const.ts             ← Client-side constants
│   │   ├── _core/hooks/         ← Core shared hooks
│   │   ├── components/
│   │   │   ├── assessment/      ← Audit-walkthrough components
│   │   │   ├── ui/              ← shadcn/ui primitives (button, card, dialog, etc.)
│   │   │   ├── AppLayout.tsx    ← Main app shell (sidebar + topbar)
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ProtectedLayout.tsx ← Auth-gated wrapper
│   │   │   ├── Map.tsx          ← Google Maps wrapper
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── AIChatBox.tsx    ← AI assistant chat widget
│   │   │   └── ...other shared components
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx  ← Dark/light theme provider
│   │   ├── hooks/               ← Custom React hooks
│   │   ├── lib/                 ← Client utilities
│   │   │   ├── trpc.ts          ← tRPC client setup
│   │   │   ├── utils.ts         ← Generic helpers (cn(), etc.)
│   │   │   ├── riskUtils.ts     ← Risk-level color/display helpers
│   │   │   └── scanSession.ts   ← Liability scan state management
│   │   └── pages/              ← One component per route (see §4)
│   └── public/                  ← Static assets
├── server/                      ← Express + tRPC backend
│   ├── db.ts                    ← Database functions (Drizzle ORM queries)
│   │                            ← This is the MAIN data-access layer (~5000+ lines)
│   ├── routers.ts               ← ALL tRPC procedure definitions (~4200 lines)
│   ├── storage.ts               ← S3 file upload/download
│   ├── push.ts                  ← VAPID web push notifications
│   ├── auditLogger.ts           ← Audit log writer
│   ├── _core/                   ← Core infra
│   │   ├── trpc.ts              ← tRPC init + auth middleware (public, protected, auditor, admin, ultra_admin, etc.)
│   │   ├── context.ts           ← tRPC context builder (req, res, user)
│   │   ├── cookies.ts           ← Cookie helpers
│   │   ├── llm.ts               ← OpenAI LLM helper
│   │   ├── notification.ts      ← Notification engine
│   │   ├── ghl.ts               ← GoHighLevel email integration
│   │   ├── env.ts               ← Environment variables loader
│   │   └── systemRouter.ts      ← System-level tRPC procedures
│   ├── liabilityScanAi.ts       ← AI-driven liability scan engine
│   ├── liabilityScanPdf.ts      ← Liability scan PDF generator
│   ├── eapPdf.ts                ← EAP PDF generator
│   ├── eapMerge.ts              ← EAP merge utilities
│   ├── btamDb.ts                ← BTAM database functions
│   ├── btamScoring.ts           ← WAVR-21 scoring algorithm
│   ├── btamEncryption.ts        ← BTAM data encryption
│   ├── threatFlagEngine.ts      ← Text scanning for threat keywords
│   ├── notificationRouter.ts    ← Notifications tRPC sub-router
│   ├── notificationDb.ts        ← Notifications database functions
│   ├── rasRouter.ts             ← RAS (Emergency Alerts) tRPC router
│   ├── apiKeyRouter.ts          ← API key management tRPC router
│   ├── massNotificationRouter.ts ← Mass notification tRPC router
│   ├── microDrillRouter.ts      ← Micro-drills tRPC router
│   ├── facilityMapRouter.ts     ← Facility floor map tRPC router
│   ├── incidentCommunicationRouter.ts ← Incident comms tRPC router
│   ├── trainingModuleRouter.ts  ← Training modules tRPC router
│   ├── trainingModuleUpload.ts  ← Training module file upload
│   ├── attachmentUpload.ts      ← Attachment upload logic
│   ├── flaggedVisitorUpload.ts  ← Flagged visitor photo upload
│   ├── jurisdictionDocs.ts      ← Jurisdiction-specific document loader
│   ├── migrate_jurisdiction.ts  ← Jurisdiction migration helper
│   ├── auth.logout.test.ts      ← Auth logout test
│   ├── assessment.engine.test.ts ← Assessment engine tests
│   ├── audit.scoring.test.ts    ← Audit scoring tests
│   ├── liability.scan.test.ts   ← Liability scan tests
│   ├── liabilityScanAi.test.ts  ← AI scan tests
│   ├── liabilityScanScoring.test.ts ← Scoring tests
│   ├── canada.jurisdiction.test.ts ← Canada juris tests
│   ├── drill.engine.test.ts     ← Drill engine tests
│   ├── industry.overlay.test.ts ← Industry overlay tests
│   ├── standards.accordion.test.ts ← Standards accordion tests
│   ├── threatFlagEngine.test.ts ← Threat flag engine tests
│   ├── configs/                 ← Server config files
│   └── drills/                  ← Drill data files
├── shared/                      ← Code shared between client and server
│   ├── types.ts                 ← Re-exports drizzle/schema types + errors
│   ├── const.ts                 ← Shared constants (COOKIE_NAME, error messages)
│   ├── permissions.ts           ← Role/permission types and guards (~483 lines)
│   ├── assessmentEngine.ts      ← Audit assessment scoring logic
│   ├── auditFramework.ts        ← Audit categories, weights, scoring calc
│   ├── actionEngine.ts          ← Corrective action recommendation engine
│   ├── basisLibrary.ts          ← Standards citation library
│   ├── drillEngine.ts           ← Drill session engine
│   ├── eapFramework.ts          ← EAP framework constants
│   ├── gapMap.ts                ← Audit gap mapping
│   ├── industryOverlayContent.ts← Industry-specific content
│   ├── jurisdictionContent.ts   ← Jurisdiction-specific content
│   ├── liabilityScanScoring.ts  ← Liability scan scoring logic
│   ├── microDrillsData.ts       ← Micro-drill definitions
│   ├── extendedDrillsData.ts    ← Extended drill definitions
│   ├── oshaContent.ts           ← OSHA reference content
│   ├── stateContent.ts          ← State-specific content
│   ├── stateProvinces.ts        ← State/province lists
│   ├── threatKeywords.ts        ← Threat keyword library
│   └── _core/                   ← Core shared utilities
├── drizzle/                     ← Database schema + migrations
│   ├── schema.ts                ← ALL table definitions (~1019 lines)
│   ├── relations.ts             ← Drizzle relations between tables
│   ├── 0000_* … 0037_*          ← Sequential SQL migration files
│   └── meta/ + migrations/      ← Drizzle Kit metadata
├── docs/                        ← Documentation
│   ├── assessment_ui_recommendations.md
│   └── jurisdictions/
├── patches/                     ← Patch files (wouter@3.7.1.patch)
├── scripts/                     ← One-off migration/utility scripts
└── ras-desktop-alert/           ← C# .NET desktop alert app
    ├── Program.cs
    ├── RasDesktopAlert.csproj   ← WinForms project
    ├── build.bat               ← Build script
    ├── setup.iss               ← Inno Setup installer
    ├── convert_audio.py         ← Audio conversion helper
    └── generate_icon.py         ← Icon generation helper
```

---

## 4. Route → Page → Feature Map

Every route is defined in `client/src/App.tsx` (the `Router()` function). The route pattern → page file → description:

| Route Pattern                           | Page Component File                       | Feature Description                                        |
|----------------------------------------|-------------------------------------------|------------------------------------------------------------|
| `/`                                    | `pages/Home.tsx`                          | Landing/marketing home page                                 |
| `/login`                               | `pages/Login.tsx`                         | Email/password log in                                       |
| `/forgot-password`                     | `pages/ForgotPassword.tsx`                | Password reset request                                      |
| `/reset-password`                      | `pages/ResetPassword.tsx`                 | Password reset form                                         |
| `/set-password`                        | `pages/SetPassword.tsx`                   | First-time password set (invite flow)                       |
| `/verify-email`                        | `pages/VerifyEmail.tsx`                   | Email verification                                           |
| `/dashboard`                           | `pages/Dashboard.tsx`                     | User dashboard (audit + incident + drill widgets)           |
| `/settings`                            | `pages/Settings.tsx`                      | User profile/settings                                        |
| `/analytics`                           | `pages/AnalyticsDashboard.tsx`            | Cross-org analytics                                          |
| `/facilities`                          | `pages/Facilities.tsx`                    | Facility list                                                |
| `/facilities/new`                      | `pages/FacilityOnboarding.tsx`            | New facility wizard (current)                                |
| `/facilities/onboarding`               | `pages/FacilityOnboarding.tsx`            | Same wizard (alias)                                          |
| `/facilities/onboarding-legacy`        | `pages/NewFacility.tsx`                   | Legacy facility creation form                                |
| `/facilities/:id`                      | `pages/FacilityDetail.tsx`                | Single facility detail                                       |
| `/facility-mapping`                    | `pages/FacilityMapBuilder.tsx`            | Floor plan map editor                                        |
| `/audits`                              | `pages/AuditHistory.tsx`                  | Past audit history list                                      |
| `/audit/:id`                           | `pages/AuditWalkthrough.tsx`              | Audit walkthrough (question-by-question)                     |
| `/audit/:id/walkthrough`               | `pages/WalkthroughMode.tsx`               | Full-screen walkthrough mode                                 |
| `/audit/:id/report`                    | `pages/AuditReport.tsx`                   | Audit report view                                            |
| `/audit/:id/feedback`                  | `pages/TesterFeedback.tsx`                | Tester feedback form                                         |
| `/audit/:id/eap`                       | `pages/EmergencyActionPlan.tsx`           | EAP builder/generator                                        |
| `/feedback`                            | `pages/FeedbackDashboard.tsx`             | All feedback dashboard                                       |
| `/eap`                                 | `pages/EAPList.tsx`                       | List of EAP documents                                        |
| `/report-incident`                     | `pages/ReportIncident.tsx`                | Anonymous incident report                                    |
| `/check-report`                        | `pages/CheckReport.tsx`                   | Check incident report status by token                        |
| `/incidents`                           | `pages/IncidentDashboard.tsx`             | Incident management dashboard                                |
| `/report/:slug`                        | `pages/OrgIncidentReport.tsx`             | Org public incident portal (by org slug)                     |
| `/glossary`                            | `pages/Glossary.tsx`                      | Standards glossary                                            |
| `/standards`                           | `pages/Standards.tsx`                     | Standards reference browser                                  |
| `/osha`                                | `pages/OshaReference.tsx`                 | OSHA 29 CFR reference                                        |
| `/liability-scan`                      | `pages/LiabilityScan.tsx`                 | Liability exposure scan tool                                  |
| `/scan-history`                        | `pages/ScanHistory.tsx`                   | Past liability scan history                                   |
| `/defensibility-plan`                  | `pages/DefensibilityPlan.tsx`             | Defensibility plan report                                     |
| `/how-we-help`                         | `pages/HowWeHelp.tsx`                     | Feature overview / marketing page                             |
| `/shared/:token`                       | `pages/SharedResults.tsx`                 | Shared scan/audit results (public token)                      |
| `/legal/privacy`                       | `pages/PrivacyPolicy.tsx`                 | Privacy policy                                                |
| `/legal/terms`                         | `pages/TermsOfService.tsx`                | Terms of service                                              |
| `/terms-and-conditions`                | `pages/TermsAndConditions.tsx`            | Terms and conditions acceptance                               |
| `/visitors`                            | `pages/VisitorManagement.tsx`             | Visitor management dashboard                                  |
| `/admin/flagged-visitors`              | `pages/FlaggedVisitors.tsx`               | Watchlist management                                          |
| `/admin/users`                         | `pages/UserManagement.tsx`                | User management (platform)                                    |
| `/admin/api-keys`                      | `pages/ApiKeys.tsx`                       | API key management                                            |
| `/user-management`                     | (redirects to /admin/users)              | Legacy redirect                                               |
| `/organizations`                       | `pages/AdminOrgs.tsx`                     | All organizations (ultra_admin)                               |
| `/org/:id`                             | `pages/OrgAdmin.tsx`                      | Single org admin panel                                        |
| `/join`                                | `pages/JoinOrg.tsx`                       | Join org by invite token                                      |
| `/drills`                              | `pages/DrillScheduler.tsx`                | Drill calendar/scheduler                                      |
| `/drills/after-action`                 | `pages/DrillAfterActionIndex.tsx`         | After-action review list                                      |
| `/drills/:id/run`                      | `pages/DrillRunner.tsx`                   | Run a drill session                                            |
| `/drills/:id/debrief`                  | `pages/DrillAfterAction.tsx`              | Drill debrief form                                            |
| `/ras`                                 | `pages/EmergencyAlerts.tsx`               | RAS emergency alerts dashboard                                |
| `/ras/activate`                        | `pages/RASActivation.tsx`                 | Trigger RAS emergency alert                                   |
| `/staff-checkin`                       | `pages/StaffCheckin.tsx`                  | Staff accountability check-in                                 |
| `/training-modules`                    | `pages/TrainingModules.tsx`               | Training module library                                       |
| `/personnel-tracking`                  | `pages/PersonnelTracking.tsx`             | Personnel location tracking                                   |
| `/btam`                                | `pages/BtamDashboard.tsx`                 | BTAM case dashboard                                           |
| `/btam/new`                            | `pages/BtamIntake.tsx`                    | New BTAM case intake                                           |
| `/btam/:id`                            | `pages/BtamCaseDetail.tsx`                | Single BTAM case detail                                       |
| `/mass-notification`                   | `pages/MassNotification.tsx`              | Mass notification composer                                    |
| `/micro-drills`                        | `pages/MicroDrillAdmin.tsx`               | Micro-drill admin panel                                       |
| `/micro-drills/run/:assignmentId`      | `pages/MicroDrillRunner.tsx`             | Run a micro-drill assignment                                   |
| `/micro-drills/tracking`               | `pages/MicroDrillTracking.tsx`            | Micro-drill completion tracking                               |
| `/extended-drills`                     | `pages/ExtendedDrillRunner.tsx`           | Extended drill runner                                         |
| `/extended-drills/:drillId`            | `pages/ExtendedDrillRunner.tsx`           | Extended drill with specific ID                               |
| `/notifications`                       | `pages/NotificationsPage.tsx`             | User notification inbox                                       |
| `/404`                                 | `pages/NotFound.tsx`                      | 404 page                                                      |
| `*`                                    | `pages/NotFound.tsx`                      | Catch-all 404                                                 |

### Auth/Public Pages (no login required):
- Home (`/`), Login (`/login`), ForgotPassword, ResetPassword, SetPassword, VerifyEmail
- HowWeHelp, PrivacyPolicy, TermsOfService, TermsAndConditions
- CheckReport, SharedResults (`/shared/:token`), OrgIncidentReport (`/report/:slug`)

### Layout Components:
- `AppLayout.tsx` — Main authenticated app shell (sidebar + top bar + content)
- `DashboardLayout.tsx` — Dashboard-specific layout
- `DashboardLayoutSkeleton.tsx` — Loading skeleton
- `ProtectedLayout.tsx` — Route guard (checks auth, redirects to login)

---

## 5. tRPC Router → Backend Logic Map

All tRPC routers are defined in `server/routers.ts` and merged at the bottom. Auth middleware is in `server/_core/trpc.ts`.

### Auth Middleware Hierarchy (server/_core/trpc.ts)
| Procedure           | Description                                                    |
|---------------------|----------------------------------------------------------------|
| `publicProcedure`   | No auth required                                               |
| `protectedProcedure`| Requires valid session cookie                                  |
| `auditorProcedure`  | Requires role ≥ auditor (blocks viewer, user)                  |
| `adminProcedure`    | Requires role = admin, super_admin, ultra_admin                |
| `ultraAdminProcedure`| Requires role = ultra_admin                                   |
| `superAdminProcedure`| Requires role = super_admin or ultra_admin                    |
| `orgAdminProcedure` | Requires org_members role = admin or higher                    |
| `paidProcedure`     | Requires org plan = "paid"                                     |

### Sub-Routers in routers.ts

| Sub-Router              | Lines      | Key Procedures                                                   | Description                    |
|------------------------|------------|------------------------------------------------------------------|--------------------------------|
| `facilityRouter`       | 80-192     | list, get, create, update, delete                                 | CRUD facilities                 |
| `auditRouter`          | 194-396    | listByFacility, listMine, get, create, saveResponse, getResponses, complete, updateNotes, saveEapContacts, getEapContacts, saveSectionEapNotes, getSectionEapNotes, reopen | Audit workflow                 |
| `threatRouter`         | 397-436    | list, create, deleteAll                                           | Threat findings QRA             |
| `reportRouter`         | 438-982    | generate, generateMarkdown, getEAP, generateEAP, generateAIRecommendations | Report + EAP generation (uses LLM) |
| `photoRouter`          | 984-1033   | list, upload, delete                                              | Audit photos                    |
| `incidentRouter`       | 1034-1205  | create, list, getByToken, getById, updateStatus, updateThreatFlags, deleteAll, delete, findSimilar, findByPerson, markRepeat | Incident reporting              |
| `organizationRouter`   | 1206-1366  | create, list, get, getBySlug, update, delete                      | Organization CRUD               |
| `orgMemberRouter`      | 1367-1495  | listForOrg, listWithLocations, myMembership, get, add, updateRole, remove, invite, getInviteByToken, pendingInvites, useInvite, deleteInvite | Org membership + invites        |
| `auditLogRouter`       | 1496-1529  | listByOrg, listAll                                                 | Audit log viewing                |
| `visitorRouter`        | 1530-1610  | create, list, checkout, update, delete                            | Visitor management               |
| `flaggedVisitorRouter` | 1611-1685  | list, get, stampEscalation, add, deactivate, delete, check        | Watchlist management             |
| `adminRouter`          | 1686-1720  | listUsers, updateRole, updateOrgMemberPermissionFlags, getOrgMemberWithFlags | Admin user management           |
| `eapRouter`            | 1721-1773  | list, getSection, saveSection, getVersions                         | EAP section CRUD + versioning   |
| `drillRouter`          | 1774-1872  | createTemplate, listTemplates, getTemplate, createSession, listSessions, getSession, updateSession, addParticipants, getParticipants | Drill management                |
| `staffCheckinRouter`   | 1873-1920  | create, list, delete, clear                                        | Staff check-in                   |
| `userRouter`           | 1921-2355  | login, register, logout, me, updateProfile, updatePassword, changePassword, requestPasswordReset, resetPassword, acceptTerms, getUnreadNotificationCount | Auth + user profile             |
| `liabilityScanRouter`  | 2356-2485  | create, list, get, getByShareToken, delete, updateTierScores       | Liability exposure scans         |
| `billingRouter`        | 2486-2528  | createStripeSession, manageBilling, webhook                        | Stripe billing                   |
| `termsRouter`          | 2529-2565  | getAcceptedTerms, acceptTerms                                      | Terms acceptance                  |
| `apiKeyRouter`         | 2566-2622  | create, list, revoke                                               | API key management                |
| `threatFlagRouter`     | 2623-2661  | scanText, scanIncident, scanAuditResponse                          | Threat keyword scanning           |
| `btamRouter`           | 2662-3010  | createCase, listCases, getCase, updateCase, createAssessment, getAssessments, getLatestAssessment, createPlanItem, getPlan, updatePlanItem, deletePlanItem, createNote, getNotes, createStatusHistory, getStatusHistory, createReferralIntake, getReferralIntake, getByLinkedIncident | BTAM (Behavioral Threat)        |
| `jurisdictionRouter`   | 3011-3067  | getStateSection, getGlossary, getProvinceSection                    | Jurisdiction content              |

### Standalone Routers (separate files, merged at bottom):
| Router File                        | Key Purpose                                | Mounted As         |
|------------------------------------|--------------------------------------------|--------------------|
| `server/rasRouter.ts`              | Emergency alert activation + status         | `ras`              |
| `server/massNotificationRouter.ts` | Send mass notifications to org members      | `massNotification` |
| `server/microDrillRouter.ts`       | Micro-drill assignments & responses         | `microDrill`       |
| `server/facilityMapRouter.ts`      | Facility floor map CRUD                     | `facilityMap`      |
| `server/incidentCommunicationRouter.ts` | Real-time incident comms               | `incidentComm`     |
| `server/notificationRouter.ts`     | In-app notification CRUD + preferences      | `notifications`    |
| `server/apiKeyRouter.ts`           | API key CRUD (also has inline in routers.ts)| `apiKeys`          |
| `server/trainingModuleRouter.ts`   | Training modules CRUD + progress tracking   | `trainingModules`  |
| `server/_core/systemRouter.ts`     | Health check, env info (ultra_admin only)   | `system`           |

### Merged Router (bottom of routers.ts):
All sub-routers are merged into a single `appRouter`:
```ts
export const appRouter = router({
  facility: facilityRouter,
  audit: auditRouter,
  threat: threatRouter,
  report: reportRouter,
  photo: photoRouter,
  incident: incidentRouter,
  organization: organizationRouter,
  orgMember: orgMemberRouter,
  auditLog: auditLogRouter,
  visitor: visitorRouter,
  flaggedVisitor: flaggedVisitorRouter,
  admin: adminRouter,
  eap: eapRouter,
  drill: drillRouter,
  staffCheckin: staffCheckinRouter,
  user: userRouter,
  liabilityScan: liabilityScanRouter,
  billing: billingRouter,
  terms: termsRouter,
  apiKeys: apiKeyRouter,
  threatFlags: threatFlagRouter,
  btam: btamRouter,
  jurisdiction: jurisdictionRouter,
  ras: rasRouter,
  massNotification: massNotificationRouter,
  microDrill: microDrillRouter,
  facilityMap: facilityMapRouter,
  incidentComm: incidentCommunicationRouter,
  notifications: notificationRouter,
  trainingModules: trainingModuleRouter,
  system: systemRouter,
});
export type AppRouter = typeof appRouter;
```

---

## 6. Database Schema Map

All tables defined in `drizzle/schema.ts` (~1019 lines). Key tables:

| Table                      | Description                                                           |
|----------------------------|-----------------------------------------------------------------------|
| `organizations`            | Client agencies/companies. `plan` (free/paid), `externalSubscriptionId`, `websiteResourceLinks` |
| `org_members`              | Links users → orgs with role (incl. `sandbox`) + permission flags      |
| `personnel_locations`      | Staff location tracking during incidents                               |
| `training_modules`         | Uploaded training content (`playerType`, `trackingType`, `thumbnailUrl`) |
| `org_invites`              | Pending org invitation tokens (incl. `sandbox`)                        |
| `user_invites`             | Platform-level invitation tokens (role incl. `sandbox`)                |
| `users`                    | User accounts (openId, email, password hash, platform role incl. `sandbox`, rasRole, btamRole) |
| `api_keys`                 | Hashed API keys for programmatic access                                |
| `facilities`               | Physical locations being assessed (name, address, type, size, hours)   |
| `audits`                   | Assessment sessions (status, scores, EAP data, contacts)               |
| `audit_responses`          | Individual question responses per audit (score, notes, photos)         |
| `threat_findings`          | Threat severity assessments (QRA: likelihood, impact, preparedness)    |
| `audit_photos`             | Photo evidence linked to audit responses                               |
| `tester_feedback`          | Beta tester feedback on audits                                         |
| `question_flags`           | User-flagged questions for review                                      |
| `incident_reports`         | Incident reports (anonymous token, OSHA fields, threat flags, repeat tracking) |
| `facility_attachments`     | Uploaded facility documents (with AI analysis)                         |
| `corrective_action_checks` | Tracking items marked as complete in action plan                       |
| `audit_logs`               | Immutable audit trail of user actions                                  |
| `visitor_logs`             | Visitor sign-in/out records (photo ID verification)                    |
| `liability_scans`          | AI liability exposure scans (tier scoring, risk map, advisor summary)  |
| `scan_share_tokens`        | Public share tokens for scans (expiry/revocation/label)                |
| `eap_sections`             | EAP document sections with per-section auditor overrides               |
| `eap_section_versions`     | Version history for EAP section overrides                              |
| `flagged_visitors`         | Watchlist entries (`flagLevel` red/yellow, escalation, photoFileKey)    |
| `drill_templates`          | Reusable drill templates (micro/guided/operational/extended)           |
| `drill_sessions`           | Drill sessions (scheduled/completed, debrief data, intelligence)       |
| `drill_participants`       | Staff who participated in a drill                                      |
| `alert_events`             | Emergency alert events (lockdown/lockout/fire/weather)                 |
| `alert_recipients`         | Per-user alert delivery/ack/response tracking                          |
| `alert_status_updates`     | Authorized alert status changes (active/response_in_progress/resolved) |
| `facility_alert_settings`  | Per-facility RAS templates (lockdown/lockout, push, escalation prefs)  |
| `push_subscriptions`       | Browser/PWA Web Push subscriptions (unique endpoint per org+user)      |
| `staff_checkins`           | Staff accountability check-ins                                         |
| `btam_cases`               | Behavioral Threat Assessment Management cases                          |
| `btam_subjects`            | BTAM subjects (AES-256-GCM encrypted alias/contact)                    |
| `btam_referral_intake`     | Referral intake forms                                                  |
| `btam_wavr_assessments`    | WAVR-21 assessment results per case (55 cols)                          |
| `btam_management_plan`     | Mitigation/management plan items                                       |
| `btam_case_notes`          | Case notes and observations (privileged flags)                         |
| `btam_status_history`      | Case status change history                                             |
| `micro_drill_assignments`  | Micro-drill assignments to users (snake_case columns)                  |
| `facility_floor_maps`      | Floor plan data (GeoJSON, snake_case columns)                          |
| `incident_communications`  | Real-time incident comms messages                                      |
| `notifications`            | In-app notification records (snake_case columns)                       |

---

### ✅ `full_sync.sql` is now the SINGLE authoritative schema

**`drizzle/full_sync.sql` was regenerated from `drizzle/schema.ts`** by `scripts/dump-full-sync.ts` and contains the complete, idempotent DDL for **all 45 tables** (verified by importing into a scratch MySQL 9.7 DB via `scripts/verify-full-sync.mjs`). It is safe to run multiple times (`CREATE TABLE IF NOT EXISTS`).

**`full_sync_remainder.sql` is now a no-op** (kept so existing deployment scripts don't break).

**Schema tooling**
- `scripts/dump-full-sync.ts` — regenerate `full_sync.sql` from `schema.ts`: `npx tsx scripts/dump-full-sync.ts --write`
- `scripts/verify-full-sync.mjs` — import `full_sync.sql` into a scratch DB and verify: `node scripts/verify-full-sync.mjs`
- `scripts/diff-live-schema.mjs` — read-only drift report of the live DB vs `full_sync.sql`; `--write-fixes` generates `drizzle/live_schema_fixes.sql` (CREATE missing tables → ADD COLUMN → MODIFY COLUMN, ordered safest-first). Run it on the server, review the fix file, then `mysql < live_schema_fixes.sql`.

**⚠️ `split_01…split_05.sql` remain STALE** — `split_04` was hand-corrected (all 8 tables match `schema.ts`), but `split_01/02/03/05` still carry legacy definitions (`organizations`, `facilities`, `audits`, `audit_responses`, `threat_findings`, `audit_photos`, `tester_feedback`, `question_flags`, `facility_attachments`, `corrective_action_checks`, `audit_logs`, `visitor_logs`, all `alert_*`, `push_subscriptions`, `staff_checkins`, and all `btam_*`). **Never use the split files for a fresh DB — use `full_sync.sql`.**

**Notes**
- `flagged_visitors` uses `photoFileKey` (drizzle) — `run_migration.sql`'s `photoKey` is an outdated name.
- MySQL 8.0.13+ rejects literal `TEXT DEFAULT '[]'` — must be parenthesized `TEXT DEFAULT ('[]')`. Fixed in `full_sync.sql`, migration `0038`, and the `organizations.websiteResourceLinks` in-code bootstrap (`server/routers.ts`).
- **Existing databases** are not upgraded by `full_sync.sql` (CREATE TABLE IF NOT EXISTS skips existing tables) — use the drizzle migrations (`0000`–`0042`) or `ALTER TABLE … ADD COLUMN`/`DROP`+recreate for stale tables (e.g. `flagged_visitors`).

### 🐛 Schema Drift — Known Bugs & Prevention

**The bugs we hit (symptom → root cause):**

1. **`Unknown column 'flagLevel' in 'field list'`** (plus the same class of insert errors on `personnel_locations`, drills, EAP, BTAM) — **root cause**: the DB was built from **stale** `split_*.sql` / `full_sync*.sql` import files that predated the schema redesign. Those files were *legacy copies* of the schema, so every time `drizzle/schema.ts` changed without them being updated, live tables diverged from the code's source of truth.
2. **`BLOB, TEXT, GEOMETRY or JSON column can't have a default value`** — **root cause**: MySQL 8.0.13+ only allows BLOB/TEXT/JSON defaults written as *expressions* (`DEFAULT ('[]')`), not literals (`DEFAULT '[]'`). The literal form was in migration `0038` and the in-code bootstrap (`server/routers.ts`), so that column could never be added.
3. **`photoKey` vs `photoFileKey`** — `run_migration.sql` used the outdated name `photoKey`; the current schema and code use `photoFileKey`.
4. **Stale documentation** — the reference file itself listed tables that don't exist (`terms_acceptance`, `training_progress`, `notification_preferences`, `micro_drill_responses`) and old names (`audit_attachments`, `btam_assessments`, `liability_scan_tier_scores`). Docs drift exactly like SQL files do.
5. **Orphan legacy tables** (`btam_assessments`, `in_app_notifications`, `notification_recipients`) left behind in the live DB by earlier schema renames.
6. **Audit results inverted — "deficiency shows as secure"** — **root cause**: the client's `persistResponse`/answer handlers send legacy `response` enum values that the DB ENUM rejects — `"No — Not in place"` for positive-polarity "No" (the most common deficiency answer), plus raw `"Yes"`/`"No"` aliases from the condition-type and addToEap handlers. Under MySQL strict mode the INSERT fails atomically, so the whole row (including valid `primaryResponse`/`concernLevel`) never saves; the deficiency silently vanishes and the recomputed score leans "secure". Even when a row survived, `RESPONSE_SCORES` lacked `"No — Not in place"` so the legacy fallback scored it `null` (excluded). **Fix**: appended `"No — Not in place"`, `"Yes — Secure"`, `"No -- Not Present"`, `"Yes -- Present"`, `"Yes"`, `"No"` to the `audit_responses.response` enum (`drizzle/schema.ts` + new `drizzle/0045_audit_response_enum.sql` + `full_sync.sql`, append-only to preserve enum indices), added `"No — Not in place": 2` / `"Yes — Secure": 0` to `RESPONSE_SCORES`, and added the 5 categories missing from `CATEGORY_WEIGHTS` (Lighting & Visibility 0.10, Parking Areas 0.05, Escape & Evacuation 0.05, Incident Response Procedures 0.05, Vulnerable Populations 0.05) which were weight-0 and excluded from the overall score. `CATEGORY_WEIGHTS` now mirrors the `weight` field on every `AUDIT_CATEGORIES` entry (14 scored categories, sum 1.30).

**Prevention rules (follow on every future change):**

1. **`drizzle/schema.ts` is the single source of truth.** Never hand-edit `.sql` schema files to "fix" drift — change `schema.ts` and regenerate.
2. After **any** change to `schema.ts`, regenerate the authoritative dump: `npx tsx scripts/dump-full-sync.ts --write`.
3. Verify the dump: `node scripts/verify-full-sync.mjs` (imports into a scratch DB, then drops it).
4. Before/after every deploy, diff the live DB: `node scripts/diff-live-schema.mjs --write-fixes` → review `drizzle/live_schema_fixes.sql` → `mysql < drizzle/live_schema_fixes.sql`. ADD COLUMN fixes are safe; MODIFY fixes may need data cleanup first.
5. **Evolving an existing DB**: use drizzle migrations (`0000`–`0042`) / `ALTER TABLE`. `full_sync.sql` only creates *missing* tables — it will NOT add columns to existing tables.
6. **Fresh DBs only**: use `full_sync.sql`. Never use `split_*.sql` (deprecated, stale).
7. **MySQL 8.0.13+ LOB defaults**: parenthesize — `TEXT DEFAULT ('[]')`.
8. **Renames**: keep helper files like `run_migration.sql` in sync or delete them — never leave two names for one column.
9. **Orphan tables**: only drop after confirming nothing references them (`grep -rn "btam_assessments\|in_app_notifications\|notification_recipients" server/ client/ shared/`).
10. **Keep this file honest**: when a table is added/removed in `schema.ts`, update the table map in section 6 the same day.

---

## 7. Shared Logic Map

Every file in `shared/` is used by both client and server:

| File                         | Provides                                                                    |
|------------------------------|-----------------------------------------------------------------------------|
| `types.ts`                   | Re-exports drizzle schema types + errors                                    |
| `const.ts`                   | COOKIE_NAME, error messages (UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG)           |
| `permissions.ts`             | Role types (PlatformRole, OrgRole), permission flag types, guard functions   |
| `assessmentEngine.ts`        | Calculates audit scores from responses                                      |
| `auditFramework.ts`          | AUDIT_CATEGORIES (17 cats), CATEGORY_WEIGHTS, calculateCategoryScore, calculateOverallScore, getCorrectiveActionRecommendation, PRIORITY_ORDER |
| `actionEngine.ts`            | Generates corrective action recommendations based on findings                |
| `basisLibrary.ts`            | Standards citation library (OSHA, NFPA, CISA, etc.)                         |
| `drillEngine.ts`             | Drill session logic (scoring, timing, phases)                                |
| `eapFramework.ts`            | EAP section definitions and structure                                        |
| `gapMap.ts`                  | Maps audit gaps to recommended improvements                                  |
| `industryOverlayContent.ts`  | Industry-specific content overlays (healthcare, retail, etc.)                |
| `jurisdictionContent.ts`     | Jurisdiction-specific regulatory content                                     |
| `liabilityScanScoring.ts`    | Liability scan scoring algorithm                                             |
| `microDrillsData.ts`         | Built-in micro-drill definitions                                             |
| `extendedDrillsData.ts`      | Extended drill definitions (+17 categories)                                  |
| `oshaContent.ts`             | OSHA 29 CFR reference content                                                |
| `stateContent.ts`            | State-specific regulatory content                                            |
| `stateProvinces.ts`          | US states + Canadian provinces lists                                         |
| `threatKeywords.ts`          | Keyword patterns for threat flag engine                                      |

---

## 8. Key Architectural Patterns

### Authentication Flow
1. Login via `user.login` tRPC mutation → validates email/password
2. Sets httpOnly cookie (`session`) with JWT token
3. Every tRPC request reads cookie via `server/_core/context.ts`
4. `server/_core/trpc.ts` middleware decodes JWT and attaches `ctx.user`
5. Role-based guards: `protectedProcedure`, `auditorProcedure`, `adminProcedure`, `ultraAdminProcedure`, `superAdminProcedure`, `orgAdminProcedure`, `paidProcedure`
6. Logout clears the cookie

### File Uploads
- S3-compatible storage via `server/storage.ts`
- Upload flow: client sends base64 → server validates → calls `storagePut()` → returns URL
- Used for: audit photos, facility attachments, flagged visitor photos, training module files
- Upload handlers in `attachmentUpload.ts`, `flaggedVisitorUpload.ts`, `trainingModuleUpload.ts`

### AI/LLM Integration
- OpenAI-compatible endpoint configured via env vars (`OPENAI_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`)
- Helper: `server/_core/llm.ts` (generic `invokeLLM` function)
- Direct fetch also used in `reportRouter.generateEAP` (for batch section generation)
- Used in: EAP generation, liability scan AI, AI recommendations, AI chat box

### Push Notifications
- VAPID keys for Web Push API (`server/push.ts`)
- Service worker registered client-side
- Desktop alert app (`ras-desktop-alert/`) for RAS emergency alerts (C# .NET WinForms)
- Notification storage: `server/notificationDb.ts` + `server/notificationRouter.ts`

### Payment / Billing
- Stripe integration in `billingRouter` (createStripeSession, manageBilling, webhook)
- Org `plan` field: `free` vs `paid`
- `paidProcedure` middleware blocks unpaid orgs from using premium features

### API Keys
- `server/apiKeyRouter.ts` — create, list, revoke
- Keys are hashed with SHA-256 before storage
- Used for programmatic access to liability scans and other data

### Error Handling
- tRPC errors with `TRPCError` (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, INTERNAL_SERVER_ERROR)
- `ErrorBoundary.tsx` component wraps the whole app
- Shared error messages in `shared/const.ts`

---

## 9. Quick Reference for Common Tasks

### To add a new page:
1. Create page component in `client/src/pages/<PageName>.tsx`
2. Register route in `client/src/App.tsx` Router function

### To add a new tRPC endpoint:
1. Add DB query function in `server/db.ts` (or relevant db file)
2. Add procedure in `server/routers.ts` under the appropriate sub-router
3. If using in client, the `client/src/lib/trpc.ts` auto-exposes it via the `api` object

### To add a new database table:
1. Add table definition in `drizzle/schema.ts`
2. Run `npm run db:push` to sync schema to database
3. Add query functions in `server/db.ts`
4. Generate migration: `npx drizzle-kit generate`

### To modify an existing page:
1. Find the route in `client/src/App.tsx` to locate the page component
2. Edit the page component in `client/src/pages/`

### To modify backend logic for a feature:
1. Look up the tRPC sub-router name in §5 above
2. Find the procedure in `server/routers.ts`
3. Find the corresponding DB function in `server/db.ts`
4. Shared business logic may be in `shared/` files

---

## 10. Multi-Tenant / Cross-Organization Data Isolation

This platform is multi-tenant. Data belonging to one organization MUST NOT be accessible by users from a different organization. The following rules and patterns enforce org isolation:

### Org-Scoped Data Model

Key tables with `orgId` for scoping:
| Table                        | orgId Column | Scope Rule                                          |
|------------------------------|-------------|-----------------------------------------------------|
| `organizations`              | id (PK)     | Root tenant entity                                  |
| `org_members`                | orgId       | Links users to orgs — the gatekeeper for all org access |
| `facilities`                 | orgId       | Facilities belong to one org                        |
| `incident_reports`           | orgId       | Incident reports scoped to org                      |
| `liability_scans`            | orgId       | Liability scans scoped to org (also userId)         |
| `audit_logs`                 | orgId       | Audit logs scoped to org                            |
| `staff_checkins`             | orgId       | Staff check-ins scoped to org                       |
| `training_modules`           | orgId       | Training modules scoped to org                      |
| `btam_cases`                 | orgId       | BTAM cases scoped to org                            |
| `alert_events`               | orgId       | Emergency alerts scoped to org                      |
| `micro_drill_assignments`    | orgId       | Drill assignments scoped to org                     |

### How Org Isolation is Enforced

**Centralized object-level authorization — `server/_core/authz.ts` (security audit F-02…F-06).**

Every tRPC procedure that accepts a caller-supplied `facilityId` / `auditId` / `photoId` / `incidentId` / `keyId` calls the matching `require*Access` helper as its first step:

| Helper | Resolves through | Throws on failure |
|--------|------------------|-------------------|
| `requireFacilityAccess(user, facilityId)` | facility → org | `NOT_FOUND`, `FORBIDDEN` |
| `requireAuditAccess(user, auditId)` | audit → (facility →) org | `NOT_FOUND`, `FORBIDDEN` |
| `requirePhotoAccess(user, photoId)` | photo → audit → org | `NOT_FOUND`, `FORBIDDEN` |
| `requireIncidentAccess(user, incidentId)` | incident → org | `NOT_FOUND`, `FORBIDDEN` |
| `requireOrgAccess(user, orgIds)` | `org_members` membership set | `UNAUTHORIZED`, `FORBIDDEN` |

Rules enforced by the helpers:

1. **Membership is the gatekeeper** — the user's org set comes from `org_members` via `getOrgMembershipForUser(userId)`; a target record is accessible only if its org is in that set.
2. **Platform admins** (`ultra_admin`, `admin`) bypass org checks (platform staff only).
3. **Legacy rows with `orgId IS NULL`** are accessible only to the owning auditor (for audits) or a platform admin — no membership shortcut.
4. **At Save Time** — `orgId` is resolved server-side from the caller's memberships and stored; a client-supplied `orgId` is never trusted (see `apiKeys.create`).
5. **At Read/Update Time** — the `require*Access` helper runs before any DB read/write of the object.

Procedures now guarded: `facilityRouter` (get/update/duplicate/delete), `auditRouter` (all), `threatRouter` (list/create/deleteAll), `reportRouter` (generate/generateMarkdown/getEAP/generateEAP), `photoRouter` (list/upload/delete), `feedbackRouter` (submitFeedback/getFeedbackForAudit/flagQuestion/getFlags), `incidentRouter` (updateStatus/adminLookup/findSimilar/findByPerson/markRepeat + org-scoped searches), `incidentCommunicationRouter` (sendAdminMessage/getMessages), `apiKeys` (create/revoke).

Cross-tenant regression tests: `server/_core/authz.test.ts` (vitest) — acceptance: a foreign `auditId`/`facilityId`/`photoId`/`incidentId` → `FORBIDDEN`.

> Legacy pattern (still valid for reference, superseded by the helpers above): `getOrgMemberRecord(orgId, userId)` + manual role checks in each procedure.

### Liability Scan Isolation (Reference Implementation)

In `server/routers.ts` (`liabilityScanRouter`):

- **`save`** — Resolves `orgId` from user's memberships and stores it on the scan
- **`get`** — Owner can always view; admins must share same org (verified via `getOrgMemberRecord`)
- **`updateTierScores`** — Same pattern as `get`: owner can always update; admins must share org
- **`list`** — Only returns scans where `userId === current user`
- **`delete`** — Only the owner can delete (`userId` check, no admin override)
- **`createShareToken`** — Owner can create; admins must share org (same pattern as get)

### Admin Cross-Org Access Pattern

When a procedure allows `["admin", "ultra_admin"]` to bypass normal ownership checks, it MUST additionally verify org membership:

```ts
// Allowed: owner, or admin who shares the same org
if (scan.userId === ctx.user.id) return scan;
if (!["admin","ultra_admin"].includes(ctx.user.role)) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
if (scan.orgId) {
  const membership = await getOrgMemberRecord(scan.orgId, ctx.user.id);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
} else if (ctx.user.role !== "ultra_admin") {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

**Rule**: `ultra_admin` can access any record regardless of org. All other admins are restricted to records within their own org(s).

### AI/LLM Data Isolation

- `server/liabilityScanAi.ts` — The `generateLiabilityScanResult()` function receives ONLY the current user's answers + jurisdiction + industry. It does NOT query other users' scans. RAG documents are shared reference materials (compliance roadmaps, jurisdiction docs), not user data. This is safe.
- `reportRouter.generateEAP` — Uses ONLY the current audit's responses and facility data in the LLM prompt. No cross-user data leakage.
- `drillRouter.generate` — Uses ONLY the facility context provided in the input. No cross-org data.

### Key Env Variables (see .env.example)

- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET` — Token signing secret
- `OPENAI_API_KEY` — LLM provider key
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` — File storage

---

## 11. Session Log

### 2026-08-20 — P0 Object-Level Authorization (security audit F-02…F-06)

- Added `server/_core/authz.ts` with centralized `requireOrgAccess` / `requireFacilityAccess` / `requireAuditAccess` / `requirePhotoAccess` / `requireIncidentAccess` helpers (membership-based, platform-admin bypass, legacy-row auditor fallback).
- Guarded every tRPC procedure taking a caller-supplied `facilityId`/`auditId`/`photoId`/`incidentId`/`keyId` in `server/routers.ts`: facilityRouter (get/update/duplicate/delete), auditRouter (all 14 procedures), threatRouter, reportRouter (generate/generateMarkdown/getEAP/generateEAP), photoRouter (list/upload/delete), feedbackRouter, incidentRouter (updateStatus/adminLookup/findSimilar/findByPerson/markRepeat), apiKeys (create/revoke).
- F-04: `incident.findSimilar` and `incident.findByPerson` are now org-scoped (db helpers gained an optional `orgId` filter); non-admins must belong to an org to search.
- F-05: `incidentCommunication.sendAdminMessage` no longer trusts a client-supplied `senderName` — sender identity is derived server-side; both admin message procedures require incident access.
- F-06: `apiKeys.create` resolves org from the caller's membership (client `orgId` removed from schema); `apiKeys.revoke` verifies the key belongs to the caller, their org, or a platform admin (`getApiKeyById` added to `server/db.ts`).
- Added `getPhotoById` / `getApiKeyById` to `server/db.ts`.
- Added cross-tenant regression tests `server/_core/authz.test.ts` (19 cases) — all pass (`npx vitest run`). tsc baseline unchanged at 19 pre-existing errors, 0 new.
