"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { LoginForm } from "@/app/admin/_components/login-form";

interface LoginModalLinkProps {
  label?: string;
  className?: string;
}

export function LoginModalLink({ label = "Login", className = "" }: LoginModalLinkProps) {
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
              className="site-login-modal-backdrop"
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="site-login-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="site-login-modal-head">
                  <div>
                    <p className="site-login-modal-eyebrow">Admin access</p>
                    <h2 id={titleId}>Log in</h2>
                    <p className="site-login-modal-intro">For existing team template managers.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="site-login-modal-close"
                    aria-label="Close login modal"
                  >
                    ×
                  </button>
                </div>

                <div className="site-login-modal-form">
                  <LoginForm />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
