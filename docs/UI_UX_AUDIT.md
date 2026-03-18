# EvidenceOS UI/UX Audit

## Purpose

This document tracks which visible controls in the current app are:

- fully live
- partially live
- placeholder/demo-only

It also records the intended connection path so the UI can become consistently operational without losing its current visual language.


## Audit Summary

The product shell is visually strong, but several controls still behave like mockups.

The current direction should be:

- keep the visual system
- reduce dead controls
- connect top-level navigation first
- connect investigation workflow controls second
- leave marketing-only landing-page actions as lower priority


## High-Priority App Controls

### Navigation

- `NavSidebar > Knowledge Vault`
  - Current: routed to `/dashboard`, redundant with `Home`
  - Desired: route to a dedicated vault command center page

- `NavSidebar > Graph Explorer`
  - Current: placeholder
  - Desired: route to a live graph explorer page

- `NavSidebar > Settings & Models`
  - Current: placeholder
  - Desired: route to a live settings/models page

- `ContextSidebar > Settings`
  - Current: placeholder
  - Desired: route to the same settings/models page


### Dashboard

- `Search OS`
  - Current: decorative
  - Desired: focus the main omnibar

- `Suggested prompts`
  - Current: mostly live
  - Desired: stay routed into chat with vault scope

- `View History`
  - Current: placeholder
  - Desired: route to chat/investigation workspace until a dedicated history screen exists

- `View Telemetry Logs`
  - Current: placeholder
  - Desired: route to graph/system explorer for now


### Chat

- `Knowledge Graph`
  - Current: placeholder
  - Desired: route to graph explorer scoped to the active vault

- `Paperclip`
  - Current: placeholder
  - Desired: open upload picker

- `Deep Search`
  - Current: placeholder label only
  - Desired: run a project-wide investigation version of the current prompt

- `Active vault guided prompts`
  - Current: partly live
  - Desired: remain wired to direct investigation runs


## Lower-Priority App Controls

### Chat / Context Sidebar

- file rows in `ContextSidebar`
  - Current: decorative
  - Desired later: open file-centric investigation actions

- message/citation UX
  - Current: functional but still sparse
  - Desired later: side-by-side contradictions, richer evidence traces, timeline hooks


## Landing Page Controls

These are less urgent than app workflow wiring.

- `Watch Architecture Demo`
- `Read Whitepaper`
- footer links: `Documentation`, `Github`, `Privacy`

These should eventually route somewhere real, but they are not on the critical path for making the application operational.


## First Wiring Tranche

This tranche should connect the controls with the highest app-level value:

1. create `/graph`
2. create `/settings`
3. connect nav/sidebar controls to those routes
4. connect dashboard `Search OS`, `View History`, `View Telemetry Logs`
5. connect chat `Knowledge Graph`, `Paperclip`, `Deep Search`


## Design Constraints

Any new live page should:

- reuse the existing dark sidebar shell
- preserve the current typography and spacing language
- feel like part of the same product
- prioritize clarity over density
- expose real data, not decorative filler


## Future Tranches

### Tranche 2

- dedicated investigations/history screen
- file-centric actions in the context sidebar
- richer graph neighborhood exploration
- dedicated knowledge vault command center

### Tranche 3

- contradiction comparison UI
- timeline UI
- source/evidence drilldown improvements

### Tranche 4

- landing-page action wiring
- docs/help surface
- privacy page and product docs entry points
