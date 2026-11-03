# Bullet Journal utilities

Status: Implemented and verified in the repository test vault

This document captures the agreed product behavior for task movement, daily planning, and journal navigation. It deliberately separates settled behavior from decisions that still need grilling.

## Journal notes

The plugin recognizes journal notes from strict, vault-relative Moment path templates configured in settings:

- Daily note: `[Daily]/YYYY-MM-DD`
- Monthly note: `YYYY-MM`
- Future log: `YYYY`
- Spring semester: `YYYY [Spring]`
- Fall semester: `YYYY [Fall]`

The `.md` extension is implicit. Moment literals must use square brackets, so `[Daily]` formats as the folder name `Daily` rather than date tokens. Daily notes live under `Daily/`; monthly, semester, and annual future logs live at the vault root. Spring covers February–August. Fall covers September–the following January; January 2027 belongs to `2026 Fall`. Matching is strict and anchored to the complete path so similarly named notes elsewhere do not qualify.

Settings validate that each format can round-trip a representative date and that the formats do not resolve to the same path for that date. An invalid or ambiguous format disables both Bullet Journal features and shows an inline settings error rather than guessing which note type a file represents.

The plugin never creates journal notes. A destination that does not exist remains visible but disabled, with a short explanation.

## Task operations

### Eligibility

Task controls appear only beside incomplete Markdown tasks (`- [ ]`) in recognized journal notes. They do not appear for completed tasks, custom task statuses, ordinary bullets, code blocks, block quotes, or callouts.

The operation unit is the root task plus its contiguous, more deeply indented content. This includes continuation paragraphs, nested lists, nested tasks, images, and indented code. It ends at the first non-blank line whose indentation is not deeper than the root task. Trailing blank lines are not part of the task subtree.

### Destinations

For daily and future-log tasks, the task action menu offers:

- Move to today
- Move to this month
- Schedule in the current year's future log
- Choose a date
- Choose a month

For monthly tasks, **Move to today** and **Choose a date** become **Plan for today** and **Choose a day to plan**. Planning creates a dated execution instance without transferring the monthly task out of the monthly backlog.

Semester tasks can be planned into daily or monthly notes. The semester source remains open. Tasks from other journal notes can migrate to an existing semester note, marking their source as migrated (`>`). The menu and commands include the current semester and a picker for existing semester notes.

Today, this month, and the task menu's future log use the device's current local date and year. Date and month pickers initially show the current month. Only existing destination notes can be selected. An action that would target the source file is disabled.

The copied task subtree is appended to the end of the destination note. Its root returns to the incomplete status (`- [ ]`).

### Operation semantics and source status

The source status follows Bullet Journal semantics:

- Migration to a later daily or monthly note changes the source root to `- [>]`.
- Scheduling in an annual Future Log changes the source root to `- [<]`.
- Planning a monthly task for a daily note leaves the monthly source at `- [ ]`. The daily copy is an execution instance for that day; the monthly task remains the month's backlog entry.
- Planning a semester task for a daily or monthly note leaves the semester source at `- [ ]`.

In particular, moving a task to a monthly note is migration (`>`), not Future Log scheduling (`<`). The Minimal theme provides the visual treatment for these custom statuses.

The source root receives a block ID if it does not already have one. The copied root does not retain that ID; instead, it receives a compact return link using `↩`:

```md
[[Daily/2026-09-21#^bujo-a1b2c3|↩]]
```

Each copy links only to its immediate source, forming a migration chain. Existing block IDs and links inside descendant content are preserved verbatim.

Return links are generated with Obsidian's public `FileManager.generateMarkdownLink()` API so they follow the vault's Wikilink or Markdown-link preference and its path-resolution rules.

When an already-migrated daily execution instance is migrated again, its source line retains the previous plugin-generated return link. The new destination copy removes that previous return link before adding a link to its immediate source. The monthly backlog entry remains open. Unrelated user-authored links are never removed.

### Interaction

One trailing action icon opens the task menu. On desktop it appears when the task is hovered, focused, or has an open menu, similar to a compact comment affordance. On touch devices it remains subtly visible with a touch-sized hit target; task operations never depend on long press.

The task controls support Live Preview, Source mode, phones, and tablets. Reading view is out of scope.

The same actions are registered as stable editor commands for keyboard use and optional placement in Obsidian's mobile toolbar:

- Migrate current task to today
- Plan monthly task for today
- Migrate current task to this month
- Schedule current task in this year's future log
- Choose a daily migration target
- Choose a day for monthly task
- Choose a monthly migration target
- Undo last task operation

## Reversal

The plugin keeps at most 100 completed journal-operation records in a persistent, last-in-first-out undo stack. The **Undo last task operation** command remains available after Obsidian restarts. Arbitrary out-of-order reversal is not supported.

A reversal permits unrelated edits elsewhere in either note. It refuses to proceed if the source task status or destination task subtree no longer matches the completed operation record.

On success, reversal removes the destination copy and restores the source root to its exact pre-operation line. For migration and scheduling this is normally `- [ ]`; for daily planning it is the still-open monthly task. A source block ID generated by the operation is removed only when Obsidian's metadata plus all open editor buffers show no other reference to that exact block. If the check is inconclusive, the ID remains.

Cross-note writes use best-effort compensation rather than a durable transaction journal. A completed operation is recorded only after both note edits succeed. If saving the undo record fails, the operation remains successful and the plugin reports that it cannot be undone through the plugin. If one note edit fails, the plugin attempts one immediate compensation and otherwise reports the inconsistent state for manual repair.

There is no redo stack. Renames observed while the plugin is loaded update stored file paths. If a record cannot identify both notes and exact task content after an external rename, deletion, sync conflict, or concurrent device edit, reversal refuses safely instead of searching and changing a plausible match. Undo history stored in plugin data may follow the user's vault-configuration sync settings, but cross-device ordering has no stronger guarantee than the synced notes themselves.

## Journal navigator

A virtual navigator is rendered after the document in recognized journal editors without adding Markdown content. It contains:

- A month grid
- Previous and next month controls
- A Today control
- A link to the displayed month's monthly note
- A link to the displayed month's semester note
- A link to the displayed year's future log

It initially displays the open daily/monthly note's month, the first month of an open semester, or the current month within the open annual future log. Existing notes are actionable; missing notes remain visible but disabled. Clicking opens a note in the current tab. `Cmd`/`Ctrl`-click opens it in a new tab. Reading view is not supported.

Today's date uses a filled accent circle. The date of the open daily note uses a separate accent ring; both markers appear together when that note is today. The open monthly, semester, or future note is marked in the link row. Desktop hover has a short scale/color transition, disabled for reduced-motion preferences and touch pointers.

Weekday names and the first day of the week follow Obsidian's current Moment locale. Days outside the displayed month remain visible in a muted style and link to an existing daily note when present.

The navigator uses a centered, compact calendar rhythm rather than filling the editor width: approximately `21rem` on desktop, with a symmetrical previous-month/title/next-month header. It is separated from the note only by whitespace, without a decorative rule, border, or card shadow. Empty and short notes receive enough internal space to place the navigator around eight text lines below the start of the document; longer notes keep a smaller three-line separation from their final content. Spacing is implemented inside the widget because Obsidian and themes may force CodeMirror block margins to zero. Mobile expands the calendar to at most `23rem` and gives every day a `40×40px` touch target.

## Verification direction

A repository-owned test vault will cover functional and visual verification. It will use the current Minimal theme and exercise desktop editing, Live Preview, Source mode, and mobile emulation. Generated plugin artifacts, workspace state, caches, and downloaded third-party artifacts will not be committed.

The repository test vault uses Minimal and is exercised through the guarded Obsidian CLI wrapper. The CLI reloads the plugin, inspects DOM and CSS, executes commands, collects console errors, emulates mobile, and captures desktop screenshots. Pure parsing, path matching, migration planning, and reversal checks also have automated unit tests that do not require Obsidian.

## Implementation constraints

Prefer public Obsidian APIs whenever they provide the required behavior:

- Import `moment` from `obsidian` for path formatting and strict parsing.
- Register CodeMirror extensions through `Plugin.registerEditorExtension()`.
- Generate return links through `FileManager.generateMarkdownLink()`.
- Modify closed notes through `Vault.process()` and open notes through their editor abstraction where possible.
- Open notes through workspace APIs rather than manually constructing URIs.

Private or undocumented Obsidian internals are not part of the planned implementation. Any later exception requires an explicit compatibility rationale and dedicated verification.

## Out of scope

- Creating missing daily, monthly, or future notes
- Reading view integration
- Task statistics in the journal navigator
- A migration-history browser
- Arbitrary out-of-order reversal
- Durable recovery for process termination between cross-note writes
- Plugin-specific styling for Minimal custom task statuses
