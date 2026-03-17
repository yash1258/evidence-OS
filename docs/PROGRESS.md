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
- fixture-based regression testing
- richer investigation workflows
- proactive agent behaviors


## Immediate Next Slice

Image ingestion quality:

- preserve multimodal image embedding
- generate image description and visible-text metadata
- improve image preview text
- make images materially useful in search, summaries, and vault overviews
