import { AlertTriangle, Scale } from "lucide-react";
import { EnglishLayout } from "@/components/en/EnglishLayout";
import { EnglishFooter } from "@/components/en/EnglishFooter";
import {
  EditorialHero,
  LongFormDocLayout,
  Callout,
  CTABand,
  type DocSection,
} from "@/components/footer-pages/SharedSections";

const dir = "ltr" as const;

const sections: DocSection[] = [
  {
    id: "intro",
    number: "01",
    title: "Introduction",
    body: (
      <p>
        Welcome to Property ME, the media platform affiliated with Property ME.
        By using our platform, you agree to abide by these terms and
        conditions. Please read them carefully. Your continued use of the
        platform constitutes implicit acceptance of these terms.
      </p>
    ),
  },
  {
    id: "use-of-platform",
    number: "02",
    title: "Platform usage",
    body: (
      <>
        <p>
          You agree to use the platform for legitimate purposes and in a
          manner that does not infringe on the rights of others or limit their
          use of the platform.
        </p>
        <p>
          Content published on Property ME (text, images, videos) is the
          intellectual property of the platform and is protected by copyright
          laws. It may not be copied or republished without prior written
          permission.
        </p>
      </>
    ),
  },
  {
    id: "ai-content",
    number: "03",
    title: "AI-generated content",
    body: (
      <>
        <Callout
          dir={dir}
          tone="warning"
          icon={AlertTriangle}
          title="Disclaimer: AI-assisted content"
          testId="callout-ai-disclaimer"
        >
          <p>
            Some content on Property ME is generated, in whole or in part, with
            the help of AI tools (such as summaries, recommendations, and
            preliminary analyses). This content goes through editorial review,
            but is not free from the possibility of error. It does not
            constitute legal, financial, or professional advice, and should not
            be relied on for critical decisions without independent
            verification from original sources.
          </p>
        </Callout>
        <p>
          Property ME uses artificial intelligence technologies to analyze
          content and provide personalized recommendations to enhance your
          experience. We strive to provide accurate and reliable content, but
          we cannot guarantee it is completely error-free.
        </p>
      </>
    ),
  },
  {
    id: "user-account",
    number: "04",
    title: "User account",
    body: (
      <>
        <p>
          Access to some features may require creating a personal account. You
          are responsible for maintaining the confidentiality of your account
          information and for all activities that occur through it.
        </p>
        <p>
          The information provided during registration must be accurate and
          correct.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    number: "05",
    title: "Disclaimer",
    body: (
      <>
        <p>
          Property ME is not responsible for any direct or indirect damages
          that may arise from your use of the platform or your reliance on its
          content.
        </p>
        <p>
          External links that may appear in our content are not under our
          control, and we are not responsible for the content of those
          websites.
        </p>
      </>
    ),
  },
  {
    id: "modifications",
    number: "06",
    title: "Modification of terms",
    body: (
      <p>
        We reserve the right to modify these terms and conditions at any time.
        The updated version will be posted on this page, and your continued
        use of the platform after the modification constitutes acceptance of
        the new terms.
      </p>
    ),
  },
  {
    id: "governing-law",
    number: "07",
    title: "Governing law",
    body: (
      <Callout
        dir={dir}
        tone="primary"
        icon={Scale}
        title="Governing law"
        testId="callout-governing-law"
      >
        <p>
          These terms and conditions are governed by and interpreted in
          accordance with the laws and regulations applicable in the Kingdom
          of Saudi Arabia, and the courts of the Kingdom shall have
          jurisdiction over any dispute arising from them.
        </p>
      </Callout>
    ),
  },
];

export default function EnglishTermsPage() {
  return (
    <EnglishLayout>
      <div className="bg-background flex flex-col" dir={dir}>
        <main className="flex-1">
          <EditorialHero
            dir={dir}
            eyebrow="Legal document"
            title="Terms and conditions."
            lead="The rules that govern your use of Property ME. Written in plain language wherever possible, so you know your rights and responsibilities on the platform."
            meta={[
              { label: "Last updated", value: "October 2025" },
              { label: "Reading time", value: "6 minutes" },
              { label: "Version", value: "2.0" },
              { label: "Effective", value: "Upon publication" },
            ]}
          />

          <LongFormDocLayout
            dir={dir}
            tocTitle="In this document"
            sections={sections}
          />

          <CTABand
            dir={dir}
            eyebrow="Questions"
            title="Need clarification on the terms?"
            lead="Our support team is ready to answer any questions you may have about this document."
            primary={{
              label: "Contact us",
              href: "/en/contact",
              testId: "en-button-cta-contact",
            }}
            secondary={{
              label: "Read the privacy policy",
              href: "/en/privacy",
              testId: "en-button-cta-privacy",
            }}
          />
        </main>

        <EnglishFooter />
      </div>
    </EnglishLayout>
  );
}
