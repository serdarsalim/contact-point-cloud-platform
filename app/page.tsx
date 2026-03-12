import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ContactModalLink } from "@/app/_components/contact-modal-link";
import { LoginModalLink } from "@/app/_components/login-modal-link";
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

const screenshotCards = [
  {
    title: "Contacts table",
    text: "Bulk actions, exports, and quick outreach from the main HubSpot contacts view.",
    src: "https://serdarsalim.com/contact-point/ContactListNew.png",
    alt: "Contact Point contacts table inside HubSpot"
  },
  {
    title: "Template picker",
    text: "Choose the right Email or WhatsApp template in a few clicks.",
    src: "https://serdarsalim.com/contact-point/ApplyTemplateNew.png",
    alt: "Contact Point template picker"
  },
  {
    title: "Settings and cloud access",
    text: "Manage local settings and connect shared team templates when needed.",
    src: "https://serdarsalim.com/contact-point/SettingsNew.png",
    alt: "Contact Point settings and team template access keys"
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
              <a href="#features">Features</a>
              <a href="#screenshots">Screenshots</a>
              <LoginModalLink label="Login" className="site-nav-action" />
            </div>
          </div>
        </nav>

        <section className="hero-section">
          <div className="hero-backdrop" aria-hidden="true" />
          <div className="hero-copy">
            <h1>Template Manager for HubSpot.</h1>
            <p className="hero-intro">
              Contact Point brings Email, WhatsApp, Notes, Tasks, and shared team templates into one cleaner HubSpot
              workflow.
            </p>
            <div className="hero-actions">
              <a
                href="https://chromewebstore.google.com/detail/contact-point/lbkmdchppdedcpbodhnefeokaldihfmm"
                target="_blank"
                rel="noreferrer"
                className="site-button site-button-primary"
              >
                Add to Chrome
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="simple-section">
          <div className="section-heading">
            <h2>What Contact Point does</h2>
            <p>The extension handles the CRM workflow. This site handles shared template management for teams.</p>
          </div>
          <div className="feature-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="feature-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="screenshots" className="simple-section">
          <div className="section-heading">
            <h2>Screenshots</h2>
            <p>A quick look at the extension inside real HubSpot workflows.</p>
          </div>
          <div className="screenshot-grid">
            {screenshotCards.map((card) => (
              <article key={card.title} className="screenshot-card">
                <div className="screenshot-frame">
                  <img src={card.src} alt={card.alt} loading="lazy" />
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="simple-section manage-section">
          <div className="manage-copy">
            <h2>Manage shared templates</h2>
            <p>
              Team templates are a premium feature. Contact us to learn more or request access for your organization.
            </p>
            <p>
              Local templates still work inside the extension. Cloud templates are for teams that want one shared
              source of truth across Email, WhatsApp, and Notes.
            </p>
            <div className="manage-actions">
              <ContactModalLink label="Contact for access" className="site-button site-button-secondary" />
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <span>Contact Point</span>
          <a href="https://serdarsalim.com" target="_blank" rel="noreferrer">
            Developed by Serdar Salim
          </a>
          <span>Not affiliated with HubSpot</span>
        </footer>
      </div>
    </main>
  );
}
