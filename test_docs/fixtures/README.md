# Fixture Vaults

This folder contains representative mixed-domain fixture vaults for regression testing.

Current fixtures:

- `business_alpha`
- `student_semester`
- `legal_case`

Each fixture contains:

- source files to ingest into one vault
- `EXPECTATIONS.json` describing the minimum expected post-ingest state

## Intended Use

1. Create a vault with the exact `vaultName` from `EXPECTATIONS.json`
2. Upload all files from that fixture directory except `EXPECTATIONS.json`
3. Generate a project overview for that vault at least once
4. Run:

```bash
npm run validate:fixtures
```

The validator checks SQLite state for:

- vault existence
- minimum ready document count
- minimum chunk count
- expected entities
- expected content types
- expected graph relationship types

## Why These Fixtures Exist

They provide repeatable coverage for:

- project-wide summary quality
- contradiction and support detection
- multimodal ingestion progress
- graph formation quality
- evidence/citation improvements
