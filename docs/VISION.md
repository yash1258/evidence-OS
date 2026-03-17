# EvidenceOS Vision

## 1. Product Thesis

EvidenceOS should become a multimodal knowledge operating system for unstructured personal and professional data.

The user should be able to drop an entire messy project into one place:

- notes
- meeting minutes
- transcripts
- long PDFs
- research papers
- lecture notes
- images
- screenshots
- whiteboards
- audio recordings
- legal materials
- business documents
- personal reference material

The system should transform that raw material into usable intelligence.

This is not a "chat with files" wrapper.

This is a persistent memory layer plus reasoning engine:

- multimodal embeddings for recall
- graphs for relationships
- agent tools for investigation
- project-level memory for bird's-eye understanding
- grounded outputs with evidence

The core idea is simple:

> Drop your raw world in. EvidenceOS builds a model of it. You can interrogate that model from any angle.


## 2. Product Goal

Build an application where users can continuously build a vault or project from unstructured data and then:

- ask direct questions
- ask broad project questions
- find contradictions
- trace relationships
- understand timelines
- extract entities
- summarize large materials
- compare materials against each other
- get proactive prompts from the agent
- discover what they have not yet noticed

The experience should feel like the system has formed a working mental model of the project, not just indexed files.


## 3. Who It Is For

EvidenceOS is intentionally horizontal.

The same engine should support multiple user types because the core problem is the same: too much unstructured material, too little usable structure.

### 3.1 Students

Students should be able to drop:

- lecture notes
- class PDFs
- slides
- textbook excerpts
- voice notes
- revision documents
- assignment specs

And then ask:

- "What are the main themes across this semester?"
- "Quiz me on weak areas in these notes."
- "Compare Chapter 3 notes against the lecture transcript."
- "What concepts recur but I have not revised enough?"

### 3.2 Lawyers

Lawyers should be able to drop:

- contracts
- briefs
- evidence bundles
- transcripts
- emails
- notes
- discovery materials

And then ask:

- "Summarize this case file."
- "Where do these materials contradict each other?"
- "What references support this clause interpretation?"
- "Show me all places where this witness statement conflicts with the written record."

### 3.3 Researchers and Analysts

Researchers should be able to drop:

- papers
- notes
- images
- transcripts
- field observations
- recordings

And then ask:

- "What are the dominant research themes?"
- "Which sources support this claim?"
- "Which concepts connect these two subtopics?"
- "What patterns are emerging across these materials?"

### 3.4 Founders, Teams, Knowledge Workers

They should be able to drop:

- strategy docs
- product notes
- customer interviews
- meeting notes
- screenshots
- roadmaps
- specs

And then ask:

- "What is the current state of this product initiative?"
- "What contradictions exist between strategy and customer feedback?"
- "Summarize the entire project for a new team member."
- "What unanswered questions remain?"

### 3.5 Personal Knowledge Users

They should be able to drop:

- journals
- notes
- saved articles
- voice memos
- scanned papers
- image captures

And then use the system as a second-brain engine rather than passive storage.


## 4. The Core User Job

The user job is not "ask a chatbot a question."

The real job is:

> Help me turn messy information into navigable understanding.

That breaks into several sub-jobs:

- store everything in one place
- retain it durably
- connect related things
- retrieve the right things fast
- reason over them carefully
- explain conclusions with evidence
- surface patterns I would not have found manually


## 5. Product Principles

### 5.1 Multimodal by Default

The product must treat text, audio, image, document, and transcript data as first-class citizens.

Not as bolt-ons.

The user should feel that the vault understands projects, not file formats.

### 5.2 Project Scope Matters

The main unit of meaning is not the file. It is the vault or project.

The system should understand:

- what belongs together
- what themes dominate a vault
- what entities recur
- what clusters exist
- where evidence conflicts
- what this project is "about"

### 5.3 Grounding Over Vibes

The system must remain evidence-backed.

Good UX here means:

- clear source references
- explicit uncertainty
- reliable retrieval
- visible reasoning steps where useful

The product should feel sophisticated, not magical in a fake way.

### 5.4 Agentic, But Disciplined

The agent should do more than answer direct prompts.

It should be able to:

- choose tools
- traverse graph structure
- compare evidence
- summarize the whole project
- ask clarifying questions
- suggest next investigations

But it should not become noisy or uncontrollable.

### 5.5 Persistent Memory

The system should improve as the vault grows.

Over time, it should accumulate:

- overview summaries
- investigation nodes
- inferred relationships
- recurring entities
- project-specific patterns


## 6. What EvidenceOS Is

EvidenceOS should be understood as a combination of:

- local-first multimodal ingestion
- project-scoped vector memory
- graph-structured relationship memory
- agentic retrieval and reasoning
- human-readable evidence grounding

Put differently:

It is a knowledge OS, not just an LLM front-end.


## 7. What EvidenceOS Is Not

To stay sharp, this product should avoid collapsing into these weaker categories:

### 7.1 Not a Generic File Chatbot

If the product only answers "chat with your PDF" style questions, it fails the vision.

### 7.2 Not Just a Search Box

Semantic search is necessary, but not enough.

Users need synthesis, cross-linking, contradiction analysis, and project understanding.

### 7.3 Not an Over-Automated Agent Toy

If the agent becomes clever-looking but ungrounded, the product loses trust.

### 7.4 Not a Corporate-Only Tool

The product must remain broad enough for students, solo researchers, and personal knowledge users.


## 8. The Product Experience We Want

The target user feeling should be:

- "I can throw everything here."
- "The system actually understands what belongs together."
- "It can answer both specific and project-wide questions."
- "It can show me why it answered that way."
- "It can connect formats and documents I would not have connected myself."
- "It feels like working with a careful research assistant plus structured memory."


## 9. Core Capabilities

### 9.1 Ingestion

The product should ingest and normalize:

- text
- markdown
- PDFs
- images
- audio
- derived transcripts
- future: video and scanned OCR-heavy materials

### 9.2 Metadata Generation

Each file should produce:

- summary
- content type
- tags
- entities
- modality
- vault membership

### 9.3 Embedding Memory

Embeddings should provide:

- semantic retrieval
- cross-modal retrieval
- project-scoped recall
- fast nearest-neighbor lookup

### 9.4 Graph Memory

The graph should provide:

- structure
- document membership
- chunk ordering
- shared entities
- semantic neighbors
- inferred relationships
- investigation history

### 9.5 Agent Tooling

The agent should be able to:

- search the vault
- open supporting documents
- compare documents
- find contradictions
- traverse graph relations
- summarize a full vault
- build project-level answers

### 9.6 Project Overview

Each vault should eventually maintain a living project overview:

- what the vault is about
- major themes
- top entities
- evidence clusters
- contradictions
- representative materials
- unresolved questions


## 10. Key Product Objects

The product model should center around a few persistent objects:

### 10.1 Vault

A vault is a project scope.

It is the container that gives meaning to the data inside it.

### 10.2 Document

A document is any ingested artifact:

- text file
- PDF
- image
- audio file
- transcript

### 10.3 Chunk

A chunk is the retrieval unit.

The product quality depends heavily on chunk quality.

### 10.4 Entity

Entities are recurring anchors:

- people
- organizations
- dates
- legal concepts
- academic concepts
- products
- places

### 10.5 Investigation

An investigation is a durable reasoning artifact created by the agent when it answers a question or explores a project.

### 10.6 Vault Overview

A vault overview is the bird's-eye memory object for the project as a whole.


## 11. Ideal User Flows

### 11.1 Initial Project Creation

1. User creates a vault
2. User uploads many mixed-format materials
3. System ingests and connects them
4. System generates first-pass overview
5. User asks broad question: "What is this whole project about?"

### 11.2 Focused Question

1. User asks a narrow question
2. Agent retrieves relevant materials
3. Agent traverses graph relations if needed
4. Agent responds with evidence-backed answer

### 11.3 Deep Investigation

1. User asks for contradictions, themes, or patterns
2. Agent uses graph and retrieval together
3. Agent synthesizes across multiple files and modalities
4. Investigation is stored for future recall

### 11.4 Proactive Assistance

1. Vault grows over time
2. System identifies themes, gaps, or tensions
3. Agent asks useful follow-up questions or proposes investigations


## 12. Product Moat

The moat is not "we use an LLM."

The moat is the combination of:

- multimodal project memory
- graph-aware retrieval
- agentic investigation
- persistent overview memory
- evidence grounding

Many products can answer questions about one uploaded file.
Far fewer can build a trustworthy working model of a whole project.


## 13. UX Direction

The product should feel:

- premium
- serious
- exploratory
- intentional
- fast
- trustworthy

The UI should communicate:

- this is a vault
- this vault has structure
- the agent is not guessing
- the project has shape

The interface should emphasize:

- project view
- evidence view
- graph view
- source inspection
- investigation history


## 14. Technical Direction

The implementation should continue moving toward:

### 14.1 Better Parsing and Chunking

Priority:

- real PDF chunking
- transcript-aware audio chunking
- better image metadata extraction
- OCR support

### 14.2 Better Vault-Level Memory

Priority:

- persistent overview node
- cluster detection
- timeline extraction
- recurring entity maps
- contradiction summaries

### 14.3 Better Agent Behaviors

Priority:

- project summary mode
- ask-user clarification mode
- proactive recommendations
- query decomposition
- multi-hop retrieval plans

### 14.4 Better Trust Surface

Priority:

- tighter citations
- visible evidence trails
- confidence labeling
- grounded summaries


## 15. Non-Goals for Early Stages

To stay focused, early implementation should not try to solve everything.

Avoid over-investing in:

- team collaboration features
- permissions complexity
- enterprise admin surface
- advanced automation frameworks
- too many provider abstractions

First make the core knowledge OS excellent.


## 16. Success Criteria

We should consider the product direction correct if a user can:

- ingest an entire project without format anxiety
- ask "what is this whole thing about?" and get a useful answer
- ask a specific question and get a grounded answer
- find contradictions or connections across materials
- feel that the system remembers and understands the project over time


## 17. Strategic Statement

EvidenceOS should become the place where unstructured data turns into operational understanding.

Not file storage.
Not chat with documents.
Not AI theater.

Operational understanding.


## 18. Immediate Execution Implication

Every implementation decision should be evaluated against one question:

> Does this make the vault feel more like a coherent, navigable project mind?

If yes, it is likely aligned.
If no, it is probably a distraction.
