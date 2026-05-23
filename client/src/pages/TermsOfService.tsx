import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mt-2">Legal defensibility platform &mdash; Last updated: March 25, 2026</p>
        </div>

        <div className="space-y-8 text-foreground">

          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-5 py-4 text-sm text-amber-800 dark:text-amber-300">
            <strong>Attorney Review Notice:</strong> This document is a professionally drafted template. It must be reviewed and approved by a licensed attorney before publication.
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Agreement Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service govern your access to and use of the Five Stones Technology Legal defensibility platform, including all associated software, features, reports, and documentation (the &ldquo;Platform&rdquo;), provided by <strong>Five Stones Technology</strong>.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              By creating an account, accepting an invitation to join an organization account, or otherwise accessing the Platform, you agree to be bound by these Terms. If you are accessing the Platform on behalf of an organization, you represent that you have the authority to bind that organization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Subscription Plans and Fees</h2>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Tier</th>
                    <th className="text-left py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y">
                  <tr>
                    <td className="py-2 pr-4 font-medium">Year 1 Engagement</td>
                    <td className="py-2">Custom-quoted; Platform access bundled with onsite assessment, training, or other professional services</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Annual License</td>
                    <td className="py-2">Recurring annual subscription for continued Platform access following the Year 1 engagement</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Multi-Year Commitment</td>
                    <td className="py-2">Discounted annual license for 2-year or 3-year commitments; pricing specified in the applicable order form</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              All fees are due in advance of each subscription term. Annual subscriptions automatically renew unless written notice of non-renewal is provided at least 30 days before the end of the current term. All fees are non-refundable except as described in these Terms or as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Customer Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain all right, title, and interest in and to the data you submit to the Platform (&ldquo;Customer Data&rdquo;). Five Stones Technology does not claim ownership of Customer Data. You grant Five Stones Technology a limited license to process, store, and transmit Customer Data solely as necessary to provide the Platform and related services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Upon termination, Five Stones Technology will provide an export of your Customer Data within 30 days upon request, after which the data will be deleted in accordance with our data retention schedule.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Five Stones Technology retains all right, title, and interest in and to the Platform, including all software, assessment frameworks, scoring methodologies, and documentation. Nothing in these Terms transfers any intellectual property rights in the Platform to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the Platform for any unlawful purpose; attempt to gain unauthorised access to other accounts; reverse engineer or decompile any part of the Platform; use the Platform to transmit malicious code or spam; or resell or sublicense access to the Platform to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; Five Stones Technology disclaims all warranties, express or implied, including warranties of merchantability and fitness for a particular purpose. Assessment outputs, corrective action recommendations, and Emergency Action Plans generated by the Platform are intended to support — not replace — the professional judgment of qualified safety practitioners. You are solely responsible for the decisions you make based on Platform outputs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by applicable law, Five Stones Technology&rsquo;s total cumulative liability arising out of or related to these Terms will not exceed the total fees paid by you in the twelve (12) months immediately preceding the event giving rise to the claim. In no event will either party be liable for any indirect, incidental, special, consequential, or punitive damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of Delaware. Any disputes shall be resolved exclusively in the state or federal courts located in Delaware.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
            <address className="not-italic text-muted-foreground leading-relaxed">
              <strong>Five Stones Technology</strong><br />
              <a href="mailto:info@fivestonestechnology.com" className="text-primary underline">info@fivestonestechnology.com</a>
            </address>
          </section>

          <p className="text-xs text-muted-foreground border-t pt-4">
            This Terms of Service was prepared as a draft template and must be reviewed by a licensed attorney before publication.
          </p>
        </div>
      </div>
    </div>
  );
}
