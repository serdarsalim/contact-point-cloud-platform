export interface LegalSection {
  text: string;
  strongLabel?: string;
}

export interface LegalContent {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const privacyContent: LegalContent = {
  title: "Privacy Policy for Contact Point",
  lastUpdated: "March 2, 2026",
  sections: [
    {
      text: "Contact Point is a Chrome extension that helps users run outreach workflows on HubSpot contact pages."
    },
    {
      strongLabel: "Data used for core functionality:",
      text:
        "The extension accesses HubSpot page content needed to perform user-requested actions, including contact fields (such as name, email, phone), notes, and email template content. This data is used only to power extension features (viewing contacts, exports, copy actions, note/email automation) and is not sold."
    },
    {
      strongLabel: "Local vs Cloud templates:",
      text:
        "Local templates are stored in Chrome storage for the current user. Cloud Templates (Premium) are managed on serdarsalim.com and may be synced to authorized users. Cloud template content is created and managed through the web app."
    },
    {
      strongLabel: "Analytics:",
      text:
        "We collect limited usage telemetry to improve reliability and product UX. Events include contacts loaded, WhatsApp clicks, CSV/VCF exports, notes created, and email template apply success/failure. Telemetry includes fields such as app version, event metadata (counts/lengths), and HubSpot portal ID or a random extension identifier. Contact fields and message or note bodies are not sent in analytics payloads."
    },
    {
      strongLabel: "Third-party processing:",
      text:
        "Analytics are processed by PostHog (via us.i.posthog.com) as a service provider. Cloud Templates infrastructure is hosted on serdarsalim.com and related cloud service providers."
    },
    {
      strongLabel: "Storage:",
      text:
        "Settings and local templates are stored using Chrome storage APIs (chrome.storage.sync and chrome.storage.local). Premium cloud template data is stored through Contact Point Cloud services."
    },
    {
      strongLabel: "Data sharing and sale:",
      text: "We do not sell user data."
    },
    {
      strongLabel: "Contact:",
      text: "serdar.dom@gmail.com"
    }
  ]
};

export const termsContent: LegalContent = {
  title: "Terms of Use for Contact Point",
  lastUpdated: "April 2, 2026",
  sections: [
    {
      text: "Contact Point provides Chrome extension features and optional cloud template management for HubSpot workflows."
    },
    {
      strongLabel: "Permitted use:",
      text:
        "You may use Contact Point only for lawful business or internal workflow purposes and only with systems, accounts, and data you are authorized to access."
    },
    {
      strongLabel: "Accounts and access:",
      text:
        "Admin access to Contact Point Cloud is limited to authorized users. Organization API tokens are issued for read access to cloud templates and must be handled securely. You are responsible for activity under your accounts or tokens."
    },
    {
      strongLabel: "Customer data:",
      text:
        "You are responsible for ensuring that your use of Contact Point, including template content and any contact data processed through HubSpot, complies with your contractual, internal, and legal obligations."
    },
    {
      strongLabel: "Availability:",
      text:
        "We may update, improve, suspend, or discontinue parts of the product from time to time. Cloud features are provided on an as-available basis and may be subject to maintenance, outages, or rate limits."
    },
    {
      strongLabel: "Restrictions:",
      text:
        "You may not misuse the service, attempt unauthorized access, interfere with platform security, resell access without permission, or reverse engineer protected portions of the service except where applicable law expressly allows it."
    },
    {
      strongLabel: "Intellectual property:",
      text:
        "Contact Point and its related software, branding, and service materials remain the property of their respective owners. Your organization retains ownership of the template content and business data you provide."
    },
    {
      strongLabel: "Termination:",
      text:
        "We may suspend or revoke access for abuse, security risk, non-payment, or violation of these terms. You may stop using the service at any time."
    },
    {
      strongLabel: "Contact:",
      text: "serdar.dom@gmail.com"
    }
  ]
};
