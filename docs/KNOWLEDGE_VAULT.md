# Knowledge Vault Command Center

This document defines what the `Knowledge Vault` top-level product surface should become.

It should not be a duplicate of the dashboard.

It should be the operational control center for the memory layer of EvidenceOS:

- all vaults
- their contents
- their health
- their freshness
- their source mix
- the actions a user can take on them


## 1. Product Role

The `Knowledge Vault` page is the place where a user manages the structure of their knowledge system.

If `Home` is the overview surface and `Chat` is the investigation surface, `Knowledge Vault` should be the control surface.

It should answer:

- what vaults do I have?
- what is inside each vault?
- which vault is stale, incomplete, or active?
- which vault should I open next?
- what sources can I add?
- what needs refresh or cleanup?


## 2. What It Is Not

The page should not be:

- another dashboard clone
- only a file upload page
- only a folder list
- only a graph shortcut page

It must make the vault layer itself legible and operable.


## 3. User Jobs

The user should be able to:

- create a vault
- rename a vault
- delete a vault
- open a vault in chat
- open a vault in graph view
- open vault contradictions
- browse vault files
- filter files by type
- import sources into a chosen vault
- see whether a vault is healthy and up to date
- understand what a vault is about before opening it


## 4. Page Structure

## 4.1 Top Command Bar

The top area should contain:

- search vaults
- create vault
- upload file
- import URL
- optional filters for:
  - all vaults
  - stale vaults
  - active vaults
  - ingestion issues

This should feel like a command bar, not a marketing hero.


## 4.2 Vault Registry

The main area should list all vaults as first-class objects.

Each vault card or row should show:

- vault name
- short overview
- source counts by modality
  - documents
  - audio
  - images
  - imported URLs later
- chunk count
- graph node or edge scale if useful
- last updated timestamp
- overview freshness
- quick actions

The user should be able to scan this list and immediately understand the state of their knowledge system.


## 4.3 Selected Vault Detail

When a vault is selected, the page should show a detail area or a focused lower section with:

- vault summary
- key themes
- top entities
- recent investigations
- unresolved questions
- source list
- ingestion status

This is where the user should feel the vault become concrete.


## 4.4 Source Browser

The selected vault should expose a clean file/source browser with:

- source name
- source type
- status
- short summary
- quick actions

Filters should include:

- all
- papers/docs
- notes
- transcripts
- images
- audio
- imported URLs

Near-term, this can reuse the current file row language from the context sidebar.


## 5. Core Signals

The command center should surface a few key signals clearly.

### 5.1 Freshness

- overview fresh
- overview stale
- recently ingested

### 5.2 Health

- fully indexed
- processing
- failed imports
- partial ingest issues later

### 5.3 Scope

- number of sources
- number of chunks
- modality mix
- whether the vault looks narrow, broad, or sparse

### 5.4 Intelligence

- top themes
- important entities
- follow-up questions
- contradiction/support counts


## 6. Quick Actions

Each vault should support fast actions:

- open chat
- open graph
- open contradictions
- inspect files
- refresh overview
- upload file
- import URL
- rename
- delete

These should be visible without making the UI noisy.


## 7. Relationship to Other Product Surfaces

The `Knowledge Vault` page should sit between `Home` and `Chat`.

- `Home`
  - broad product summary
  - recent activity
  - suggestions

- `Knowledge Vault`
  - vault management
  - vault inspection
  - vault operations

- `Chat`
  - reasoning and investigation

- `Graph`
  - relationship exploration

This separation gives the app a cleaner mental model.


## 8. Visual Direction

The page should feel:

- serious
- operational
- information-dense but calm
- consistent with the existing shell

It should preserve:

- the dark global nav
- the typography system
- the orange emphasis language
- the rounded card language

It should avoid:

- feeling like a generic admin CRUD table
- feeling like a second dashboard hero page


## 9. V1 Scope

The first real version of `Knowledge Vault` should include:

- dedicated `/vaults` route
- vault list/grid
- per-vault stats
- overview excerpt
- freshness state
- quick open actions
- create vault
- upload file
- import URL
- selected-vault file browser

That is enough to justify the nav item and remove the current redundancy.


## 10. Later Enhancements

After V1, the page can grow into:

- bulk source operations
- vault-level timeline view
- ingestion retry controls
- archived vaults
- vault templates
- concept-map preview for learning vaults
- health diagnostics for broken imports or stale embeddings


## 11. Acceptance Criteria

We should consider this surface successful when a user can:

- understand all vaults at a glance
- identify which vault needs attention
- open the right vault quickly
- add more material without leaving the page
- manage vaults confidently
- feel that EvidenceOS has a real project-memory layer, not just scattered pages


## 12. Immediate Implementation Order

The right order for building this page is:

1. define `/vaults` as a dedicated route
2. move the nav item away from `/dashboard`
3. show live vault registry cards
4. add selected-vault file/source browser
5. add rename/delete/refresh actions
6. refine health and freshness signals
