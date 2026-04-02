import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ContactModalLink } from "@/app/_components/contact-modal-link";
import { LegalModalLink } from "@/app/_components/legal-modal-link";
import { LoginModalLink } from "@/app/_components/login-modal-link";
import { privacyContent, termsContent } from "@/app/_lib/legal-content";
import { getSessionUser } from "@/lib/auth/admin-auth";

export const metadata: Metadata = {
  title: "Contact Point | Shared templates for HubSpot outreach",
  description:
    "Contact Point is a HubSpot Chrome extension with a cloud template manager for shared Email, WhatsApp, and Note workflows."
};

const featureCards = [
  {
    title: "Email",
    text: "Apply reusable templates inside HubSpot without copying the same message over and over."
  },
  {
    title: "WhatsApp",
    text: "Open prefilled chats instantly from the same contact workflow."
  },
  {
    title: "Notes and tasks",
    text: "Keep follow-ups organized while shared templates stay consistent across the team."
  }
];

export default async function HomePage() {
  const user = await getSessionUser();

  if (user) {
    redirect(user.mustChangePassword ? "/admin/change-password" : "/admin");
  }

  return (
    <main className="site-main">
      <div className="site-shell">
        <nav className="site-nav" aria-label="Primary">
          <div className="site-nav-inner">
            <a href="#" className="site-brand" aria-label="Contact Point home">
              <Image src="/contact-point-logo.svg" alt="" width={22} height={22} className="site-brand-logo" aria-hidden="true" />
              <span>Contact Point</span>
            </a>
            <div className="site-nav-links">
              <a
                href="https://chromewebstore.google.com/detail/contact-point/lbkmdchppdedcpbodhnefeokaldihfmm"
                target="_blank"
                rel="noreferrer"
              >
                Add to Chrome
              </a>
              <LoginModalLink label="Login" className="site-nav-action" />
            </div>
          </div>
        </nav>

        <section className="hero-section">
          <div className="hero-copy">
            <h1>
              The template manager
              <br />
              for HubSpot
            </h1>
          </div>
        </section>

        <section id="features" className="simple-section">
          <div className="section-heading section-heading-primary">
            <h2>Unlimited templates</h2>
          </div>
          <div className="feature-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="feature-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
          <p className="section-note">
            Templates automatically personalize each message with the contact&apos;s name, gender, and other details.
          </p>
          <div className="section-heading section-subheading">
            <h2>Additional features</h2>
          </div>
          <ul className="feature-list">
            <li>Quickly add local templates from inside the extension</li>
            <li>Used shared cloud templates for email whatsapp and notes</li>
            <li>Apply templates that loads in the extension page in HubSpot</li>
            <li>Open any phone number in HubSpot in WhatsAsapp with pre-filled text</li>
            <li>Open contacts in new tab instead of in the same page</li>
            <li>Darkmode support for HubSpot</li>
          </ul>
          <p className="section-note">
            Want more features? <ContactModalLink label="Reach out!" className="section-note-link" />
          </p>
        </section>

        <section className="simple-section manage-section">
          <div className="manage-copy">
            <h2>Team templates</h2>
            <p>Create and manage shared templates for your team from one place.</p>
            <p>Give everyone access to the same Email, WhatsApp, and Note templates inside Contact Point.</p>
            <p>Each team can manage shared templates centrally and grant access individually.</p>
            <div className="manage-actions">
              <ContactModalLink label="Contact for access" className="site-button site-button-secondary" />
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <span>Contact Point</span>
          <div className="site-footer-links">
            <LegalModalLink label="Terms" className="site-footer-link-button" {...termsContent} />
            <LegalModalLink label="Privacy" className="site-footer-link-button" {...privacyContent} />
          </div>
          <a href="https://serdarsalim.com" target="_blank" rel="noreferrer">
            Developed by Serdar Salim
          </a>
          <span>Not affiliated with HubSpot</span>
        </footer>
      </div>
    </main>
  );
}
