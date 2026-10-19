---
name: commit-message
description: Suggest a copyable Conventional Commit message from the current chat context and Git diff. Use when a developer wants a commit message; never stage, commit, amend, or push.
---

# Commit Message

Draft a commit message only. This is a standalone utility: no GitHub issue, plan, review, or development workflow is required. Never modify files or the Git index, stage, commit, amend, push, or run tests just to write the message.

## Read the intended changes

1. Resolve the repository from the working directory or explicit user input; ask if ambiguous. Follow applicable repository instructions.
2. Inspect `git status --short`. Honor an explicitly requested file/diff scope. Otherwise use the full staged diff (`git diff --cached`) when present; if nothing is staged, use the full tracked working-tree diff (`git diff`). For partially staged files, describe only the selected hunks. Do not substitute the entire branch history for the next commit's changes.
3. Use the current chat to understand why the change exists, but use the selected diff as evidence of what is actually implemented. Read nearby code or recent commit subjects only when needed for meaning or repository conventions. Do not claim planned work, unrelated changes, or unverified test results.
4. Untracked files are not included in those diffs. Inspect only files explicitly requested or clearly part of the described work; ask when their inclusion is unclear, and do not read credential files. If no relevant changes exist, say so instead of inventing a message. If several unrelated changes make the intended commit ambiguous, ask what should be included.

## Write the message

Use `type(scope): imperative summary`, omitting the scope when it adds no clarity. Choose the type that describes the actual change, such as `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`. Keep the subject concise, preferably under 72 characters, with no trailing period. Add a blank line and a short body only when the reason or important behavior needs explanation. Use `!` and a `BREAKING CHANGE:` footer only for a verified breaking change. Do not invent issue references.

Return one suggested message in a single fenced `text` block, ready to copy and paste. The block contains only the commit subject and optional body/footer, without a heading, shell command, or surrounding quotation marks. Outside the block, briefly identify the diff used (staged, unstaged, or explicitly selected) and any material exclusions. The developer chooses the message and performs the commit.
