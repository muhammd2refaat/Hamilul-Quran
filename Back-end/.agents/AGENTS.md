# AI Agent Persona & Operational Guidelines

## Project Context: Hamilul-Quran Backend
When working in this specific repository, keep the following in mind:
* **Framework:** FastAPI with Python 3.12.
* **Database & ORM:** PostgreSQL using `asyncpg`, `SQLModel` for ORM, and `Alembic` for migrations.
* **Authentication:** JWT, `bcrypt`, Authlib, PyOTP (for 2FA).
* **Testing:** Pytest with `pytest-asyncio` for async tests.
* **Development Flow:** Use Uvicorn for local development (`./.venv/bin/uvicorn app.main:app --reload --port 8000`).
* **Migrations:** Use Alembic (`./.venv/bin/alembic upgrade head`).

## Tool Usage Strategy
* **Search:** Use `ctx_glob` to find files. Use `ctx_search` to find exact content or symbols. Avoid using bash `find` or `rg` directly when native tools are available.
* **Read:** Use `ctx_read` with appropriate mode (signatures|map|full) for large files to save context window. Parallelize multiple file reads.
* **Write:** Use `ctx_patch` or native `edit` tool to perform sequential replacements in a single turn. Ensure `old_str` uniquely identifies the block.
* **Terminal:** Use `ctx_shell` for testing, building, or ecosystem commands (`uvicorn`, `pytest`, `alembic`).

## Tone and Style
* Keep conversational text to an absolute minimum (under 100 words).
* Speak through actions and tool calls.
* State your intended plan briefly before executing complex tasks.
* Acknowledge system notifications briefly and continue working.

<!-- lean-ctx-rules -->
<!-- version: 5 -->

CRITICAL: ALWAYS use lean-ctx ctx_* tools instead of native equivalents. This is NOT optional.

MANDATORY MAPPING:
• Read/cat -> ctx_read(path, mode)
• Grep -> ctx_search(pattern, path)
• Shell/bash -> ctx_shell(command)
• Glob/find -> ctx_glob(pattern)
• ls/find -> ctx_tree(path, depth)

NEVER use native Read/Grep/Shell/Glob when a ctx_* equivalent exists. SELF-CORRECT: the moment you reach for one, stop and call the ctx_* tool instead.

Tool selection by intent:
• Orient / understand code (call FIRST) -> ctx_compose
• Read a file -> ctx_read(path, mode=signatures|map|full); edit after reading -> ctx_patch
• Exact symbol -> ctx_symbol; pattern -> ctx_search; by meaning -> ctx_semantic_search
• Files by glob -> ctx_glob; structure -> ctx_tree; callers/impact -> ctx_callgraph
• Verify after edits -> ctx_shell(test/build); memory -> ctx_session / ctx_knowledge
Semantic questions -> search tools, not whole-file reads: reading more ≠ understanding more.

Anti-patterns — do NOT:
• Chain ctx_search -> ctx_read -> ctx_symbol — one ctx_compose replaces all three
• Use ctx_read(mode=full) for orientation — use mode=signatures
• Use ctx_callgraph/ctx_graph for const/static/variable refs — they track call
edges and file deps only; use ctx_search instead

PARALLEL: fire independent tool calls in the SAME turn — ctx_compose bundles multiple lookups into one call.

RECOVER: compression is reversible — read the shown path (no MCP) or ctx_read(raw=true), never re-read line-by-line.
<!-- lean-ctx-compression -->
OUTPUT STYLE: concise
- Bullet points over paragraphs
- Skip filler words and hedging ("I think", "probably", "it seems")
- 1-sentence explanations max, then code/action
- No repeating what the user said
<!-- /lean-ctx-compression -->
<!-- /lean-ctx-rules -->
