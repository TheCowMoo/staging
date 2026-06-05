import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Facilities from "./pages/Facilities";
import FacilityDetail from "./pages/FacilityDetail";
import NewFacility from "./pages/NewFacility";
import AuditWalkthrough from "./pages/AuditWalkthrough";
import AuditReport from "./pages/AuditReport";
import AuditHistory from "./pages/AuditHistory";
import TesterFeedback from "./pages/TesterFeedback";
import FeedbackDashboard from "./pages/FeedbackDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import WalkthroughMode from "./pages/WalkthroughMode";
import ReportIncident from "./pages/ReportIncident";
import CheckReport from "./pages/CheckReport";
import IncidentDashboard from "./pages/IncidentDashboard";
import Glossary from "./pages/Glossary";
import OrgAdmin from "./pages/OrgAdmin";
import AdminOrgs from "./pages/AdminOrgs";
import JoinOrg from "./pages/JoinOrg";
import OrgIncidentReport from "./pages/OrgIncidentReport";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import TermsAndConditions from "./pages/TermsAndConditions";
import VisitorManagement from "./pages/VisitorManagement";
import EmergencyActionPlan from "./pages/EmergencyActionPlan";
import PersonnelTracking from "./pages/PersonnelTracking";
import OshaReference from "./pages/OshaReference";
import Standards from "./pages/Standards";
import LiabilityScan from "./pages/LiabilityScan";
import ScanHistory from "./pages/ScanHistory";
import DefensibilityPlan from "./pages/DefensibilityPlan";
import HowWeHelp from "./pages/HowWeHelp";
import SharedResults from "./pages/SharedResults";
import EAPList from "@/pages/EAPList";
import UserManagement from "@/pages/UserManagement";
import FlaggedVisitors from "@/pages/FlaggedVisitors";
import FacilityOnboarding from "@/pages/FacilityOnboarding";
import DrillScheduler from "@/pages/DrillScheduler";
import DrillRunner from "@/pages/DrillRunner";
import DrillAfterAction from "@/pages/DrillAfterAction";
import DrillAfterActionIndex from "@/pages/DrillAfterActionIndex";
import EmergencyAlerts from "@/pages/EmergencyAlerts";
import StaffCheckin from "@/pages/StaffCheckin";
import TrainingModules from "@/pages/TrainingModules";
import TrainingPlayer from "@/pages/TrainingPlayer";
import BtamDashboard from "@/pages/BtamDashboard";
import BtamIntake from "@/pages/BtamIntake";
import BtamCaseDetail from "@/pages/BtamCaseDetail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import SetPassword from "@/pages/SetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import Settings from "@/pages/Settings";
import ApiKeys from "@/pages/ApiKeys";
import RASActivation from "@/pages/RASActivation";
import MassNotification from "@/pages/MassNotification";
import MicroDrillAdmin from "@/pages/MicroDrillAdmin";
import MicroDrillRunner from "@/pages/MicroDrillRunner";
import MicroDrillTracking from "@/pages/MicroDrillTracking";
import FacilityMapBuilder from "@/pages/FacilityMapBuilder";
import ExtendedDrillRunner from "@/pages/ExtendedDrillRunner";
import NotificationsPage from "@/pages/NotificationsPage";
import ResourceLinks from "@/pages/ResourceLinks";

function Router() {
  return (
    <div className="page-enter">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/facilities" component={Facilities} />
        <Route path="/facilities/new" component={FacilityOnboarding} />
        <Route path="/facilities/:id" component={FacilityDetail} />
        <Route path="/audits" component={AuditHistory} />
        <Route path="/audit/:id" component={AuditWalkthrough} />
        <Route path="/audit/:id/walkthrough" component={WalkthroughMode} />
        <Route path="/audit/:id/report" component={AuditReport} />
        <Route path="/audit/:id/feedback" component={TesterFeedback} />
        <Route path="/feedback" component={FeedbackDashboard} />
        <Route path="/analytics" component={AnalyticsDashboard} />
        <Route path="/report-incident" component={ReportIncident} />
        <Route path="/check-report" component={CheckReport} />
        <Route path="/incidents" component={IncidentDashboard} />
        <Route path="/glossary" component={Glossary} />
        <Route path="/organizations" component={AdminOrgs} />
        <Route path="/org/:id">{(params) => <OrgAdmin orgId={Number(params.id)} />}</Route>
        <Route path="/join" component={JoinOrg} />
        <Route path="/report/:slug">{(params) => <OrgIncidentReport slug={params.slug} />}</Route>
        <Route path="/visitors" component={VisitorManagement} />
        <Route path="/eap" component={EAPList} />
        <Route path="/audit/:id/eap" component={EmergencyActionPlan} />
        <Route path="/admin/users" component={UserManagement} />
        <Route path="/admin/api-keys" component={ApiKeys} />
        <Route path="/user-management">{() => { window.location.replace("/admin/users"); return null; }}</Route>
        <Route path="/admin/flagged-visitors" component={FlaggedVisitors} />
        <Route path="/facilities/onboarding" component={FacilityOnboarding} />
        <Route path="/facilities/onboarding-legacy" component={NewFacility} />
        <Route path="/legal/privacy" component={PrivacyPolicy} />
        <Route path="/osha" component={OshaReference} />
        <Route path="/standards" component={Standards} />
        <Route path="/liability-scan" component={LiabilityScan} />
        <Route path="/scan-history" component={ScanHistory} />
        <Route path="/defensibility-plan" component={DefensibilityPlan} />
        <Route path="/how-we-help" component={HowWeHelp} />
        <Route path="/shared/:token" component={SharedResults} />
        <Route path="/drills" component={DrillScheduler} />
        <Route path="/drills/after-action" component={DrillAfterActionIndex} />
        <Route path="/drills/:id/run" component={DrillRunner} />
        <Route path="/drills/:id/debrief" component={DrillAfterAction} />
        <Route path="/ras" component={EmergencyAlerts} />
        <Route path="/ras/activate" component={RASActivation} />
        <Route path="/staff-checkin" component={StaffCheckin} />
        <Route path="/training-modules" component={TrainingModules} />
        <Route path="/training/:id" component={TrainingPlayer} />
        <Route path="/personnel-tracking" component={PersonnelTracking} />
        <Route path="/btam" component={BtamDashboard} />
        <Route path="/btam/new" component={BtamIntake} />
        <Route path="/btam/:id">{(params) => <BtamCaseDetail />}</Route>
        <Route path="/legal/terms" component={TermsOfService} />
        <Route path="/terms-and-conditions" component={TermsAndConditions} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/set-password" component={SetPassword} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/mass-notification" component={MassNotification} />
        <Route path="/micro-drills" component={MicroDrillAdmin} />
        <Route path="/micro-drills/run/:assignmentId" component={MicroDrillRunner} />
        <Route path="/facility-mapping" component={FacilityMapBuilder} />
        <Route path="/extended-drills" component={ExtendedDrillRunner} />
        <Route path="/extended-drills/:drillId" component={ExtendedDrillRunner} />
        <Route path="/micro-drills/tracking" component={MicroDrillTracking} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/admin/resource-links" component={ResourceLinks} />
        <Route path="/settings" component={Settings} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      {/* switchable=true enables dark/light toggle stored in localStorage */}
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          {/* Skip navigation link for keyboard users */}
          <a href="#main-content" className="skip-nav">Skip to main content</a>
          <Toaster position="top-right" />
          <div id="main-content">
            <Router />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;