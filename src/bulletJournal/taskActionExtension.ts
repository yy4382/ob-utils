import { Decoration, DecorationSet, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import { editorInfoField, setIcon } from "obsidian";
import type ObUtilsPlugin from "../main";
import { createJournalLocator, validateJournalFormats } from "./journalLocator";
import { openMigrationMenu } from "./migrationCommands";

export function createTaskActionExtension(plugin: ObUtilsPlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = buildDecorations(plugin, view);
			}

			update(update: { view: EditorView; docChanged: boolean }): void {
				if (update.docChanged) {
					this.decorations = buildDecorations(plugin, update.view);
				}
			}
		},
		{ decorations: (value) => value.decorations },
	);
}

function buildDecorations(plugin: ObUtilsPlugin, view: EditorView): DecorationSet {
	const info = view.state.field(editorInfoField);
	const file = info.file;
	if (
		!file ||
		!info.editor ||
		!hasValidFormats(plugin) ||
		!getLocator(plugin).classify(file.path)
	) {
		return Decoration.none;
	}

	const ranges = [];
	let insideFence = false;
	for (let lineNumber = 1; lineNumber <= view.state.doc.lines; lineNumber += 1) {
		const line = view.state.doc.line(lineNumber);
		const text = line.text;
		if (/^\s*(```|~~~)/.test(text)) {
			insideFence = !insideFence;
			continue;
		}
		if (insideFence || !/^\s*- \[ \] /.test(text)) continue;

		ranges.push(
			Decoration.widget({
				widget: new TaskActionWidget(plugin, lineNumber - 1),
				side: 1,
			}).range(line.to),
		);
	}
	return Decoration.set(ranges);
}

class TaskActionWidget extends WidgetType {
	constructor(
		private readonly plugin: ObUtilsPlugin,
		private readonly taskLine: number,
	) {
		super();
	}

	eq(other: TaskActionWidget): boolean {
		return other.plugin === this.plugin && other.taskLine === this.taskLine;
	}

	toDOM(view: EditorView): HTMLElement {
		const button = createEl("button");
		button.type = "button";
		button.className = "bujo-migrate-action clickable-icon";
		button.setAttribute("aria-label", "Open task actions");
		setIcon(button, "ellipsis");
		button.addEventListener("mousedown", (event) => event.preventDefault());
		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const info = view.state.field(editorInfoField);
			if (!info.editor) return;
			openMigrationMenu(this.plugin, info.editor, info, this.taskLine, event);
		});
		return button;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

function getLocator(plugin: ObUtilsPlugin) {
	return createJournalLocator({
		daily: plugin.settings.dailyNoteFormat,
		monthly: plugin.settings.monthlyNoteFormat,
		future: plugin.settings.futureLogFormat,
		semesterSpring: plugin.settings.springSemesterFormat,
		semesterFall: plugin.settings.fallSemesterFormat,
	});
}

function hasValidFormats(plugin: ObUtilsPlugin): boolean {
	return validateJournalFormats({
		daily: plugin.settings.dailyNoteFormat,
		monthly: plugin.settings.monthlyNoteFormat,
		future: plugin.settings.futureLogFormat,
		semesterSpring: plugin.settings.springSemesterFormat,
		semesterFall: plugin.settings.fallSemesterFormat,
	}) === null;
}
