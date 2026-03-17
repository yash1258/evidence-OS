# EvidenceOS Implementation Plan

This document translates [VISION.md](D:/Agents/gemini-embed-2/evidence-os/docs/VISION.md) into an execution sequence.

It is intentionally biased toward:

- product leverage over feature count
- retrieval quality over UI noise
- vault-level intelligence over file-level gimmicks
- trust and grounding over speculative autonomy


## 1. Execution Principles

Every implementation decision should improve at least one of these:

- ingestion quality
- retrieval quality
- vault/project understanding
- agent reasoning quality
- trust and evidence visibility

Avoid work that adds surface area without improving those core loops.


## 2. Current Baseline

The app already has a usable foundation:

- vaults
- file upload
- multimodal embedding pipeline
- Chroma vector store
- SQLite graph store
- graph-aware agent tools
- chat UI
- dashboard UI
- first-pass vault overview generation

Current weaknesses are mostly in quality and depth:

- PDF handling is too shallow
- audio handling is too shallow
- image understanding is too shallow
- vault overviews are still metadata-heavy rather than evidence-rich
- agent behavior is still mostly reactive
- trust UX is present but not yet strong enough


## 3. Product Milestones

## Milestone 1: Reliable Multimodal Ingestion

### Goal

Make the ingestion pipeline good enough that the rest of the product has strong raw material to work with.

### Why This Comes First

All downstream intelligence depends on chunk quality, metadata quality, and modality coverage.

If ingestion is weak:

- search is weak
- graph edges are weak
- summaries are weak
- contradictions are weak
- overviews are weak

### Deliverables

- real PDF text extraction
- page-aware and section-aware PDF chunking
- audio transcription pipeline
- timestamp-aware audio chunking
- image OCR and caption/description extraction
- better chunk metadata per modality
- ingestion regression fixtures for multiple domains

### Acceptance Criteria

- a 100-page PDF is chunked into useful retrieval units rather than one giant blob
- audio can be queried by content and ideally surfaced with timestamps
- image-heavy vaults produce usable searchable metadata
- at least 3 representative fixture vaults can be ingested end-to-end:
  - student vault
  - legal vault
  - business/project vault

### Suggested Technical Tasks

- add a PDF parser with page and heading extraction
- store page numbers in chunk metadata
- add transcript generation for audio inputs
- store transcript segments with timestamps
- add OCR/caption stage for images
- enrich chunk metadata with modality-specific fields
- add sample fixture data under a dedicated test/fixtures path


## Milestone 2: Strong Vault-Level Memory

### Goal

Make each vault feel like a coherent project mind.

### Why This Comes Second

Once ingestion is strong, the system can build better project-level abstractions.

### Deliverables

- persistent vault overview refresh workflow
- top themes/topics extraction
- recurring entity map
- contradiction rollup
- support/reference rollup
- early timeline extraction
- representative evidence cluster selection

### Acceptance Criteria

- asking "What is this project about?" gives a meaningfully better answer than a flat file summary
- asking "Who or what matters most in this vault?" returns a useful entity-centric answer
- asking "Where are the contradictions?" works at vault scope
- dashboard can show stable overview snippets without recomputing everything every time

### Suggested Technical Tasks

- extend the vault overview object with structured sections
- persist richer overview properties on vault nodes
- add timeline extraction from document metadata/entities
- add topic clustering over summaries + tags + entities
- add cached overview invalidation rules on ingest/update/delete
- add vault overview API responses that include structured stats, not just prose


## Milestone 3: Agent Behaviors at Project Scope

### Goal

Make the agent operate like a thoughtful investigator rather than a retrieval wrapper.

### Deliverables

- project summary mode
- clarifying-question mode
- investigation mode with explicit phases
- proactive follow-up suggestions
- better tool selection for broad questions
- stronger multi-step plans over graph + vector search

### Acceptance Criteria

- broad questions trigger vault/project tools first, not only chunk search
- ambiguous user questions produce a useful clarifying question when needed
- agent can propose "next useful questions" after a high-level overview
- multi-hop questions produce better reasoning traces and fewer dead-end loops

### Suggested Technical Tasks

- add intent routing for broad vs narrow vs investigative prompts
- define agent response modes
- add a "questions to ask next" output path
- add project-scope planning heuristics
- add light loop protections and repeated-tool detection


## Milestone 4: Trust and Evidence UX

### Goal

Make the system visibly trustworthy.

### Deliverables

- richer source inspector
- page/timestamp-level citations
- evidence trails in answers
- contradiction comparison UI
- graph neighborhood view
- timeline view for vaults and investigations
- ingestion progress feedback by stage and modality

### Acceptance Criteria

- a user can inspect where an answer came from without confusion
- contradictions can be viewed as side-by-side evidence
- audio-backed answers can reference timestamps
- PDF-backed answers can reference page/chunk boundaries
- project overview feels inspectable, not just generated prose

### Suggested Technical Tasks

- enrich citations in agent output payloads
- add page/timestamp metadata to source inspector
- add graph/timeline side panels or dedicated views
- add ingestion telemetry visible in the UI


## Milestone 5: Reliability and Product Hardening

### Goal

Make the system stable enough for repeated real use.

### Deliverables

- proper migrations
- ingestion retries and failure handling
- background job strategy for heavy processing
- test fixtures and regression tests
- telemetry and error logging
- performance profiling for large vaults

### Acceptance Criteria

- schema upgrades do not break old local data
- failed ingestion steps do not leave vaults in inconsistent states
- large vault ingest remains usable
- common regressions are caught by tests

### Suggested Technical Tasks

- formalize migration helpers
- add retry/backoff around remote model/vector operations
- move expensive ingest stages into queued/background execution where needed
- add fixture-driven integration tests
- add structured logging around upload, retrieval, and agent loops


## 4. Priority Order

The priority order should remain:

1. ingestion quality
2. vault intelligence
3. agent behaviors
4. trust UX
5. hardening

This order is deliberate.

Do not spend serious effort on:

- cosmetic dashboard polish
- extra side-panels
- provider abstraction complexity
- multi-user collaboration
- advanced settings surfaces

until milestones 1 and 2 are strong.


## 5. Sprint Structure

Recommended sprint size: small and vertical.

Each sprint should:

- improve one important user outcome
- ship code that is testable through the UI
- add or update fixtures to prove the behavior

Do not let a sprint become "infrastructure only" unless it removes a critical blocker.


## 6. First Sprint Recommendation

## Sprint 1: Ingestion Quality Upgrade

### Objective

Upgrade raw input quality so the rest of the system has good material to reason over.

### Scope

- real PDF extraction
- page-aware PDF chunking
- audio transcription pipeline
- timestamp-aware audio chunking
- image OCR/caption metadata
- fixture vaults for regression

### User Outcomes

- a lawyer can query a large PDF accurately
- a student can query lecture audio and notes together
- an image or scanned document contributes meaningfully to search and overview

### Proposed Task Breakdown

#### Track A: PDF Pipeline

- choose and integrate a PDF extraction library
- extract page text
- chunk by page and heading when possible
- store page numbers in chunk metadata

#### Track B: Audio Pipeline

- add transcription stage
- split transcript by timestamps/segments
- store transcript chunks with time metadata
- preserve original audio file reference

#### Track C: Image Pipeline

- add OCR extraction if text is present
- add image caption/description metadata
- merge OCR and caption text into searchable representation

#### Track D: Regression Fixtures

- create representative vault fixtures:
  - student notes + lecture audio + slides
  - contract + witness statement + transcript
  - product docs + meeting notes + screenshots
- define expected queries and expected answers/citations

### Acceptance Criteria

- PDF retrieval cites page metadata
- audio retrieval cites timestamp metadata
- image documents produce searchable text metadata
- fixture vault queries return meaningfully improved answers versus current baseline


## 7. Second Sprint Recommendation

## Sprint 2: Rich Vault Overview

### Objective

Make "what is this whole project about?" a first-class capability.

### Scope

- structured vault overview object
- topic/entity aggregation
- contradiction rollup
- representative evidence sets
- overview refresh/invalidation behavior

### Acceptance Criteria

- dashboard shows a useful project snapshot
- agent can answer project-wide questions with better structure
- overviews are cached and refreshed when the vault changes


## 8. Third Sprint Recommendation

## Sprint 3: Investigation Agent

### Objective

Make the agent feel like an investigator, not a retriever.

### Scope

- clarifying question mode
- investigation mode
- next-question suggestions
- better routing between project-level and document-level tools

### Acceptance Criteria

- ambiguous prompts no longer produce weak direct answers
- follow-up questions feel context-aware
- project-level prompts use project-level tools first


## 9. Architecture Implications

The current architecture remains directionally correct:

- vector store for multimodal recall
- graph store for relationships and traversal
- agent loop for tool orchestration

But the architecture should evolve in these ways:

- chunk metadata must become richer
- vault nodes must become more meaningful
- overview generation should be refreshable and cache-aware
- ingestion should become more asynchronous as heavier modalities are added


## 10. Risks

### Risk 1: Weak Parsing Quality

If PDFs, audio, and images remain shallowly processed, the product will always feel weaker than the vision.

### Risk 2: Generic Agent Behavior

If the agent stays in narrow question-answer mode, the product will feel like a wrapper.

### Risk 3: Poor Trust Surface

If answers are strong but hard to verify, adoption will stall in serious use cases.

### Risk 4: Premature Surface Expansion

Too much UI breadth before strong ingestion and vault intelligence will slow the product down.


## 11. Definition of Done for Near-Term Product Fit

We should consider the near-term implementation successful when a user can:

- upload a mixed-format vault
- ask what the whole project is about
- ask detailed evidence-backed questions
- inspect citations with useful metadata
- discover contradictions and relationships
- feel that the system has built a coherent project memory


## 12. Immediate Next Action

The immediate next coding tranche should be Sprint 1:

- PDF extraction and chunking
- audio transcription and timestamp chunking
- image OCR/caption metadata
- regression fixture vaults

That is the highest-leverage investment available.
