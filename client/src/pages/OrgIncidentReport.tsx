import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const INCIDENT_TYPES = [
  { value: "threatening_behavior", label: "Threatening Behaviour" },
  { value: "suspicious_person",    label: "Suspicious Person" },
  { value: "observed_safety_gap",  label: "Observed Safety Gap" },
  { value: "workplace_violence",   label: "Workplace Violence" },
  { value: "other",                label: "Other" },
];

const SEVERITY_LEVELS = [
  { value: "low",      label: "Low",      color: "bg-green-100 text-green-800" },
  { value: "moderate", label: "Moderate", color: "bg-yellow-100 text-yellow-800" },
  { value: "high",     label: "High",     color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800" },
];

interface FormState {
  incidentType: string;
  severity: string;
  incidentDate: string;
  location: string;
  description: string;
  involvedParties: string;
  witnesses: string;
  priorIncidents: boolean;
  reportedToAuthorities: boolean;
  reporterRole: string;
  contactEmail: string;
  privacyConsent: boolean;
}

const DEFAULT_FORM: FormState = {
  incidentType: "",
  severity: "",
  incidentDate: "",
  location: "",
  description: "",
  involvedParties: "",
  witnesses: "",
  priorIncidents: false,
  reportedToAuthorities: false,
  reporterRole: "",
  contactEmail: "",
  privacyConsent: false,
};

export default function OrgIncidentReport({ slug }: { slug: string }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [trackingToken, setTrackingToken] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const { data: org, isLoading: orgLoading, error: orgError } = trpc.org.getBySlug.useQuery({ slug });

  const submitMutation = trpc.incident.submit.useMutation({
    onSuccess: (data) => {
      setTrackingToken(data.trackingToken);
      setSubmitted(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.incidentType || !form.severity || form.description.length < 10) {
      toast.error("Please fill in all required fields and provide a description of at least 10 characters.");
      return;
    }
    if (!form.privacyConsent) {
      toast.error("Please acknowledge the privacy notice to submit your report.");
      return;
    }
    submitMutation.mutate({
      orgId: org?.id,
      incidentType: form.incidentType as any,
      severity: form.severity as any,
      incidentDate: form.incidentDate || undefined,
      location: form.location || undefined,
      description: form.description,
      involvedParties: form.involvedParties || undefined,
      witnesses: form.witnesses || undefined,
      priorIncidents: form.priorIncidents,
      reportedToAuthorities: form.reportedToAuthorities,
      reporterRole: form.reporterRole || undefined,
      contactEmail: form.contactEmail || undefined,
    });
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
            <CardTitle>Portal Not Found</CardTitle>
            <CardDescription>
              This incident reporting portal does not exist or has been deactivated.
              Please contact your organization administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <CardTitle className="text-xl">Report Submitted</CardTitle>
            <CardDescription>
              Your report has been submitted anonymously and will be reviewed by {org.name}'s safety administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Your tracking reference</p>
              <p className="font-mono font-bold text-lg tracking-wider">{trackingToken}</p>
              <p className="text-xs text-muted-foreground mt-1">Save this to check the status of your report later</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-800">
                <strong>Your anonymity is protected.</strong> No identifying information has been recorded
                unless you chose to provide a contact email. Your IP address is not stored.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = `/check-report?token=${trackingToken}`}
            >
              Check Report Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          {org.logoUrl && (
            <img src={org.logoUrl} alt={org.name} className="h-12 object-contain mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
          <p className="text-slate-600 mt-1">Anonymous Incident Report Portal</p>
        </div>

        {/* Anonymity notice */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Your identity is protected</p>
            <p className="text-xs text-blue-700 mt-0.5">
              This form is completely anonymous. No login is required, and your IP address is not recorded.
              Reports are only visible to designated safety administrators at {org.name}.
              Providing a contact email is entirely optional and only used if you choose to receive a follow-up.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Incident Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Incident Type */}
              <div className="space-y-2">
                <Label htmlFor="incident-type">
                  Incident Type <span className="text-destructive">*</span>
                </Label>
                <Select value={form.incidentType} onValueChange={(v) => setForm({ ...form, incidentType: v })}>
                  <SelectTrigger id="incident-type">
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <Label>Severity Level <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SEVERITY_LEVELS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm({ ...form, severity: s.value })}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                        form.severity === s.value
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent bg-muted hover:border-muted-foreground/30"
                      } ${s.color}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date and Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="incident-date">Date of Incident</Label>
                  <Input
                    id="incident-date"
                    type="date"
                    value={form.incidentDate}
                    onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location / Area</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Main entrance, 2nd floor, Parking lot"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                  <span className="text-muted-foreground text-xs ml-2">(minimum 10 characters)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe what happened in as much detail as you are comfortable sharing…"
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={form.description.length > 0 && form.description.length < 10 ? "border-destructive" : ""}
                />
                <p className={`text-xs ${form.description.length < 10 && form.description.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {form.description.length} characters {form.description.length < 10 && form.description.length > 0 ? `— ${10 - form.description.length} more needed` : ""}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Details <span className="text-muted-foreground text-sm font-normal">(all optional)</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="involved">Parties Involved</Label>
                <Textarea
                  id="involved"
                  placeholder="Describe any parties involved — you do not need to use names"
                  rows={2}
                  value={form.involvedParties}
                  onChange={(e) => setForm({ ...form, involvedParties: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="witnesses">Witnesses</Label>
                <Textarea
                  id="witnesses"
                  placeholder="Were there any witnesses? Describe without using names if preferred"
                  rows={2}
                  value={form.witnesses}
                  onChange={(e) => setForm({ ...form, witnesses: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reporter-role">Your Role</Label>
                <Input
                  id="reporter-role"
                  placeholder="e.g. Employee, Visitor, Contractor, Student"
                  value={form.reporterRole}
                  onChange={(e) => setForm({ ...form, reporterRole: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="prior-incidents"
                    checked={form.priorIncidents}
                    onCheckedChange={(v) => setForm({ ...form, priorIncidents: !!v })}
                  />
                  <Label htmlFor="prior-incidents" className="font-normal cursor-pointer">
                    There have been similar incidents before
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reported-authorities"
                    checked={form.reportedToAuthorities}
                    onCheckedChange={(v) => setForm({ ...form, reportedToAuthorities: !!v })}
                  />
                  <Label htmlFor="reported-authorities" className="font-normal cursor-pointer">
                    This incident was reported to authorities (police, emergency services)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optional contact email */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Optional Follow-up Contact
                <Badge variant="outline" className="text-xs font-normal">Completely Optional</Badge>
              </CardTitle>
              <CardDescription>
                If you would like to receive a follow-up on your report, you may provide an email address.
                This is entirely optional and will not affect how your report is handled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email Address (optional)</Label>
                <div className="relative">
                  <Input
                    id="contact-email"
                    type={showEmail ? "text" : "email"}
                    placeholder="your@email.com"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowEmail(!showEmail)}
                    aria-label={showEmail ? "Hide email" : "Show email"}
                  >
                    {showEmail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy consent */}
          <div className="flex items-start gap-3 rounded-lg border p-4 bg-background">
            <Checkbox
              id="privacy-consent"
              checked={form.privacyConsent}
              onCheckedChange={(v) => setForm({ ...form, privacyConsent: !!v })}
              className="mt-0.5"
            />
            <Label htmlFor="privacy-consent" className="font-normal text-sm cursor-pointer leading-relaxed">
              I understand that this report will be reviewed by safety administrators at {org.name}.
              I acknowledge that any contact email I provided is voluntary and will only be used for
              follow-up on this specific report. No other personal data is collected or stored.
              By submitting, I agree to the{" "}
              <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Privacy Policy</a>.
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitMutation.isPending || !form.privacyConsent}
          >
            {submitMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</>
            ) : (
              <><Shield className="h-4 w-4 mr-2" />Submit Anonymous Report</>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground pb-4">
            This portal is operated by {org.name} using the SafeGuard platform.
            Reports are encrypted in transit and only accessible to authorised administrators.
          </p>
        </form>
      </div>
    </div>
  );
}
