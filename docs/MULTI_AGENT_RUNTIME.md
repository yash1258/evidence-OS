# Multi-Agent Runtime

## Goal

Make the app more parallel, modular, and robust without turning it into an ungrounded swarm.

The runtime now uses a bounded architecture:

- Gemini Flash 3 remains the orchestrator and final synthesizer
- OpenRouter is used for parallel worker analysis
- local tool calls remain the ground-truth evidence layer

## Why This Design

The previous runtime had one loop doing everything:

- planning
- tool calling
- evidence gathering
- synthesis
- retry / fallback behavior

That made it simple, but brittle:

- broad project questions could loop on the same tool
- all analysis quality depended on one model path
- there was no parallelism
- worker-style analysis could not be isolated or swapped cleanly

## Current Runtime

### 1. Trigger

The parallel path activates for project-scope / investigation-style prompts such as:

- whole project / whole vault questions
- bird's-eye overviews
- deep investigations
- contradiction / risk analysis
- cross-document comparisons

Simple prompts still fall back to the existing single-agent loop.

### 2. Grounded Evidence Gathering

Before any worker model runs, the app gathers evidence deterministically through local tools:

- `summarize_project`
- `search_knowledge_base`
- `find_contradictions`

This keeps the worker layer grounded in the vault state rather than letting workers invent their own retrieval flow.

### 3. Parallel OpenRouter Workers

Three worker roles run in parallel:

- `Context Mapper`
  - extracts themes, actors, evidence clusters
- `Risk Auditor`
  - surfaces contradictions, weak points, support signals, gaps
- `Next-Step Planner`
  - proposes follow-up questions and source priorities

These workers do not call tools. They only analyze the evidence packet they are given.

Workers are bounded by a runtime timeout so one slow OpenRouter call does not block the whole answer indefinitely.

### 4. Gemini Synthesis

Gemini Flash 3 then synthesizes:

- gathered evidence
- worker outputs
- source filenames / labels

into the final user-facing answer.

### 5. Fallback

If the parallel runtime fails:

- the app records the failure in the trace
- falls back to the existing single-agent ReAct loop

If every worker fails or times out:

- the app records that health failure in the trace
- skips parallel synthesis
- falls back to the single-agent loop

This preserves reliability while still unlocking parallel worker passes when available.

## Why This Is More Robust

This is more robust than a free-form multi-agent swarm because:

- retrieval is still local and deterministic
- workers are bounded and stateless
- one orchestrator owns the final answer
- workers can fail independently
- the old loop remains available as fallback
- the chat trace now shows whether a response used the single or parallel path

## Current Limitations

- worker routing is still heuristic, not learned
- the worker evidence packet is intentionally compact, so long-document deep reading still relies on the main loop
- tool-side analyses like `analyze_content` / `compare_documents` still use the primary provider path
- worker models are configurable, but the default is currently a single OpenRouter model family

## Next Improvements

- add worker-specific structured outputs with stricter validation
- add file-level deep-read workers for long PDFs / transcripts
- route more query types through the modular path
- expose worker model selection in settings
- persist worker outputs as investigation artifacts for later inspection
