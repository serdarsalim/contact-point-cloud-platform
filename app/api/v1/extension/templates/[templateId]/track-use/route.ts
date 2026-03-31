import { NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/auth/extension-auth";
import { recordTemplateUsage } from "@/lib/services/template-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ templateId: string }> }
) {
  const auth = await authenticateExtensionRequest(request);

  if (auth.error || !auth.apiKey) {
    return auth.error;
  }

  const { templateId } = await context.params;

  if (!templateId) {
    return NextResponse.json({ error: "Template id is required" }, { status: 400 });
  }

  const result = await recordTemplateUsage({
    templateId,
    organizationId: auth.apiKey.organizationId
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
