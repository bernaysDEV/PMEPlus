import { Link } from "wouter";
import { Brain } from "lucide-react";
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
        Your privacy is at the heart of our priorities at Property ME. This
        policy explains how we collect, use, and protect your personal
        information when you use our platform. We are committed to protecting
        your data in accordance with best practices and local and international
        regulations.
      </p>
    ),
  },
  {
    id: "data-we-collect",
    number: "02",
    title: "Information we collect",
    body: (
      <>
        <p>
          <strong className="text-foreground">Information you provide:</strong>{" "}
          such as your name and email address when creating an account or
          subscribing to our newsletter.
        </p>
        <p>
          <strong className="text-foreground">
            Information we collect automatically (usage data):
          </strong>
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-foreground">Interaction data:</strong> the
            articles you read, the topics you prefer, and the time you spend on
            the platform. This data powers our smart recommendation system and
            personalized content.
          </li>
          <li>
            <strong className="text-foreground">Technical data:</strong> device
            type, operating system, IP address, and browser type. Used to
            improve platform performance and ensure its security.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "ai-personalization",
    number: "03",
    title: "Data we use for AI personalization",
    body: (
      <Callout
        dir={dir}
        tone="accent"
        icon={Brain}
        title="How we use your data inside our AI"
        testId="callout-ai-data"
      >
        <p>
          We use your reading behavior (the articles you engage with, the time
          you spend, and the topics you follow) to train a personal
          recommendation model that belongs to you. We do not share this data
          with any third party, and we do not use it for advertising outside
          the platform. You can reset your preferences or disable smart
          recommendations at any time from your account settings.
        </p>
      </Callout>
    ),
  },
  {
    id: "how-we-use",
    number: "04",
    title: "How we use your information",
    body: (
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong className="text-foreground">To personalize your experience:</strong>{" "}
          we use interaction data to provide recommendations and content
          tailored to your interests.
        </li>
        <li>
          <strong className="text-foreground">To improve our services:</strong>{" "}
          we analyze usage data to understand how readers interact with the
          platform and to develop new features.
        </li>
        <li>
          <strong className="text-foreground">To communicate with you:</strong>{" "}
          to send important notifications about your account, platform updates,
          or our newsletters (with your consent).
        </li>
      </ul>
    ),
  },
  {
    id: "protection",
    number: "05",
    title: "How we protect your information",
    body: (
      <>
        <p>
          We use advanced technical and organizational security measures (such
          as encryption and security protocols) to protect your data from
          unauthorized access.
        </p>
        <p>
          We do not sell, rent, or share your personal information with third
          parties for marketing purposes without your explicit consent.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    number: "06",
    title: "Cookies",
    body: (
      <p>
        We use cookies to store your preferences and improve your browsing
        experience. You can control the use of cookies through your browser
        settings.
      </p>
    ),
  },
  {
    id: "your-rights",
    number: "07",
    title: "Your rights",
    body: (
      <>
        <p>
          You have the right to access, correct, or request deletion of the
          personal information we hold about you.
        </p>
        <p>You can unsubscribe from our emails at any time.</p>
      </>
    ),
  },
  {
    id: "changes",
    number: "08",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. We will notify you of any
        significant changes by posting the new policy on this page.
      </p>
    ),
  },
  {
    id: "contact",
    number: "09",
    title: "Contact us",
    body: (
      <p>
        If you have any questions about this privacy policy, please contact us
        at{" "}
        <a
          href="mailto:privacy@sabq.org"
          className="text-accent underline underline-offset-4 hover:text-accent/80"
        >
          privacy@sabq.org
        </a>{" "}
        or through our{" "}
        <Link href="/en/contact">
          <span className="text-accent underline underline-offset-4 hover:text-accent/80 cursor-pointer">
            contact page
          </span>
        </Link>
        .
      </p>
    ),
  },
];

export default function EnglishPrivacyPage() {
  return (
    <EnglishLayout>
      <div className="bg-background flex flex-col" dir={dir}>
        <main className="flex-1">
          <EditorialHero
            dir={dir}
            eyebrow="Legal document"
            title="Privacy policy."
            lead="Your data is yours. This document explains, precisely and clearly, what we collect, why, how we protect it — and what you can control at any time."
            meta={[
              { label: "Last updated", value: "October 2025" },
              { label: "Reading time", value: "7 minutes" },
              { label: "Version", value: "2.0" },
              { label: "Scope", value: "All Property ME surfaces" },
            ]}
          />

          <LongFormDocLayout
            dir={dir}
            tocTitle="In this document"
            sections={sections}
          />

          <CTABand
            dir={dir}
            eyebrow="You're in control"
            title="Your privacy, your choices."
            lead="Reset your preferences any time, or reach our team directly with any question about your data."
            primary={{
              label: "Manage my preferences",
              href: "/en/notification-settings",
              testId: "en-button-manage-preferences",
            }}
            secondary={{
              label: "Contact privacy team",
              href: "/en/contact",
              testId: "en-button-contact-privacy",
            }}
          />
        </main>

        <EnglishFooter />
      </div>
    </EnglishLayout>
  );
}
