import { buildCurrentUserAtlasExport } from "@/features/settings/lib/build-atlas-export";
import {
  createExportErrorResponse,
  createJsonExportResponse,
  getExportDate,
} from "@/features/settings/lib/export-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await buildCurrentUserAtlasExport();

  if (!result.success) {
    return createExportErrorResponse(result.error);
  }

  return createJsonExportResponse(
    result.data,
    `forge-knowledge-atlas-${getExportDate()}.json`,
  );
}
