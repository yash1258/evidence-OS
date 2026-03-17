import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const ROOT = process.cwd();
const FIXTURES_DIR = path.join(ROOT, "test_docs", "fixtures");
const DB_PATH = path.join(ROOT, "data", "evidence.db");

function readFixtureExpectations() {
  const fixtureNames = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return fixtureNames.map((name) => {
    const expectationPath = path.join(FIXTURES_DIR, name, "EXPECTATIONS.json");
    return {
      fixtureKey: name,
      expectationPath,
      data: JSON.parse(fs.readFileSync(expectationPath, "utf8")),
    };
  });
}

function parseJsonArray(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

function validateFixture(db, fixture) {
  const { fixtureKey, data } = fixture;
  const vault = db.prepare("SELECT * FROM vaults WHERE name = ?").get(data.vaultName);

  if (!vault) {
    return {
      fixtureKey,
      skipped: true,
      ok: true,
      errors: [],
      message: `Vault not found yet: ${data.vaultName}`,
    };
  }

  const docs = db.prepare("SELECT * FROM documents WHERE vault_id = ? AND status = 'ready'").all(vault.id);
  const chunkCount = docs.reduce((sum, doc) => sum + Number(doc.chunkCount || 0), 0);
  const contentTypes = new Set(docs.map((doc) => doc.contentType));

  const allEntities = new Set();
  for (const doc of docs) {
    for (const entity of parseJsonArray(doc.entities)) {
      allEntities.add(String(entity));
    }
  }

  const edgeRows = db.prepare(`
    SELECT DISTINCT e.type
    FROM graph_edges e
    JOIN graph_nodes n ON e.source_id = n.id
    WHERE n.vault_id = ?
  `).all(vault.id);
  const edgeTypes = new Set(edgeRows.map((row) => row.type));

  const errors = [];

  if (docs.length < data.expectedDocumentCount) {
    errors.push(`Expected at least ${data.expectedDocumentCount} ready docs, found ${docs.length}`);
  }

  if (chunkCount < data.minChunkCount) {
    errors.push(`Expected at least ${data.minChunkCount} chunks, found ${chunkCount}`);
  }

  for (const entity of data.expectedEntities || []) {
    if (!allEntities.has(entity)) {
      errors.push(`Missing expected entity: ${entity}`);
    }
  }

  for (const contentType of data.expectedContentTypes || []) {
    if (!contentTypes.has(contentType)) {
      errors.push(`Missing expected content type: ${contentType}`);
    }
  }

  for (const relationship of data.expectedRelationships || []) {
    if (!edgeTypes.has(relationship)) {
      errors.push(`Missing expected relationship type: ${relationship}`);
    }
  }

  return {
    fixtureKey,
    vaultName: data.vaultName,
    ok: errors.length === 0,
    errors,
    summary: {
      documents: docs.length,
      chunks: chunkCount,
      edgeTypes: Array.from(edgeTypes).sort(),
      contentTypes: Array.from(contentTypes).sort(),
    },
  };
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  const fixtures = readFixtureExpectations();
  const results = fixtures.map((fixture) => validateFixture(db, fixture));

  let failed = 0;

  for (const result of results) {
    console.log(`\n[${result.fixtureKey}] ${result.skipped ? "SKIP" : result.ok ? "OK" : "FAIL"}`);
    if (result.vaultName) {
      console.log(`Vault: ${result.vaultName}`);
    }
    if (result.message) {
      console.log(result.message);
    }
    if (result.summary) {
      console.log(`Documents: ${result.summary.documents}, Chunks: ${result.summary.chunks}`);
      console.log(`Content types: ${result.summary.contentTypes.join(", ") || "none"}`);
      console.log(`Edge types: ${result.summary.edgeTypes.join(", ") || "none"}`);
    }
    if (!result.ok) {
      failed += 1;
      for (const error of result.errors) {
        console.log(`- ${error}`);
      }
    }
  }

  if (failed > 0) {
    console.error(`\nFixture validation failed for ${failed} fixture vault(s).`);
    process.exit(1);
  }

  console.log("\nAll ingested fixture vaults passed validation.");
}

main();
