import { NextResponse } from "next/server";

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 1000;

const hubspotPortalId = process.env.HUBSPOT_PORTAL_ID || "245018207";
const hubspotFormId = process.env.HUBSPOT_FORM_ID || "9590640c-b7f7-4c80-856e-d97dd6c4d469";

function extractHubspotUtk(cookieHeader: string) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(/hubspotutk=([^;]+)/);
  return match ? match[1] : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!firstName) {
      return NextResponse.json({ error: "Name required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }

    if (firstName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Name too long." }, { status: 400 });
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ error: "Email too long." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message required." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message too long." }, { status: 400 });
    }

    if (!hubspotPortalId || !hubspotFormId) {
      return NextResponse.json({ error: "HubSpot config missing." }, { status: 500 });
    }

    const referer = request.headers.get("referer") || "";
    const hubspotUtk = extractHubspotUtk(request.headers.get("cookie") || "");

    const payload = {
      submittedAt: Date.now(),
      fields: [
        { name: "firstname", value: firstName },
        { name: "email", value: email },
        { name: "message", value: message }
      ],
      context: {
        hutk: hubspotUtk || undefined,
        pageUri: referer || undefined,
        pageName: "Contact Point access request"
      }
    };

    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${hubspotPortalId}/${hubspotFormId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HubSpot submission failed:", errorText);
      return NextResponse.json({ error: "Failed to submit form." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
