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
| `organizations`            | Client agencies/companies. Has `plan` (free/paid) + `externalSubscriptionId` |
| `org_members`              | Links users → orgs with role + permission flags                       |
| `users`                    | User accounts (email, password hash, platform role)                    |
| `user_invites`             | Pending org invitation tokens                                          |
| `facilities`               | Physical locations being assessed (name, address, type, size, hours)   |
| `audits`                   | Assessment sessions (status, scores, EAP data, contacts)               |
| `audit_responses`          | Individual question responses per audit (score, notes, photos)         |
| `threat_findings`          | Threat severity assessments (QRA: likelihood, impact, preparedness)    |
| `audit_photos`             | Photo evidence linked to audit responses                               |
| `audit_attachments`        | Uploaded facility documents (with AI analysis)                         |
| `audit_tester_feedback`    | Beta tester feedback on audits                                         |
| `audit_question_flags`     | User-flagged questions for review                                      |
| `corrective_action_checks` | Tracking items marked as complete in action plan                       |
| `audit_logs`               | Immutable audit trail of user actions                                  |
| `incident_reports`         | Incident reports (anonymous token, OSHA fields, threat flags)          |
| `incident_communications`  | Real-time incident comms messages                                      |
| `visitor_logs`             | Visitor sign-in/out records                                            |
| `flagged_visitors`         | Watchlist entries with escalation status                               |
| `personnel_locations`      | Staff location tracking during incidents                                |
| `eap_sections`             | EAP document sections with versioning                                  |
| `drill_templates`          | Reusable drill templates                                               |
| `drill_sessions`           | Completed drill sessions                                                |
| `drill_participants`       | Staff who participated in a drill                                      |
| `staff_checkins`           | Staff accountability check-ins                                         |
| `btam_cases`               | Behavioral Threat Assessment Management cases                          |
| `btam_subjects`            | BTAM subjects (individuals of concern)                                  |
| `btam_assessments`         | WAVR-21 assessment results per case                                     |
| `btam_management_plans`    | Mitigation/management plan items                                        |
| `btam_case_notes`          | Case notes and observations                                             |
| `btam_status_history`      | Case status change history                                              |
| `btam_referral_intake`     | Referral intake forms                                                   |
| `liability_scans`          | AI-powered liability exposure scans                                     |
| `liability_scan_tier_scores`| Per-tier scoring for liability scans                                  |
| `scan_share_tokens`        | Public share tokens for scans                                           |
| `facility_floor_maps`      | Floor plan data (GeoJSON)                                               |
| `micro_drill_assignments`  | Micro-drill assignments to users                                        |
| `micro_drill_responses`    | User responses to micro-drills                                          |
| `training_modules`         | Uploaded training content                                                |
| `training_progress`        | User training completion tracking                                       |
| `notifications`            | In-app notification records                                             |
| `notification_preferences` | User notification preferences                                           |
| `api_keys`                 | Hashed API keys for programmatic access                                  |
| `terms_acceptance`         | Record of terms/conditions acceptance by user                           |

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

The key helper is `getOrgMemberRecord(orgId, userId)` from `server/db.ts`. It checks if a user is a member of an organization. Combined with `getOrgMembershipForUser(userId)`, this is used to:

1. **At Save Time**: Resolve the user's org (via `getOrgMembershipForUser`) and store `orgId` on the record
2. **At Read/Update Time**: Verify the admin caller shares org membership with the record owner

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
