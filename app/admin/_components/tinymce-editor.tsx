"use client";

import { useEffect, useRef } from "react";

type TinyMceEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height?: number;
};

declare global {
  interface Window {
    tinymce?: any;
  }
}

const TINYMCE_SCRIPT_ID = "tinymce-cdn-script";
const TINYMCE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/tinymce/8.1.2/tinymce.min.js";

async function ensureTinyMCELoaded() {
  if (typeof window === "undefined") return;
  if (window.tinymce) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(TINYMCE_SCRIPT_ID);

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load TinyMCE")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.id = TINYMCE_SCRIPT_ID;
    script.src = TINYMCE_CDN;
    script.referrerPolicy = "origin";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load TinyMCE")), {
      once: true
    });

    document.body.appendChild(script);
  });
}

export function TinyMceEditor({ value = "", onChange, height = 340 }: TinyMceEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<any>(null);
  const latestValueRef = useRef(value);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!textareaRef.current) return;

      textareaRef.current.value = latestValueRef.current;

      await ensureTinyMCELoaded();

      if (cancelled || !window.tinymce) {
        return;
      }

      window.tinymce.init({
        target: textareaRef.current,
        height,
        menubar: false,
        branding: false,
        license_key: "gpl",
        plugins: ["link", "image", "lists", "code", "autoresize"],
        toolbar:
          "undo redo | blocks | bold italic underline | bullist numlist | link image | alignleft aligncenter alignright | code",
        autoresize_bottom_margin: 16,
        image_title: true,
        automatic_uploads: false,
        file_picker_types: "image",
        setup(editor: any) {
          editorRef.current = editor;
          editor.on("init", () => {
            editor.setContent(latestValueRef.current);
          });
          editor.on("change keyup undo redo", () => {
            if (!cancelled) {
              onChange(editor.getContent());
            }
          });
        }
      });
    };

    init();

    return () => {
      cancelled = true;
      if (editorRef.current) {
        editorRef.current.remove();
        editorRef.current = null;
      }
    };
  }, [height, onChange]);

  useEffect(() => {
    latestValueRef.current = value || "";
    if (!editorRef.current) return;

    const currentContent = editorRef.current.getContent();
    if (currentContent === latestValueRef.current) return;

    editorRef.current.setContent(latestValueRef.current);
  }, [value]);

  return <textarea ref={textareaRef} defaultValue={value} style={{ visibility: "hidden" }} />;
}
