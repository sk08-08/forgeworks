import { buildCurrentUserAccountExport } from "@/features/settings/lib/build-account-export";
import {
  createExportErrorResponse,
  createJsonExportResponse,
  getExportDate,
  sanitizeExportFilenamePart,
} from "@/features/settings/lib/export-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await buildCurrentUserAccountExport();

  if (!result.success) {
    return createExportErrorResponse(result.error);
  }

  const username = sanitizeExportFilenamePart(result.username);

  return createJsonExportResponse(
    result.data,
    `forgeworks-${username}-export-${getExportDate()}.json`,
  );
}
