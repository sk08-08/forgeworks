import { buildCurrentUserFormsExport } from "@/features/settings/lib/build-forms-export";
import {
  createExportErrorResponse,
  createJsonExportResponse,
  getExportDate,
} from "@/features/settings/lib/export-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await buildCurrentUserFormsExport();

  if (!result.success) {
    return createExportErrorResponse(result.error);
  }

  return createJsonExportResponse(
    result.data,
    `forgeworks-forms-export-${getExportDate()}.json`,
  );
}
