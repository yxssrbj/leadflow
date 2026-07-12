import { NextRequest, NextResponse } from "next/server";
import { getLeads } from "@/lib/crm";
import { DEFAULT_BUSINESS_ID, isBusinessId } from "@/lib/agents/configs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const businessParam = req.nextUrl.searchParams.get("business");
  const businessId = businessParam && (await isBusinessId(businessParam)) ? businessParam : DEFAULT_BUSINESS_ID;

  const leads = await getLeads(businessId);
  return NextResponse.json({
    leads: status ? leads.filter((l) => l.status === status) : leads,
  });
}
