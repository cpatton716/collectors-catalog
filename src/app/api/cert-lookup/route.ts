import { NextRequest, NextResponse } from "next/server";

import { lookupCertification } from "@/lib/certLookup";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { certNumber, gradingCompany } = body;

    if (!certNumber) {
      return NextResponse.json({ error: "Certification number is required" }, { status: 400 });
    }

    if (!gradingCompany) {
      return NextResponse.json({ error: "Grading company is required" }, { status: 400 });
    }

    const result = await lookupCertification(gradingCompany, certNumber);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Certification lookup failed",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      source: result.source,
      certNumber: result.certNumber,
      data: result.data,
    });
  } catch (error) {
    console.error("[cert-lookup API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
