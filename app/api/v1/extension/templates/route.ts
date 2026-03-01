import { TemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/auth/extension-auth";
import { badRequest } from "@/lib/http";
import { listTemplates } from "@/lib/services/template-service";

export async function GET(request: Request) {
  const auth = await authenticateExtensionRequest(request);

  if (auth.error || !auth.apiKey) {
    return auth.error;
  }

  const url = new URL(request.url);
  const typeRaw = url.searchParams.get("type");
  let type: TemplateType | undefined;

  if (typeRaw) {
    const normalized = typeRaw.toUpperCase();
    if (!Object.values(TemplateType).includes(normalized as TemplateType)) {
      return badRequest("type must be EMAIL, WHATSAPP, or NOTE");
    }
    type = normalized as TemplateType;
  }

  const templates = await listTemplates({
    organizationId: auth.apiKey.organizationId,
    type
  });

  return NextResponse.json({
    organizationId: auth.apiKey.organizationId,
    source: "cloud",
    templates
  });
}
