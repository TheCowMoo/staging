import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Shield, ClipboardCheck, BarChart3, FileText,
  Lock, AlertTriangle, CheckCircle2, ArrowRight,
  Building2, Users, BookOpen
} from "lucide-react";

const FEATURES = [
  {
    icon: <Building2 size={22} className="text-[#3A5F7D]" />,
    title: "Site Audit",
    desc: "Structured on-site facility assessments covering 17 categories and up to 180 questions. Every finding is documented, scored, and tied to a defensible corrective action plan.",
  },
  {
    icon: <Shield size={22} className="text-[#3A5F7D]" />,
    title: "Emergency Action Plan",
    desc: "NFPA 3000-aligned EAP generation covering evacuation, lockdown, shelter-in-place, and recovery. Built for real incidents, not compliance checkboxes.",
  },
  {
    icon: <Users size={22} className="text-[#3A5F7D]" />,
    title: "Visitor Management",
    desc: "Log all facility visitors with photo ID verification, time in/out tracking, and a flagged-name watchlist. Know who is in your building at all times.",
  },
  {
    icon: <AlertTriangle size={22} className="text-[#3A5F7D]" />,
    title: "Incident Reporting",
    desc: "Anonymous incident submission with tracking tokens, admin review workflow, and OSHA 300 log fields. Reports are traceable from submission to resolution.",
  },
  {
    icon: <ClipboardCheck size={22} className="text-[#3A5F7D]" />,
    title: "Training & Drills",
    desc: "Schedule and document workplace violence prevention training, active threat drills, and after-action reviews. Demonstrate a documented training program under scrutiny.",
  },
  {
    icon: <BarChart3 size={22} className="text-[#3A5F7D]" />,
    title: "Communication",
    desc: "Mass notification, emergency alerts, and staff messaging tools to coordinate response across your organization during a critical incident.",
  },
];

const STANDARDS = [
  { label: "OSHA Workplace Violence Prevention", color: "bg-[#E6EAEE] text-[#0B1F33] border-[#D0D5DD]" },
  { label: "CISA Risk Assessment Principles", color: "bg-[#E6EAEE] text-[#0B1F33] border-[#D0D5DD]" },
  { label: "NFPA 3000 Hostile Event Preparedness", color: "bg-[#E6EAEE] text-[#0B1F33] border-[#D0D5DD]" },
  { label: "CPTED Environmental Design", color: "bg-[#E6EAEE] text-[#0B1F33] border-[#D0D5DD]" },
  { label: "Canada Labour Code Part II", color: "bg-[#E6EAEE] text-[#0B1F33] border-[#D0D5DD]" },
  { label: "CSA Z1002 Workplace Violence Prevention", color: "bg-[#E6EAEE] text-[#0B1F33] border-[#D0D5DD]" },
  { label: "Ontario OHSA Bill 168", color: "bg-[#E6EAEE] text-[#0B1F33] border-[#D0D5DD]" },
  { label: "BC WorkSafeBC Violence Prevention", color: "bg-[#E6EAEE] text-[#0B1F33] border-[#D0D5DD]" },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      {/* Header */}
      <header className="border-b border-[#D0D5DD] bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src="https://pursuitpathways.com/content/logo%20five%20stones.png" alt="Five Stones Technology" className="h-20 w-auto max-w-[280px] object-contain" />
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              isAuthenticated ? (
                <Button asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">Go to Dashboard <ArrowRight size={15} /></Link>
                </Button>
              ) : (
                <Button asChild>
                  <a href={getLoginUrl()}>Sign In</a>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0B1F33] mb-5 leading-tight">
            Professional Workplace Violence<br />
            <span className="text-[#3A5F7D]">Threat Assessment Platform</span>
          </h1>
          <p className="text-lg text-[#5A6570] mb-8 max-w-2xl mx-auto leading-relaxed">
            Conduct structured on-site facility safety audits, generate professional threat assessment reports,
            and build Emergency Action Plans — all aligned with recognized safety frameworks.
          </p>
          <p className="text-sm text-[#5A6570]/70 mb-8 -mt-4 italic">
            Trusted by safety professionals across the U.S. and Canada
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <Button asChild size="lg">
                <Link href="/dashboard" className="flex items-center gap-2">Go to Dashboard <ArrowRight size={16} /></Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <a href={getLoginUrl()} className="flex items-center gap-2">Start Your Assessment <ArrowRight size={16} /></a>
              </Button>
            )}
          <Button variant="outline" size="lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
            View Features
          </Button>
          </div>
        </div>
      </section>

      {/* Standards alignment */}
      <section className="py-8 border-y border-[#D0D5DD] bg-[#E6EAEE]/30">
        <div className="container">
          <p className="text-center text-xs font-semibold text-[#5A6570] uppercase tracking-wider mb-4">U.S. & Canadian Standards Alignment</p>
          <div className="flex flex-wrap justify-center gap-2">
            {STANDARDS.map((s) => (
              <span key={s.label} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${s.color}`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0B1F33] mb-3">Platform Features</h2>
            <p className="text-[#5A6570] max-w-xl mx-auto">
              Six integrated modules covering every dimension of workplace violence prevention — for U.S. and Canadian organizations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-[#D0D5DD] rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-[#E6EAEE] flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[#0B1F33] mb-2">{f.title}</h3>
                <p className="text-sm text-[#5A6570] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[#E6EAEE]/30 border-y border-[#D0D5DD]">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0B1F33] mb-3">How It Works</h2>
            <p className="text-[#5A6570]">A structured four-step process from setup to report delivery.</p>
          </div>
          <div className="space-y-4">
            {[
              { step: "1", title: "Create a Facility Profile", desc: "Enter basic facility details including type, size, and operating characteristics. The system filters questions to match your specific facility." },
              { step: "2", title: "Conduct the Guided Walkthrough", desc: "Work through 17 assessment categories covering exterior security, access control, interior layout, emergency preparedness, and more." },
              { step: "3", title: "Review Risk Scores & Findings", desc: "Real-time risk scoring across all categories using CISA's Threat × Vulnerability × Consequence model with weighted overall ratings." },
              { step: "4", title: "Generate Professional Reports", desc: "Produce a complete Threat Assessment Report, prioritized Corrective Action Plan, and Emergency Action Plan framework with one click." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 bg-white border border-[#D0D5DD] rounded-xl p-5">
                <div className="w-9 h-9 rounded-full bg-[#0B1F33] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-[#0B1F33] mb-1">{item.title}</h3>
                  <p className="text-sm text-[#5A6570] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Condition types */}
      <section className="py-20">
        <div className="container max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#0B1F33] mb-3">Precise Finding Classification</h2>
          <p className="text-[#5A6570] mb-10">Every audit finding is classified by condition type for accurate, defensible reporting.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Observed Condition", color: "bg-[#E6EAEE] border-[#D0D5DD] text-[#0B1F33]", icon: <CheckCircle2 size={16} /> },
              { label: "Potential Risk", color: "bg-amber-50 border-amber-200 text-amber-800", icon: <AlertTriangle size={16} /> },
              { label: "Unknown Condition", color: "bg-slate-50 border-slate-200 text-slate-700", icon: <BookOpen size={16} /> },
              { label: "Recommended Action", color: "bg-green-50 border-green-200 text-green-800", icon: <ClipboardCheck size={16} /> },
            ].map((ct) => (
              <div key={ct.label} className={`border rounded-xl p-4 ${ct.color}`}>
                <div className="flex justify-center mb-2">{ct.icon}</div>
                <p className="text-xs font-semibold">{ct.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0B1F33] text-white">
        <div className="container text-center max-w-xl mx-auto">
          <Shield size={40} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-3">Ready to Assess Your Facility?</h2>
          <p className="opacity-80 mb-6 leading-relaxed">
            Start your first workplace violence threat assessment today. Professional-grade security analysis available to any organization.
          </p>
          {isAuthenticated ? (
            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard" className="flex items-center gap-2">Go to Dashboard <ArrowRight size={16} /></Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="lg">
              <a href={getLoginUrl()} className="flex items-center gap-2">Get Started Free <ArrowRight size={16} /></a>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#D0D5DD] bg-white">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="https://pursuitpathways.com/content/logo%20five%20stones.png" alt="Five Stones Technology" className="h-16 w-auto max-w-[250px] object-contain" />
          </div>
          <p className="text-xs text-[#5A6570] text-center">
            Aligned with OSHA Workplace Violence Prevention · CISA Risk Principles · NFPA 3000
          </p>
          <p className="text-xs text-[#5A6570]">Workplace Safety Assessment Platform</p>
        </div>
      </footer>
    </div>
  );
}
