# Bullet Journal Utilities

The plugin supports a Bullet Journal workflow in an Obsidian vault while keeping journal navigation and task history close to the notes themselves.

## Language

**Daily note**:
A journal note representing one calendar day.
_Avoid_: Day note, diary

**Monthly note**:
A journal note representing one calendar month.
_Avoid_: Month note

**Future log**:
An annual journal note holding tasks scheduled beyond the current concrete daily or monthly collection.
_Avoid_: Future note

**Semester note**:
A journal note for a Spring (February–August) or Fall (September–the following January) overview. A Fall note is named for its starting year.
_Avoid_: Term note

**Task subtree**:
An incomplete Markdown task together with its contiguous, more deeply indented child content.
_Avoid_: Task block

**Migration**:
Transferring a task subtree forward to another daily or monthly note while marking the source task with the `>` status. Planning a monthly task for a day is not a migration.
_Avoid_: Move

**Scheduling**:
Copying a task subtree to the annual future log while marking the source task with the `<` status.

**Daily planning**:
Copying an open monthly task into a daily note as an execution instance while keeping the monthly task open as the month's backlog entry.
_Avoid_: Pull, migration

**Semester planning**:
Copying an open semester task into a daily or monthly note while keeping the semester task open as the semester's overview entry.
_Avoid_: Semester migration

**Execution instance**:
A daily task copy representing an intention to work on its monthly source task on that date. It may later be completed, left open, or migrated to another daily note.
_Avoid_: Main task, task owner

**Migration chain**:
The sequence of task copies in which each copy links back to its immediate source.

**Journal operation record**:
A durable account of one completed migration, scheduling, or daily-planning operation, kept in latest-first order so the operation can be safely reversed after a restart.
_Avoid_: Migration record

**Migration reversal**:
Restoring the source task to its exact pre-operation state and removing its unchanged destination copy. Reversals proceed from the latest journal operation record backwards.
_Avoid_: File undo

**Journal navigator**:
A virtual calendar shown at the bottom of journal editors for opening daily, monthly, semester, and annual future notes without adding calendar content to Markdown.
_Avoid_: Calendar block
