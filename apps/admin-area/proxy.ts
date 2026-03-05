import type { NextRequest } from "next/server";

import { guardAdminSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return guardAdminSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
