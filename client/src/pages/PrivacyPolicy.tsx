import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="gap-2 mb-6 -ml-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mb-1">Five Stones Technology</p>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: March 25, 2026 &mdash; Effective date to be confirmed before publishing</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-foreground">

          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-5 py-4 text-sm text-amber-800 dark:text-amber-300">
            <strong>Attorney Review Notice:</strong> This document is a professionally drafted template. It must be reviewed and approved by a licensed attorney before publication.
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Five Stones Technology (&ldquo;Five Stones Technology,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) provides workplace safety solutions including onsite threat assessments, eLearning programs, in-person training, train-the-trainer certification, and a cloud-based Safety Assessment Platform accessible at www.fivestonestechnology.com.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              This Privacy Policy explains how we collect, use, disclose, and protect personal information when you visit our website, use our Platform, engage our professional services, or interact with us in any other way. By using any of our services, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold mb-2">2.1 Information You Provide Directly</h3>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Account and profile information.</strong> When you or your organization creates an account on the Platform, we collect your name, email address, job title, and organizational affiliation.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Assessment and audit data.</strong> When using the Platform to conduct facility safety assessments, we collect the responses, notes, photographs, floor plans, and other documentation you enter or upload during the assessment process.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Incident reports.</strong> Our Platform allows employees to submit anonymous workplace incident reports. We do not require reporters to identify themselves, and we do not log IP addresses in connection with anonymous incident submissions.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Payment information.</strong> Card payments are processed by Stripe, Inc., a PCI-DSS-compliant payment processor. We do not store full card numbers on our systems.
            </p>
            <h3 className="text-base font-semibold mb-2 mt-4">2.2 Information Collected Automatically</h3>
            <p className="text-muted-foreground leading-relaxed">
              We collect standard usage data (pages visited, features used, session duration) and technical information (browser type, operating system, general geographic region). We use session cookies to maintain your authenticated state. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Purpose</th>
                    <th className="text-left py-2 font-medium">Legal Basis</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y">
                  {[
                    ["Providing and operating the Platform and professional services", "Performance of a contract"],
                    ["Processing payments and managing billing", "Performance of a contract"],
                    ["Communicating about your account, services, and support", "Legitimate interests / contract"],
                    ["Improving the Platform through usage analytics", "Legitimate interests"],
                    ["Complying with legal obligations (e.g., tax records)", "Legal obligation"],
                    ["Protecting the security and integrity of our systems", "Legitimate interests"],
                  ].map(([purpose, basis]) => (
                    <tr key={purpose}>
                      <td className="py-2 pr-4">{purpose}</td>
                      <td className="py-2">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell, rent, or trade your personal information to third parties for their marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. How We Share Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Within your organization.</strong> Assessment data and incident reports are accessible only to designated administrators within your organization&rsquo;s account. Anonymous incident reports are visible only to users with the org_admin role.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Service providers.</strong> We share information with vendors who assist us in operating the Platform (cloud hosting, database, payment processing via Stripe, AI services). These vendors are contractually required to use your information only as directed by us.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong>Legal requirements.</strong> We may disclose personal information if required by law, court order, or governmental authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Data Type</th>
                    <th className="text-left py-2 font-medium">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y">
                  {[
                    ["Account and profile information", "Duration of account plus 3 years after closure"],
                    ["Assessment and audit data", "Duration of account plus 7 years"],
                    ["Incident reports", "7 years from submission date (OSHA alignment)"],
                    ["Payment records", "7 years (tax and financial compliance)"],
                    ["Activity logs", "3 years from creation"],
                    ["Communications", "3 years from last interaction"],
                  ].map(([type, period]) => (
                    <tr key={type}>
                      <td className="py-2 pr-4">{type}</td>
                      <td className="py-2">{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement technical and organizational measures to protect your personal information, including encrypted data transmission (TLS/HTTPS), session authentication with signed cookies, role-based access controls, rate limiting, and security headers (Content Security Policy, HSTS, X-Frame-Options). No method of transmission over the internet is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, correct, delete, or receive a portable copy of your personal information. To exercise any of these rights, contact us at <a href="mailto:info@fivestonestechnology.com" className="text-primary underline">info@fivestonestechnology.com</a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Anonymous Incident Reporting</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our anonymous incident reporting feature is designed with privacy as a priority. Reporters are not required to create an account or provide their name. We do not log the IP address of anonymous submissions. Reports are visible only to designated organization administrators. Reporters receive a unique tracking token to check report status without revealing their identity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Children&rsquo;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are intended for use by adults in a professional business context. We do not knowingly collect personal information from individuals under the age of 18.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. When we make material changes, we will update the &ldquo;Last Updated&rdquo; date and notify account holders by email or through a notice on the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <address className="not-italic text-muted-foreground leading-relaxed">
              <strong>Five Stones Technology</strong><br />
              <a href="mailto:info@fivestonestechnology.com" className="text-primary underline">info@fivestonestechnology.com</a><br />
              <a href="https://www.fivestonestechnology.com" className="text-primary underline" target="_blank" rel="noopener noreferrer">www.fivestonestechnology.com</a>
            </address>
          </section>
        </div>
      </div>
    </div>
  );
}
