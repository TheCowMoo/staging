import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Link } from "wouter";

type TermsAndConditionsModalProps = {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
  isLoading?: boolean;
};

export function TermsAndConditionsModal({ open, onAccept, onClose, isLoading = false }: TermsAndConditionsModalProps) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = () => {
    if (agreed) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isLoading) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-border bg-slate-950 text-white">
          <DialogTitle>Terms and Conditions — Pursuit Pathways Inc.</DialogTitle>
          <DialogDescription className="text-sm text-slate-300 mt-1">
            Effective Date: May 18, 2026
          </DialogDescription>
        </div>

        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1 prose prose-slate prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-primary prose-strong:text-slate-900">
          <section>
            <p>
              These Terms and Conditions ("Terms") govern access to and use of the Five Stones Platform, websites, services, training content, and related offerings provided by Pursuit Pathways Inc. ("Pursuit Pathways," "Company," "we," "our," or "us").
            </p>
            <p>
              By accessing or using the Platform, website, or services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Platform or services.
            </p>
          </section>

          <section>
            <h2>1. COMPANY INFORMATION</h2>
            <p>
              Pursuit Pathways Inc. is a Delaware corporation with its principal business address at:
            </p>
            <p className="text-sm">
              Pursuit Pathways Inc.<br />
              8 The Green, STE A<br />
              Dover, Delaware 19901<br />
              Email: info@pursuitpathways.com<br />
              Website: www.pursuitpathways.com
            </p>
          </section>

          <section>
            <h2>2. SERVICES PROVIDED</h2>
            <p>Pursuit Pathways provides workplace safety and preparedness solutions, including but not limited to:</p>
            <ul>
              <li>Workplace violence prevention training</li>
              <li>Active threat and emergency response training</li>
              <li>eLearning and certification programs</li>
              <li>Onsite assessments and consulting</li>
              <li>Emergency Action Plan development</li>
              <li>Threat assessment tools</li>
              <li>The Five Stones cloud-based safety assessment and reporting platform</li>
              <li>Incident reporting systems</li>
              <li>Related software, documentation, and support services</li>
            </ul>
          </section>

          <section>
            <h2>3. ELIGIBILITY</h2>
            <p>
              The Platform and services are intended for use by organizations and individuals acting in a professional or business capacity.
            </p>
            <p>You represent and warrant that:</p>
            <ul>
              <li>You are at least eighteen (18) years old;</li>
              <li>You have authority to enter into these Terms on behalf of yourself or your organization;</li>
              <li>Your use of the Platform complies with all applicable laws and regulations.</li>
            </ul>
          </section>

          <section>
            <h2>4. ACCOUNT REGISTRATION</h2>
            <p>
              Access to portions of the Platform may require account registration. You agree to provide accurate and complete information, maintain the confidentiality of login credentials, restrict access to authorized users only, and notify us promptly of any unauthorized access or suspected security incident. You are responsible for all activity occurring under your account.
            </p>
          </section>

          <section>
            <h2>5. PLATFORM ACCESS & LICENSE</h2>
            <p>
              Subject to compliance with these Terms and any applicable agreement between your organization and Pursuit Pathways, we grant you a limited, non-exclusive, non-transferable, revocable right to access and use the Platform solely for your organization's internal business purposes. No ownership rights are transferred to you.
            </p>
          </section>

          <section>
            <h2>6. ACCEPTABLE USE</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Access the Platform through unauthorized means;</li>
              <li>Reverse engineer, decompile, or attempt to derive source code;</li>
              <li>Reproduce, distribute, sublicense, or resell Platform content;</li>
              <li>Upload malicious code or interfere with Platform operations;</li>
              <li>Use the Platform for unlawful purposes;</li>
              <li>Circumvent security controls or access restrictions;</li>
              <li>Share credentials outside authorized use;</li>
              <li>Use the Platform to compete against Pursuit Pathways.</li>
            </ul>
            <p>We reserve the right to suspend or terminate access for violations of these Terms.</p>
          </section>

          <section>
            <h2>7. INTELLECTUAL PROPERTY</h2>
            <p>
              All Platform content, methodologies, frameworks, software, training materials, assessment systems, trademarks, logos, and related materials are the exclusive property of Pursuit Pathways or its licensors. No rights are granted except those expressly stated in these Terms or a separate written agreement.
            </p>
          </section>

          <section>
            <h2>8. DATA OWNERSHIP</h2>
            <p>
              You retain ownership of data submitted through the Platform ("Customer Data"); Pursuit Pathways retains ownership of the Platform and all related intellectual property. You grant Pursuit Pathways a limited right to process Customer Data solely as necessary to provide services and operate the Platform.
            </p>
            <p>We may use anonymized and aggregated data for product improvement, benchmarking, analytics, security monitoring, and platform development. No aggregated data will identify you or individual users.
            </p>
          </section>

          <section>
            <h2>9. DATA SECURITY</h2>
            <p>
              We implement commercially reasonable administrative, technical, and physical safeguards designed to protect Customer Data. Our infrastructure may utilize third-party providers, including Amazon Web Services (AWS), and related subprocessors. While we use commercially reasonable security measures, no system is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>10. SYSTEM AVAILABILITY</h2>
            <p>
              We use commercially reasonable efforts to maintain Platform availability. Availability targets are service objectives only and do not constitute guarantees unless otherwise expressly agreed in writing.
            </p>
          </section>

          <section>
            <h2>11. INCIDENT REPORTING FEATURE</h2>
            <p>
              The Platform may permit anonymous workplace incident reporting. Organizations remain solely responsible for investigating incidents, taking corrective action, and compliance with applicable employment and safety laws.
            </p>
          </section>

          <section>
            <h2>12. TRAINING & SAFETY DISCLAIMER</h2>
            <p>
              The Platform, training content, recommendations, assessments, reports, and services are tools intended to support workplace safety and preparedness efforts. Pursuit Pathways does not guarantee prevention of workplace violence, prevention of injuries or fatalities, regulatory compliance, legal defensibility, specific training outcomes, or employee decision-making during emergencies.
            </p>
            <p>
              Organizations remain solely responsible for workplace safety programs, emergency response procedures, regulatory compliance, personnel decisions, security infrastructure, and coordination with law enforcement and emergency services.
            </p>
          </section>

          <section>
            <h2>13. THIRD-PARTY SERVICES</h2>
            <p>
              The Platform may integrate with or rely upon third-party services. Pursuit Pathways is not responsible for third-party outages, security failures, data practices, or software performance.
            </p>
          </section>

          <section>
            <h2>14. LIMITATION OF LIABILITY</h2>
            <p className="font-bold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PURSUIT PATHWAYS SHALL NOT BE LIABLE FOR INDIRECT DAMAGES, CONSEQUENTIAL DAMAGES, LOST PROFITS, LOST REVENUE, LOSS OF DATA, BUSINESS INTERRUPTION, PERSONAL INJURY, DEATH, OR PUNITIVE DAMAGES.
            </p>
            <p>
              TOTAL LIABILITY ARISING FROM OR RELATED TO THE PLATFORM OR SERVICES SHALL NOT EXCEED THE AMOUNTS PAID BY CUSTOMER TO PURSUIT PATHWAYS DURING THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
            </p>
          </section>

          <section>
            <h2>15. GOVERNING LAW</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law principles. Any dispute arising from these Terms shall be resolved exclusively in the state or federal courts located in Delaware.
            </p>
          </section>

          <section>
            <p className="text-sm text-slate-500">
              For the complete Terms and Conditions, please see the full document at <Link href="/terms-and-conditions">www.pursuitpathways.com/terms</Link>.
            </p>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-border bg-slate-50 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree-terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
              disabled={isLoading}
            />
            <label htmlFor="agree-terms" className="text-sm text-slate-700 cursor-pointer">
              I have read and agree to the Terms and Conditions above. I understand I must accept these terms to use the platform.
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!agreed || isLoading}
            >
              {isLoading ? "Accepting..." : "Accept & Continue"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
