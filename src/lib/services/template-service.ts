import { Prisma, TemplateType } from "@prisma/client";
import { prisma } from "@/lib/db";

const templateInsightSelect = {
  id: true,
  organizationId: true,
  type: true,
  name: true,
  subject: true,
  body: true,
  usageCount: true,
  lastUsedAt: true,
  imageAssetId: true,
  imageAlt: true,
  createdAt: true,
  updatedAt: true
} as const;

export type TemplateInsightRecord = Prisma.TemplateGetPayload<{
  select: typeof templateInsightSelect;
}>;

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

export async function recordTemplateUsage(input: { templateId: string; organizationId: string }) {
  return prisma.template.updateMany({
    where: {
      id: input.templateId,
      organizationId: input.organizationId
    },
    data: {
      usageCount: {
        increment: 1
      },
      lastUsedAt: new Date()
    } as Prisma.TemplateUpdateManyMutationInput
  });
}

export async function getTemplateInsights(organizationId: string) {
  const templates = await prisma.template.findMany({
    where: { organizationId },
    select: templateInsightSelect,
    orderBy: [{ usageCount: "desc" }, { lastUsedAt: "desc" }, { updatedAt: "desc" }] as Prisma.TemplateOrderByWithRelationInput[]
  }) as TemplateInsightRecord[];

  const usedTemplates = templates.filter((template) => template.usageCount > 0);
  const unusedTemplates = templates.filter((template) => template.usageCount === 0);
  const totalUsageCount = templates.reduce((sum, template) => sum + template.usageCount, 0);
  const mostUsedTemplate = usedTemplates[0] || null;
  const mostRecentTemplate = [...usedTemplates].sort((a, b) => {
    const aTime = a.lastUsedAt ? a.lastUsedAt.getTime() : 0;
    const bTime = b.lastUsedAt ? b.lastUsedAt.getTime() : 0;
    return bTime - aTime;
  })[0] || null;

  return {
    templates,
    usedTemplates,
    unusedTemplates,
    totalUsageCount,
    mostUsedTemplate,
    mostRecentTemplate,
    topUsedTemplates: usedTemplates.slice(0, 5),
    recentlyUsedTemplates: [...usedTemplates]
      .sort((a, b) => {
        const aTime = a.lastUsedAt ? a.lastUsedAt.getTime() : 0;
        const bTime = b.lastUsedAt ? b.lastUsedAt.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5),
    unusedPreviewTemplates: unusedTemplates.slice(0, 5)
  };
}
