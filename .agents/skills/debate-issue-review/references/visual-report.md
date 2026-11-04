# Visual debate report

Read this after the Markdown report has been saved. Create one visual from that
report. Rendering is best-effort. Keep the complete Markdown available if the
host cannot render the preferred format.

## Choose the renderer

Use the first supported option. Tool availability and the active host matter.
A skill file on disk alone does not prove that its renderer works here.

| Host capability | Output |
| --- | --- |
| Active Cursor host with canvas support and `~/.cursor/skills-cursor/canvas/SKILL.md` | Cursor canvas |
| Available Artifact tool that can create a private report | One HTML Artifact |
| Otherwise | Self-contained `report.html` in the debate run directory |

Do not write a Cursor canvas for Codex or an unknown host. Do not invent a tool,
Artifact URL, or canvas location. If a renderer fails, try local HTML. If that
also fails, return the Markdown and the rendering limitation.

### Cursor canvas

Read and follow `~/.cursor/skills-cursor/canvas/SKILL.md` before writing the canvas.
Resolve the current workspace's canvas directory using those instructions.
Do not guess a username, workspace identifier, or project path.

Write one descriptive `.canvas.tsx` file there. Import only from `cursor/canvas`
and default-export one component. Embed report data inline. No network requests.
Use `useHostTheme()` tokens for custom colors. Keep the layout plain, without
emoji, gradients, or box shadows. Link the saved Markdown as the complete evidence
record. If the host contract differs, follow its supported API and report any
material limitation rather than writing an unusable canvas.

### Artifact

Follow the actual tool's quickstart and access contract. Create one private HTML
page. Do not share it externally or change visibility automatically. If private
creation is unavailable or would need additional publication permission, use local
HTML instead. Record the tool-returned URL, not a guessed URL.

### Local HTML

Write `report.html` beside `debate.md` in the same run directory. It must open
from disk without a server or external dependencies:

- One file with inline CSS and optional JavaScript. No CDN, remote font, or fetch.
- Color tokens on `:root`, a dark variant under `prefers-color-scheme`, and an
  explicit page background. Use readable contrast, semantic headings, and tables.
- Wrap wide tables in `overflow-x: auto`. A narrow viewport must not cause the
  whole page to scroll sideways. Any filters must work with keyboard input.
- Treat review text as data. Escape HTML special characters. Do not insert raw
  review Markdown as HTML or concatenate untrusted text into executable scripts.
- Render readable findings without JavaScript. Add filters only when useful.

## Shared content and layout

1. Header: comparison/issue, source review files, original/current revisions, and
   model label. Link to the complete Markdown report.
2. Counts: action categories and probes passed, failed, not run, and blocked.
   Count duplicate findings and probe executions consistently. No implied pass
   for probes that were skipped or blocked.
3. Important disagreements or merge implications, when supported by evidence.
4. Grouped tables: fix now, follow-ups, rejected/uncertain/optional claims, and
   already-addressed items. Material praise is optional. Omit empty groups.
5. Short next actions and unresolved developer decisions.

Use the main skill's exact finding columns. Every row must retain the original
ID/source and explain why the claim is accepted, rejected, or unresolved. A
`fix-later` row includes the deferral reason. A duplicate links its surviving ID.
Use the same content as Markdown, even when grouping or filtering it differently.

## Verify and deliver

Check that every Markdown finding is represented, category/probe counts agree,
and evidence links resolve where the renderer supports them. Use the host's
preview when available to inspect readability, narrow widths, and theme behavior.
Do not claim visual verification from source inspection alone.

If preview is unavailable, check the artifact structure and say that rendering
was not previewed. Return an absolute local file link or the actual private
Artifact URL, alongside the absolute Markdown path. Do not publish or send the
report to others as part of rendering it.
