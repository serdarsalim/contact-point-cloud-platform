"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type ContactStatus = "idle" | "sending" | "sent" | "error";

interface ContactModalLinkProps {
  label?: string;
  className?: string;
}

export function ContactModalLink({ label = "Contact", className = "" }: ContactModalLinkProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ContactStatus>("idle");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeModal() {
    setOpen(false);
    setStatus("idle");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedFirstName || !trimmedEmail || !trimmedMessage) return;

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          email: trimmedEmail,
          message: trimmedMessage
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send");
      }

      setFirstName("");
      setEmail("");
      setMessage("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="site-contact-modal-backdrop"
              onClick={closeModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="site-contact-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="site-contact-modal-head">
                  <div className="site-contact-modal-copy">
                    <p className="site-contact-modal-eyebrow">Premium team templates</p>
                    <h2 id={titleId}>Request access</h2>
                    <p className="site-contact-modal-intro">
                      Tell us a bit about your team and we will follow up about shared-template access.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="site-contact-modal-close"
                    aria-label="Close access request form"
                  >
                    ×
                  </button>
                </div>

                <form className="site-contact-modal-form" onSubmit={onSubmit}>
                  <input
                    type="text"
                    name="firstname"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Name"
                    required
                    maxLength={120}
                    className="site-contact-modal-input"
                  />
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Work email"
                    required
                    maxLength={160}
                    className="site-contact-modal-input"
                  />
                  <textarea
                    name="message"
                    placeholder="What organization are you with, and what would shared templates help you manage?"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    required
                    maxLength={1000}
                    className="site-contact-modal-input site-contact-modal-textarea"
                  />

                  <div className="site-contact-modal-actions">
                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="site-button site-button-primary site-contact-modal-submit"
                    >
                      {status === "sending" ? "Sending..." : "Send request"}
                    </button>
                  </div>

                  {status === "sent" ? (
                    <p className="site-contact-modal-feedback">Thanks. We will get back to you shortly.</p>
                  ) : null}
                  {status === "error" ? (
                    <p className="site-contact-modal-feedback site-contact-modal-feedback-error">
                      Something went wrong. Try again.
                    </p>
                  ) : null}
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
