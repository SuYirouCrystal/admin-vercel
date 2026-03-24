import type { NextRequest } from "next/server";

import { guardToolSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return guardToolSession(request);
}

export const config = {
  matcher: ["/"],
};
