import { NextRequest, NextResponse } from "next/server";
import { createVault, listVaults } from "@/lib/storage/database";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const vaults = listVaults();
    return NextResponse.json(vaults);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch vaults" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Vault name is required" }, { status: 400 });
    }

    const id = `vault_${uuidv4().replace(/-/g, "")}`;
    createVault(id, name);

    return NextResponse.json({ id, name, created_at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create vault" },
      { status: 500 }
    );
  }
}
