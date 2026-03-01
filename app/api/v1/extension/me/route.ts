import { NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/auth/extension-auth";

export async function GET(request: Request) {
  const auth = await authenticateExtensionRequest(request);

  if (auth.error || !auth.apiKey) {
    return auth.error;
  }

  return NextResponse.json({
    organization: {
      id: auth.apiKey.organization.id,
      name: auth.apiKey.organization.name,
      slug: auth.apiKey.organization.slug
    },
    token: {
      id: auth.apiKey.id,
      label: auth.apiKey.label,
      prefix: auth.apiKey.prefix,
      scopes: auth.apiKey.scopes
    }
  });
}
