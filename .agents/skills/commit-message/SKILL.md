---
name: commit-message
description: Draft one copyable commit message from a selected Git diff. Default to staged changes and Conventional Commits or an established repository style. Use only when the user explicitly invokes commit-message. Never stage, commit, amend, or push.
---

# Commit Message

Use only when the user invokes `$commit-message`, `/commit-message`, or names this
skill and asks to use it. Draft one message for copying. This utility requires no
issue, plan, review, or lifecycle workflow, and does not activate one.

Never modify files or the Git index, stage, commit, amend, push, contact GitHub,
or run tests just to draft a message.

## Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `--repo` or `repo=<path-or-name>` | Unambiguous working repository | Select a repository in a multi-root workspace |
| `--unstaged` or `unstaged=true` | Off | Include staged, unstaged, and relevant untracked changes |
| `--conventional` or `conventional=true` | Off | Use Conventional Commits instead of detecting log style |

Examples: `$commit-message`, `$commit-message --unstaged`, or
`$commit-message --repo karlbruder_monorepo --conventional`.
An explicit user-selected diff or change scope takes precedence over these defaults.

## Resolve the repository and change scope

Resolve the repository before status, diff, or log inspection. Use an explicit
path/name or unambiguous working-directory/workspace context. In a multi-root
workspace, do not choose the first repository. Ask when ambiguous. Run all Git
commands with the selected repository as their working directory.

Inspect `git status --short` and changed filenames before reading diff contents.
Follow applicable repository instructions. Do not read credential files or print
secrets, tokens, private data, or `.env` values. If sensitive content prevents
complete inspection, report that limit instead of inventing its behavior.

### Default: staged only

Inspect the full selected staged diff with `git diff --cached`, not just its stat.
For partially staged files, describe only staged hunks. Do not include later edits
or untracked files merely because the chat mentions them.

If nothing is staged, stop. When unstaged or untracked work exists, suggest
`$commit-message --unstaged`. Do not silently change scope.

### With unstaged changes

Inspect staged and unstaged diffs, then assess their combined result. With an
existing HEAD, use `git diff HEAD` for the net tracked change. Do not concatenate
two diffs as if a staged edit and its unstaged reversal both survive. For an unborn
branch, inspect the index and working tree without assuming HEAD exists.

List untracked files using `git ls-files --others --exclude-standard`. Read only
files clearly relevant to the requested work and safe to inspect. Exclude generated
artifacts and credential files. Ask when intended inclusion is unclear. State any
material exclusions. Untracked files are not present in ordinary Git diffs.

If the selected combined result is empty, stop rather than drafting from changes
that cancel out.

## Establish intent and format

For any scope, ask which slice to name when unrelated intents make the commit
ambiguous. Do not silently choose a dominant intent or describe only part of a commit.

Use chat context to understand why. Use the selected diff and relevant untracked
content to establish what changed. Read nearby code only when needed to understand
behavior. Branch history is not a substitute for the next commit's diff.
Do not claim planned work, unselected files, or unverified test results.

Choose format in this order:

1. Follow the user's explicit format and applicable repository conventions.
2. If `--conventional` is set, use Conventional Commits instead of log detection.
3. Otherwise, when no format is prescribed, inspect up to 20 recent subjects with
   `git log -n 20 --format=%s`. Follow a clear majority house style. If the history
   is absent or mixed, use Conventional Commits.

A house style may use `[PLAT-123] ...`, `PLAT-123: ...`, or a stable template.
Preserve its punctuation and casing. Use a ticket only when established in the
user's context or verified branch/issue information. Never invent ticket keys or
closing references. Do not require an issue just because a style often includes one.

For Conventional Commits, use `type(scope): imperative summary`. Omit the scope
when it adds no clarity. Choose the actual change type, such as `feat`, `fix`,
`refactor`, `docs`, `test`, `perf`, or `chore`. Keep the subject concise, preferably
under 72 characters, without a trailing period. Use `!` or a `BREAKING CHANGE:`
footer only for an established compatibility break.

Add a blank line and a short body only when motivation, a meaningful boundary,
or non-obvious behavior needs explanation. Do not turn the body into a file list
or repeat the subject. Never put sensitive values in the message.

## Output

Return one short line naming the repository, selected scope, and format. State any
material exclusions or verification limitations. Then return one fenced `text`
block containing only the subject and optional body/footer, ready to copy.
Do not include shell commands, headings, or surrounding quotation marks inside
that block. The developer chooses the message and performs the commit.
