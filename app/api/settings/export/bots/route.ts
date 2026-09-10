import { buildCurrentUserBotsExport } from "@/features/settings/lib/build-bots-export";
import {
  createExportErrorResponse,
  createJsonExportResponse,
  getExportDate,
} from "@/features/settings/lib/export-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await buildCurrentUserBotsExport();

  if (!result.success) {
    return createExportErrorResponse(result.error);
  }

  return createJsonExportResponse(
    result.data,
    `forgeworks-bots-export-${getExportDate()}.json`,
  );
}
