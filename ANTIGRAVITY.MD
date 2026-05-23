# 🚀 ANTIGRAVITY.MD — Antigravity CLI & Token Optimization Guidelines

> **Operational Protocol** for managing agent context, token usage, and terminal execution using the Antigravity CLI (`agy`) environment.
> Follow these instructions to optimize token limits and maintain clean sessions.

---

## 💻 1. Antigravity CLI Overview

The Antigravity CLI is invoked via the `agy` command. When running tasks inside the terminal, the agent must leverage the CLI's native slash commands to monitor and control context size and model limits.

### Primary Slash Commands
The agent should execute these commands directly in the prompt/terminal to check state:

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/usage` | Check current quota, token usage, and rate-limits. | Run this before heavy tasks, multi-step actions, or when encountering token warning indicators. |
| `/context` | Monitor current token breakdown (prompt, response, total) and manage history checkpoints. | Run this to see what is consuming context (e.g., loaded files, large diffs). |
| `/rewind` or `/undo` | Roll back conversation history to a clean checkpoint. | Run this to discard failed trials or bloated conversations and prevent token overflow. |
| `/permissions` | Manage permission policies (e.g., auto-approve commands/file edits). | Run this to streamline workflow when executing multiple safe shell operations. |
| `/agents` | Open panel to monitor status of active background subagents. | Run this when spawning background tasks or parallel execution threads. |

---

## ⚡ 2. Terminal Commands Protocol

When executing terminal commands within the interactive Antigravity CLI:
*   **Command Prefix:** Always prefix local terminal commands with `!` to run them directly on the system (e.g., `!git status`, `!npm run test`).
*   **Pager Control:** Commands are run with `PAGER=cat`. Limit verbose output of commands (e.g., use `git log -n 5` instead of `git log` to avoid consuming token quota with unnecessary history).

---

## 🛡️ 3. Token Conservation & Context Management

To prevent hitting the dynamic token quota/rate-limits:

### Strategy 1: Checkpoint Rewinding (`/rewind`)
*   If a plan fails or code generation goes off-track, do not continue the thread with corrections.
*   Instead, type `/rewind` or `/undo` to revert the conversation back to the last successful state. This completely prunes the failed token overhead from the context window.

### Strategy 2: Targeting File Contexts (`@` reference)
*   Do not load whole large files unless necessary.
*   In the CLI prompt, use the `@` prefix to target specific files and restrict the agent's attention to relevant modules only.
*   Limit single file edits to less than 500 lines when possible (refer to `CLAUDE.MD` file limits).

### Strategy 3: Command Output Optimization
*   Avoid commands that produce large logs or outputs (e.g., `npm list --all`, raw build dumps).
*   Redirect large command outputs to a temporary file in `scratch/` and inspect it incrementally if needed, rather than dumping it all into the terminal context.

---

*Last updated: 2026-05-23*
