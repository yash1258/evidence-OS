# Learning Vault Feature Track

This document defines a concrete starter wedge for EvidenceOS:

> a user builds a vault around one topic and uses the system to learn it deeply from mixed sources.

Example:

- a "Context Graphs" vault
- research papers
- YouTube transcripts
- screenshots of diagrams or tweet graphics
- personal notes
- summary snippets

This is a strong starting feature track because it is:

- multimodal
- evidence-heavy
- concept-driven
- useful for students, researchers, and self-directed learners
- close to the broader product vision without requiring enterprise complexity


## 1. Product Goal

Make EvidenceOS feel like a topic intelligence workspace.

A user should be able to collect scattered learning material into one vault and then:

- understand the main ideas
- compare how different sources frame the same concept
- find recurring entities and terms
- identify disagreements or gaps
- turn the vault into a study map
- get guided questions and learning prompts


## 2. Starter User Story

The user wants to learn "context graphs."

They create a vault and add:

- paper PDFs
- plain-text notes
- screenshots of graphics from X/Twitter
- image snippets from articles or slides
- YouTube transcripts or pasted summaries

Then they ask:

- "What are the main ideas across this vault?"
- "How do these papers define context graphs differently?"
- "What concepts recur across papers and videos?"
- "What should I read first if I am new to this?"
- "Quiz me on weak areas."
- "What am I still missing?"


## 3. Why This Is a Good Wedge

It exercises nearly every part of the product in one contained workflow:

- ingestion of mixed source types
- chunking and metadata extraction
- multimodal retrieval
- concept/entity extraction
- graph relationships
- vault-level overview generation
- guided investigation in chat

It is also product-legible.

If this works well, users immediately understand what EvidenceOS is for.


## 4. User Outcomes

The user should be able to:

- drop a topic corpus into one vault without worrying about file format
- ask both broad and narrow questions about the topic
- see source-backed answers with readable citations
- get a bird's-eye overview of the topic
- follow suggested next questions instead of staring at a blank prompt box
- revisit the vault later and continue from accumulated project memory


## 5. V1 Source Types

For the first useful version of Learning Vaults, we should support:

- local PDFs
- local text and markdown files
- local images and screenshots
- pasted notes
- pasted transcript text

Near-next support:

- YouTube URL import with transcript extraction
- article URL import with readable-text extraction
- X/Twitter post image import or screenshot workflows

Important constraint:

URL ingestion is useful, but the Learning Vault should already work well with manual or local inputs. Do not block the feature track on web crawling.


## 6. Core Questions the Product Must Answer Well

### Broad understanding

- What is this topic about?
- What are the main themes?
- Which concepts appear most often?

### Comparison

- How do source A and source B differ?
- Which sources support the same explanation?
- Where do these sources conflict?

### Guided learning

- What should I read first?
- What are the prerequisite ideas?
- What should I study next?
- Ask me questions to test my understanding.

### Gap detection

- What is still unclear in this vault?
- Which terms appear without enough explanation?
- What related sources are probably missing?


## 7. Product Surfaces

### 7.1 Vault creation

Add a "Learning Vault" starter mode or template with:

- a topic name
- an optional learning goal
- suggested starter prompts after creation

### 7.2 Dashboard card

Learning-oriented vault cards should surface:

- topic summary
- key concepts
- recommended next question
- unread or weakly-covered areas later

### 7.3 Chat empty state

For a learning vault, the chat should show:

- what this vault currently covers
- top concepts
- a study roadmap prompt
- a compare-sources prompt
- a quiz-me prompt

### 7.4 Document inspector

The document inspector should make it easy to ask:

- summarize this source
- compare this source with the vault overview
- what concepts does this source introduce?

### 7.5 Graph view

The graph should become legible as a concept map, not only a technical node-edge view.

Near-term target:

- emphasize concept/entity relationships
- let the user jump from a concept cluster into chat investigation


## 8. Agent Behaviors Needed

The current agent is good enough to answer questions, but Learning Vaults need a few stronger behaviors:

- concept-summary mode
- compare-definitions mode
- study-roadmap mode
- quiz mode
- clarifying-question mode when the user asks for a broad learning plan

The agent should treat a learning vault as a corpus to teach from, not just a search index.


## 9. Data and Graph Implications

Learning Vaults make some graph improvements especially valuable:

- concept extraction should be more explicit
- recurring terms should be treated as first-class anchors
- definitions should be linked to concepts
- source-to-concept edges should become easier to inspect
- overview memory should store:
  - key concepts
  - competing definitions
  - prerequisite topics
  - suggested next questions


## 10. Near-Term Implementation Plan

### Phase 1: Make the current app good for manual learning vaults

- improve vault overview for concept-heavy corpora
- tune entity and tag extraction toward concepts and definitions
- add learning-oriented prompt suggestions in chat
- make document inspector better for source comparison
- make contradiction/support language suitable for conceptual disagreement, not only factual conflict

### Phase 2: Add source capture workflows

- add YouTube transcript import
- add article URL import
- add "add note" and "paste transcript" shortcuts from the UI
- add source-type labels that distinguish notes, papers, transcripts, and images

### Phase 3: Add learning-specific outputs

- concept map view
- study roadmap output
- quiz mode
- missing-topics suggestions


## 11. Acceptance Criteria

We should consider the Learning Vault track useful when a user can:

- build a vault for one topic from mixed sources
- ask for a topic overview and get a coherent answer
- compare at least two sources meaningfully
- get readable source-backed citations
- receive useful next questions or study prompts
- feel that the vault has become a topic map, not a bag of files


## 12. Immediate Next Steps

The best next implementation slices for this track are:

1. Add a vault type or template for learning-oriented projects.
2. Add learning-specific starter prompts in dashboard and chat.
3. Tune overview generation toward concepts, definitions, and disagreements.
4. Add a lightweight "add note" flow so a user can build a learning vault without only relying on file uploads.
5. Plan URL ingestion for YouTube and article sources after the manual/local path feels good.
