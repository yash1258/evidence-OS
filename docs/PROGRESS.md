# EvidenceOS Progress Map

This document tracks how the product is improving over time.

It should stay short, concrete, and tied to real shipped slices.


## Product Direction

EvidenceOS is moving toward:

- multimodal ingestion
- project-scoped memory
- graph-aware reasoning
- grounded investigation
- project-level overviews instead of file-level chat only


## Shipped Foundation

### Vision and execution docs

- `4d04cd4` Add product vision document
- `397e2e6` Add implementation plan document

What improved:

- product scope is now explicit
- implementation order is defined
- work is being executed against a written strategy, not ad hoc


### Learning vault product track

- pending commit in current branch

What improved:

- the repo now defines a concrete starter wedge for topic-learning vaults
- the "Context Graphs" use case is now translated into product surfaces, agent behaviors, and implementation phases
- the implementation plan now has a clear path for a learning-oriented entry point instead of only generic vaults


### Knowledge vault command center track

- pending commit in current branch

What improved:

- the repo now defines `Knowledge Vault` as a dedicated command-center surface instead of a duplicate dashboard route
- the intended role, structure, signals, and actions for vault management are now explicit
- the implementation plan and UI audit now have a concrete path for replacing the redundant nav behavior


### YouTube transcript import

- pending commit in current branch

What improved:

- the app can now import YouTube videos as transcript-backed vault documents
- transcript segments are chunked by time range and flow into the existing embedding, graph, and overview pipeline
- dashboard, chat, and the context sidebar now expose a live URL import entry point instead of requiring manual transcript copy-paste
- imported YouTube documents now carry source context into the document inspector


### Modular parallel agent runtime

- pending commit in current branch

What improved:

- broad project-scope prompts can now route through a bounded multi-agent path
- local tools gather grounded evidence first instead of letting worker models invent retrieval
- parallel OpenRouter workers now handle:
  - context mapping
  - risk / contradiction auditing
  - next-step planning
- Gemini remains the orchestrator and final synthesizer
- the old single-agent loop remains available as fallback
- settings/system surfaces now expose the active runtime setup


### Runtime hardening and observability

- pending commit in current branch

What improved:

- parallel workers now have bounded timeouts
- chat traces now surface whether a response used the single or parallel path
- if all workers fail, the app falls back cleanly to the single-agent loop
- runtime settings now expose the worker timeout alongside the active worker models


### App stabilization

- `53d2134` Implement vault overview and stabilize app workflows

What improved:

- app builds cleanly
- lint passes
- vault graph sync is fixed
- chat/dashboard workflows are usable
- project overview capability exists at a first pass


### PDF ingestion quality

- `970cf19` Add page-aware PDF ingestion

What improved:

- PDFs are no longer treated as one opaque blob
- PDF text is chunked page-aware
- page metadata can flow into retrieval and citations


### Audio ingestion quality

- `eb36ba2` Add transcript-first audio ingestion

What improved:

- audio files can become transcript chunks
- transcript chunks carry approximate time metadata
- audio is more queryable as project memory


### Overview and source inspector quality

- `53f5964` Improve project overview and source inspector context

What improved:

- source inspector can show better context
- page and time metadata can surface in citations
- dashboard vault cards expose more project-level meaning


### Image understanding and progress tracking

- `8226c0e` Improve image ingestion and track product progress

What improved:

- images now carry richer descriptive metadata
- multimodal image embeddings are complemented with visible-text and entity hints
- the repo now tracks product progress explicitly


### Fixture corpus and validation

- `69b10f2` Add fixture vault corpus and validation script

What improved:

- we now have representative business, student, and legal fixture vaults
- regression checks can validate ingested fixture state against SQLite
- product refinement can be driven by stable sample projects instead of ad hoc uploads


### Metadata and relationship quality

- `5458ddc` Improve metadata and relationship inference quality

What improved:

- document metadata now uses richer multi-chunk context instead of only the first preview
- relationship inference now sees summaries, tags, entities, and evidence samples
- support and contradiction inference should become more reliable on realistic vaults


### Project-guided prompting

- `3aa9780` Add project-guided investigation prompts

What improved:

- dashboard cards can turn overview follow-up questions into investigations
- chat can start from vault-aware project guidance instead of a blank state
- project memory is starting to actively guide the user, not only answer them


### UI audit and live shell connections

- `9af18c2` Audit UI and connect live navigation workflows

What improved:

- major dead navigation items now route to live pages
- the app now has a functional graph explorer
- the app now has a functional settings/models screen
- dashboard and chat controls are less demo-like and more operational


### Investigation history workflow

- `e099260` Add investigations history workspace

What improved:

- the app now has a dedicated investigations/history screen
- persisted sessions can be reopened directly
- dashboard and chat now point to a real investigation workspace instead of the generic chat route


### File-scoped investigation actions

- `bad3400` Add file-scoped investigation actions

What improved:

- files in the chat sidebar can now launch real actions
- users can summarize or investigate a file directly from vault context
- the app is moving from generic prompting toward context-driven workflows


### Contradiction comparison and document inspection

- pending commit in current branch

What improved:

- contradictions now have a dedicated comparison workspace
- documents now have a dedicated inspector page
- file rows now lead into a deeper inspection workflow instead of only quick actions


## Current Focus

### Sprint 1: Ingestion quality

Completed:

- page-aware PDF ingestion
- transcript-first audio ingestion

In progress:

- image understanding metadata

Next:

- fixture vaults for regression
- citation tightening

Recent refinement:

- overview structure is becoming more explicit
- source citations now carry cleaner location labels
- dashboard cards can expose more project-level signals


## How the App Is Improving

The app is improving in layers:

1. from file upload to actual ingestion quality
2. from raw retrieval to project-scoped understanding
3. from generic answers to grounded investigation
4. from vague sources to inspectable evidence

The practical result should be:

- better retrieval quality
- better vault/project summaries
- better contradiction detection
- better trust surface


## Current Gaps

Still weak or incomplete:

- image OCR-quality text extraction
- scanned-document handling
- fixture-based regression testing beyond structural validation
- richer investigation workflows
- proactive agent behaviors


## Immediate Next Slice

Image ingestion quality:

- preserve multimodal image embedding
- generate image description and visible-text metadata
- improve image preview text
- make images materially useful in search, summaries, and vault overviews

Current refinement target:

- tighten vault overview structure
- improve citation/source precision using the fixture corpus

Current in-progress refinement:

- improve metadata generation quality
- improve document relationship inference quality

Latest UX refinement:

- use vault overview memory to suggest the next best investigations

Current UI refinement:

- convert placeholder controls into live workflows while preserving the design system

Current workflow refinement:

- turn persisted investigations into a first-class workspace

Current context refinement:

- turn vault file lists into active entry points for investigation

Current analysis refinement:

- make contradictions and document structure inspectable as first-class surfaces

Current product wedge refinement:

- define a high-signal "Learning Vault" flow for topic mastery across mixed sources

Current source-ingestion refinement:

- turn YouTube videos into first-class transcript documents for learning vaults

Current management-surface refinement:

- define the dedicated vault command center before building the route
