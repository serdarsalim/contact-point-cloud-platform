ALTER TABLE "Template" ADD COLUMN "position" INTEGER;

WITH ranked_templates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", type
      ORDER BY "createdAt" ASC, id ASC
    ) AS next_position
  FROM "Template"
)
UPDATE "Template" AS template
SET "position" = ranked_templates.next_position
FROM ranked_templates
WHERE template.id = ranked_templates.id;

ALTER TABLE "Template" ALTER COLUMN "position" SET NOT NULL;

CREATE INDEX "Template_organizationId_type_position_idx"
ON "Template"("organizationId", type, "position");
