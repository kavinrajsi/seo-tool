import Link from "next/link";

export const metadata = {
  title: "Terms of Service — SEO Tool",
  description:
    "Read the terms and conditions for using the SEO Tool platform.",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-[#ededed] font-sans">
      <nav className="flex justify-between items-center max-w-[1100px] mx-auto px-5 py-4 sm:px-8 sm:py-5">
        <Link href="/" className="text-base font-semibold tracking-tight text-[#ededed] no-underline">
          SEO Tool
        </Link>
        <div className="flex items-center gap-6 [&_a]:text-sm [&_a]:text-[#999] [&_a]:no-underline [&_a]:transition-colors hover:[&_a]:text-[#ededed]">
          <Link href="/privacy">Privacy</Link>
          <Link href="/signin">Sign In</Link>
          <Link href="/signup" className="!px-4 !py-2 !rounded-lg !bg-[#ededed] !text-black !font-medium transition-opacity hover:!opacity-85">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="max-w-[740px] mx-auto px-5 pt-12 pb-18 sm:px-8 sm:pt-20 sm:pb-24 [&_h1]:text-[28px] [&_h1]:font-bold [&_h1]:tracking-[-1px] [&_h1]:leading-tight [&_h1]:mb-3 sm:[&_h1]:text-[40px] sm:[&_h1]:tracking-[-1.5px] [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-[-0.5px] [&_h2]:mt-9 [&_h2]:mb-4 [&_h2]:text-[#ededed] sm:[&_h2]:text-xl sm:[&_h2]:mt-12 [&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-[#999] [&_p]:mb-4 [&_ul]:list-none [&_ul]:p-0 [&_ul]:mb-4 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2.5 [&_li]:text-[15px] [&_li]:leading-relaxed [&_li]:text-[#999] [&_li]:pl-[18px] [&_li]:relative [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[9px] [&_li]:before:w-[5px] [&_li]:before:h-[5px] [&_li]:before:rounded-full [&_li]:before:bg-[#444] [&_a]:text-[#ededed] [&_a]:underline [&_a]:underline-offset-[3px] [&_a]:decoration-[#444] [&_a]:transition hover:[&_a]:decoration-[#ededed] [&_strong]:text-[#ccc] [&_strong]:font-medium">
        <h1>Terms of Service</h1>
        <p className="!text-[13px] !text-[#666] !mb-12">Last updated: March 18, 2025</p>

        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of the SEO
          Tool web application (&quot;Service&quot;) operated by SEO Tool
          (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an
          account or using the Service, you agree to these Terms.
        </p>

        <h2>1. Account Registration</h2>
        <p>
          To use SEO Tool, you must create an account using a valid email
          address or by signing in with Google. You are responsible for
          maintaining the security of your account credentials and for all
          activity that occurs under your account.
        </p>
        <p>
          You must be at least 13 years old to use this Service. By creating an
          account, you confirm that you meet this age requirement.
        </p>

        <h2>2. Permitted Use</h2>
        <p>You may use SEO Tool to:</p>
        <ul>
          <li>Analyze websites you own or have authorization to audit</li>
          <li>Crawl sites for technical SEO issues</li>
          <li>
            Connect your own Google Analytics, Search Console, and Business
            Profile accounts
          </li>
          <li>Generate reports, sitemaps, and QR codes for your sites</li>
          <li>
            Collaborate with team members on shared SEO dashboards
          </li>
        </ul>

        <h2>3. Prohibited Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Service to crawl, scan, or analyze websites you do not own
            or have permission to audit
          </li>
          <li>
            Attempt to overload, disrupt, or reverse-engineer the Service
          </li>
          <li>
            Use automated scripts or bots to interact with the Service beyond
            its intended functionality
          </li>
          <li>
            Share your account credentials with others or allow unauthorized
            access
          </li>
          <li>
            Use the Service for any illegal, harmful, or fraudulent purpose
          </li>
          <li>
            Resell, redistribute, or commercially exploit the Service without
            our written permission
          </li>
        </ul>

        <h2>4. Google API Integration</h2>
        <p>
          SEO Tool integrates with Google APIs to fetch analytics and search
          data on your behalf. By connecting your Google account, you
          acknowledge that:
        </p>
        <ul>
          <li>
            You are authorizing read-only access to your Google Analytics,
            Search Console, and/or Business Profile data
          </li>
          <li>
            Your use of Google data through our Service is also subject to{" "}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google&apos;s Terms of Service
            </a>
          </li>
          <li>
            You can revoke access at any time through your Google Account
            settings
          </li>
        </ul>

        <h2>5. Teams &amp; Collaboration</h2>
        <p>
          If you create a team, you are the team owner and are responsible for
          managing members and access. Team members can view and contribute to
          shared analyses and reports. You may remove members or delete the team
          at any time.
        </p>

        <h2>6. Data &amp; Content</h2>
        <p>
          You retain ownership of any data you provide to the Service (URLs,
          analysis configurations, team information). We do not claim ownership
          of your content.
        </p>
        <p>
          By using the Service, you grant us a limited license to process,
          store, and display your data solely to provide the Service to you.
        </p>

        <h2>7. AI-Generated Content</h2>
        <p>
          SEO Tool may offer AI-powered content suggestions and analysis. AI
          outputs are provided as suggestions only — you are responsible for
          reviewing and editing any AI-generated content before publishing or
          using it. We make no guarantees about the accuracy or suitability of
          AI-generated content.
        </p>

        <h2>8. Service Availability</h2>
        <p>
          We strive to keep SEO Tool available and reliable, but we do not
          guarantee uninterrupted or error-free operation. We may perform
          maintenance, updates, or changes that temporarily affect availability.
        </p>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of
          the Service with reasonable notice when possible.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, SEO Tool and its operators
          shall not be liable for any indirect, incidental, special, or
          consequential damages arising from your use of the Service. This
          includes but is not limited to loss of data, revenue, or business
          opportunities.
        </p>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, whether express or
          implied.
        </p>

        <h2>10. Account Termination</h2>
        <p>
          You may delete your account at any time through your profile settings.
          We may suspend or terminate your account if you violate these Terms.
          Upon termination, your data will be deleted in accordance with our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make significant
          changes, we will notify you by posting the updated Terms on this page
          with a revised &quot;Last updated&quot; date. Continued use of the
          Service after changes constitutes acceptance of the new Terms.
        </p>

        <h2>12. Contact</h2>
        <p>
          If you have questions about these Terms, please contact us at{" "}
          <a href="mailto:support@seotool.com">support@seotool.com</a>.
        </p>
      </main>

      <footer className="flex flex-col gap-3 text-center p-5 sm:flex-row sm:justify-between sm:items-center max-w-[1100px] mx-auto sm:px-8 sm:py-6 border-t border-[#111] text-[13px] text-[#555]">
        <span>&copy; {new Date().getFullYear()} SEO Tool</span>
        <div className="flex gap-5 justify-center [&_a]:text-[#555] [&_a]:no-underline [&_a]:transition-colors hover:[&_a]:text-[#ededed]">
          <Link href="/">Home</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
