import {
  buildJaiBridgeUserscript,
  FORGEWORKS_BIO_BRIDGE_VERSION,
} from "@/features/bio-studio/lib/jai-bridge";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  return new Response(buildJaiBridgeUserscript(origin), {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Content-Disposition":
        'inline; filename="forgeworks-bio-bridge.user.js"',
      "Cache-Control": "no-store",
      "X-Forgeworks-Bridge-Version": FORGEWORKS_BIO_BRIDGE_VERSION,
    },
  });
}
