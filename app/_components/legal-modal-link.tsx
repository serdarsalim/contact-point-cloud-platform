"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

interface LegalSection {
  text: string;
  strongLabel?: string;
}

interface LegalModalLinkProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  label: string;
  className?: string;
}

export function LegalModalLink({ title, lastUpdated, sections, label, className = "" }: LegalModalLinkProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="site-legal-modal-backdrop"
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="site-legal-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="site-legal-modal-head">
                  <div>
                    <p className="site-legal-modal-eyebrow">Legal</p>
                    <h2 id={titleId}>{title}</h2>
                    <p className="site-legal-modal-intro">Last updated: {lastUpdated}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="site-legal-modal-close"
                    aria-label={`Close ${label.toLowerCase()} modal`}
                  >
                    ×
                  </button>
                </div>

                <div className="site-legal-modal-body">
                  {sections.map((section, index) => {
                    const isEmail = section.strongLabel === "Contact:" && section.text.includes("@");

                    return (
                      <p key={`${title}-${index}`}>
                        {section.strongLabel ? <strong>{section.strongLabel}</strong> : null}
                        {section.strongLabel ? " " : null}
                        {isEmail ? <a href={`mailto:${section.text}`}>{section.text}</a> : section.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
