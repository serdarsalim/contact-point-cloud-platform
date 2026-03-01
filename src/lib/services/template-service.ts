import { Prisma, TemplateType } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function listTemplates(input: {
  organizationId: string;
  type?: TemplateType;
}) {
  return prisma.template.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.type ? { type: input.type } : {})
    },
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }]
  });
}

export async function createTemplate(input: {
  organizationId: string;
  type: TemplateType;
  name: string;
  subject?: string | null;
  body: string;
  imageAssetId?: string | null;
  imageAlt?: string | null;
}) {
  return prisma.template.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      name: input.name.trim(),
      subject: input.subject,
      body: input.body,
      imageAssetId: input.imageAssetId,
      imageAlt: input.imageAlt
    }
  });
}

export async function updateTemplate(
  templateId: string,
  input: {
    type?: TemplateType;
    name?: string;
    subject?: string | null;
    body?: string;
    imageAssetId?: string | null;
    imageAlt?: string | null;
  }
) {
  const data: Prisma.TemplateUpdateInput = {};

  if (input.type) data.type = input.type;
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.subject !== undefined) data.subject = input.subject;
  if (input.body !== undefined) data.body = input.body;
  if (input.imageAssetId !== undefined) data.imageAssetId = input.imageAssetId;
  if (input.imageAlt !== undefined) data.imageAlt = input.imageAlt;

  return prisma.template.update({
    where: { id: templateId },
    data
  });
}

export async function deleteTemplate(templateId: string) {
  return prisma.template.delete({
    where: { id: templateId }
  });
}
