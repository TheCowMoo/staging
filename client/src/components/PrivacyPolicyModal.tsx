import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type PrivacyPolicyModalProps = {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
};

export function PrivacyPolicyModal({ open, onAccept, onClose }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-slate-950 text-white">
          <DialogTitle>Privacy Policy — Pursuit Pathways Inc.</DialogTitle>
          <DialogDescription className="text-sm text-slate-300 mt-1">
            Effective Date: May 13, 2026
          </DialogDescription>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[68vh] overflow-y-auto prose prose-slate prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-primary">
          <section>
            <p>
              Pursuit Pathways Inc. ("Pursuit Pathways," "we," "our," or "us") is a Delaware corporation with its principal place of business in Bradenton, Florida. We provide workplace safety solutions including onsite threat assessments, eLearning programs, in-person training, train-the-trainer certification, and a cloud-based Safety Assessment Platform (the "Platform") accessible at www.pursuitpathways.com.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and protect personal information when you visit our website, use our Platform, engage our professional services, or interact with us in any other way. By using any of our services, you acknowledge that you have read and understood this Privacy Policy.
            </p>
            <p>
              We are committed to handling personal information responsibly, transparently, and in accordance with applicable United States federal and state privacy laws.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <p>We collect personal information in two ways: information you provide directly to us, and information collected automatically through your use of our services.</p>
            <h3>2.1 Information You Provide Directly</h3>
            <ul>
              <li><strong>Account and profile information:</strong> When you or your organization creates an account on the Platform, we collect your name, email address, job title, and organizational affiliation. Organization administrators may also provide their organization's name, address, and contact details.</li>
              <li><strong>Assessment and audit data:</strong> When using the Platform to conduct facility safety assessments, we collect the responses, notes, photographs, floor plans, and other documentation you enter or upload. This data is associated with the specific facility and organization account.</li>
              <li><strong>Incident reports:</strong> Our Platform allows employees to submit anonymous workplace incident reports. We do not require reporters to identify themselves, and we do not log IP addresses in connection with anonymous incident submissions.</li>
              <li><strong>Training and eLearning records:</strong> We collect completion records, assessment scores, and certification information.</li>
              <li><strong>Communications:</strong> Records of communications including your name, contact details, and the content of your message.</li>
              <li><strong>Payment information:</strong> Card payments are processed by Stripe, Inc. We do not store full card numbers on our systems.</li>
            </ul>
            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li><strong>Usage data:</strong> Information about how you interact with the Platform (pages visited, features used). This is used to improve the Platform and is not sold to third parties.</li>
              <li><strong>Device and technical information:</strong> Browser type, operating system, and general geographic region (derived from IP address).</li>
              <li><strong>Cookies and session tokens:</strong> We use session cookies to maintain your authenticated state. These are set as httpOnly and secure. We do not use advertising or tracking cookies.</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="py-2 px-3 font-semibold">Purpose</th>
                    <th className="py-2 px-3 font-semibold">Legal Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Providing and operating the Platform and professional services", "Performance of a contract"],
                    ["Processing payments and managing billing", "Performance of a contract"],
                    ["Communicating about your account, services, and support", "Legitimate interests / Contract"],
                    ["Sending service-related notices (security alerts, changes)", "Legitimate interests"],
                    ["Improving the Platform through usage analytics", "Legitimate interests"],
                    ["Complying with legal obligations (tax, incident reporting)", "Legal obligation"],
                    ["Protecting the security and integrity of our systems", "Legitimate interests"],
                    ["Responding to legal process or law enforcement requests", "Legal obligation"],
                  ].map(([purpose, basis]) => (
                    <tr key={purpose} className="border-t border-slate-200">
                      <td className="py-2 px-3 align-top">{purpose}</td>
                      <td className="py-2 px-3 align-top">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>4. How We Share Your Information</h2>
            <ul>
              <li><strong>Within your organization:</strong> Assessment data and audit reports are accessible to designated administrators. Anonymous incident reports are visible only to administrators with the org_admin role.</li>
              <li><strong>Service providers:</strong> Third-party vendors (AWS, Stripe, and AI/LLM providers) who assist in operating the Platform. AI providers are used solely to assist in generating recommendations and do not acquire ownership rights to submitted data.</li>
              <li><strong>Business transfers:</strong> In the event of a merger or acquisition, data may be transferred with prior notice.</li>
              <li><strong>Legal requirements:</strong> Disclosure required by law or to protect safety and rights.</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="py-2 px-3 font-semibold">Data Type</th>
                    <th className="py-2 px-3 font-semibold">Retention Period</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Account and profile information", "Duration of account plus 3 years"],
                    ["Assessment and audit data", "Duration of account plus 7 years"],
                    ["Incident reports", "7 years from submission (OSHA aligned)"],
                    ["Payment records", "7 years (tax/financial compliance)"],
                    ["Activity logs", "3 years from creation"],
                    ["Communications", "3 years from last interaction"],
                  ].map(([type, period]) => (
                    <tr key={type} className="border-t border-slate-200">
                      <td className="py-2 px-3 align-top">{type}</td>
                      <td className="py-2 px-3 align-top">{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>6. Data Security</h2>
            <p>We implement technical measures including: encrypted data transmission (TLS/HTTPS), session authentication with signed cookies, role-based access controls (RBAC), rate limiting on all API endpoints, and security headers (CSP, HSTS, X-Frame-Options).</p>
          </section>

          <section>
            <h2>7. Your Rights and Choices</h2>
            <p>You have the right to Access, Correct, Delete, or request Portability of your data. You may also Opt-out of non-essential communications. To exercise these rights, contact <a href="mailto:info@pursuitpathways.com">info@pursuitpathways.com</a>. We respond within 30 days.</p>
          </section>

          <section>
            <h2>8. Anonymous Incident Reporting</h2>
            <ul>
              <li>No account creation required for reporters.</li>
              <li>No IP address logging.</li>
              <li>Unique tracking tokens provided for status checks without revealing identity.</li>
            </ul>
          </section>

          <section>
            <h2>9. Children’s Privacy</h2>
            <p>Our services are not intended for individuals under 18. If we inadvertently collect such data, we will delete it promptly.</p>
          </section>

          <section>
            <h2>10. Third-Party Links</h2>
            <p>This policy does not apply to third-party sites linked within our Platform.</p>
          </section>

          <section>
            <h2>11. Changes to This Privacy Policy</h2>
            <p>Material changes will be notified via email or Platform notice. Your continued use constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2>12. Contact Us</h2>
            <p>
              Pursuit Pathways Inc.<br />
              8 The Green, Suite A<br />
              Dover, Delaware 19901<br />
              Email: <a href="mailto:info@pursuitpathways.com">info@pursuitpathways.com</a><br />
              Website: <a href="https://www.pursuitpathways.com" target="_blank" rel="noreferrer">www.pursuitpathways.com</a>
            </p>
          </section>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 gap-3">
          <Button variant="outline" onClick={() => onClose()}>Read full policy</Button>
          <Button onClick={onAccept}>I Agree and Continue</Button>
        </DialogFooter>
        <div className="px-6 pb-6 text-sm text-muted-foreground">
          <Link href="/legal/privacy" className="text-primary underline">View the full policy page</Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
