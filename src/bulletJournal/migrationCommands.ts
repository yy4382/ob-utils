import {
	Editor,
	FuzzySuggestModal,
	MarkdownView,
	MarkdownFileInfo,
	Menu,
	moment,
	TFile,
} from "obsidian";
import type ObUtilsPlugin from "../main";
import {
	createJournalLocator,
	JournalKind,
	JournalNoteReference,
	validateJournalFormats,
} from "./journalLocator";
import { migrateTask, undoLastMigration } from "./migrationOperations";

type ConcreteTargetKind = Extract<JournalKind, "daily" | "monthly" | "semester">;
type SourceKind = JournalKind;

const NON_MONTHLY_SOURCE_KINDS: readonly SourceKind[] = ["daily", "future"];
const MONTHLY_SOURCE_KINDS: readonly SourceKind[] = ["monthly"];
const SEMESTER_SOURCE_KINDS: readonly SourceKind[] = ["semester"];
const ALL_SOURCE_KINDS: readonly SourceKind[] = ["daily", "monthly", "future", "semester"];

export function registerMigrationCommands(plugin: ObUtilsPlugin): void {
	registerImmediateMigrationCommand(
		plugin,
		"migrate-current-task-to-today",
		"Migrate current task to today",
		"daily",
		NON_MONTHLY_SOURCE_KINDS,
	);
	registerImmediateMigrationCommand(
		plugin,
		"plan-monthly-task-for-today",
		"Plan monthly task for today",
		"daily",
		MONTHLY_SOURCE_KINDS,
	);
	registerImmediateMigrationCommand(plugin, "plan-semester-task-for-today", "Plan semester task for today", "daily", SEMESTER_SOURCE_KINDS);
	registerImmediateMigrationCommand(plugin, "plan-semester-task-for-this-month", "Plan semester task for this month", "monthly", SEMESTER_SOURCE_KINDS);
	registerImmediateMigrationCommand(
		plugin,
		"migrate-current-task-to-this-month",
		"Migrate current task to this month",
		"monthly",
		["daily", "monthly", "future"],
	);
	registerImmediateMigrationCommand(plugin, "migrate-current-task-to-this-semester", "Migrate current task to this semester", "semester", ALL_SOURCE_KINDS);
	registerImmediateMigrationCommand(
		plugin,
		"schedule-current-task-in-future-log",
		"Schedule current task in this year's future log",
		"future",
		ALL_SOURCE_KINDS,
	);

	registerPickerCommand(
		plugin,
		"choose-daily-migration-target",
		"Choose a daily migration target",
		"daily",
		NON_MONTHLY_SOURCE_KINDS,
	);
	registerPickerCommand(
		plugin,
		"choose-daily-planning-target",
		"Choose a day for monthly task",
		"daily",
		MONTHLY_SOURCE_KINDS,
	);
	registerPickerCommand(plugin, "choose-day-for-semester-task", "Choose a day for semester task", "daily", SEMESTER_SOURCE_KINDS);
	registerPickerCommand(plugin, "choose-month-for-semester-task", "Choose a month for semester task", "monthly", SEMESTER_SOURCE_KINDS);
	registerPickerCommand(
		plugin,
		"choose-monthly-migration-target",
		"Choose a monthly migration target",
		"monthly",
		["daily", "monthly", "future"],
	);
	registerPickerCommand(plugin, "choose-semester-migration-target", "Choose a semester migration target", "semester", ALL_SOURCE_KINDS);

	plugin.addCommand({
		id: "undo-last-task-migration",
		name: "Undo last task operation",
		checkCallback: (checking) => {
			if (plugin.settings.migrationHistory.length === 0) return false;
			if (!checking) void undoLastMigration(plugin);
			return true;
		},
	});

	plugin.registerEvent(
		plugin.app.vault.on("rename", (file, oldPath) => {
			for (const record of plugin.settings.migrationHistory) {
				if (record.sourcePath === oldPath) record.sourcePath = file.path;
				if (record.targetPath === oldPath) record.targetPath = file.path;
			}
			void plugin.saveSettings();
		}),
	);
}

export function openMigrationMenu(
	plugin: ObUtilsPlugin,
	editor: Editor,
	info: MarkdownFileInfo,
	taskLine: number,
	event: MouseEvent,
): void {
	const sourceFile = info.file;
	if (!sourceFile || !canMigrateLine(plugin, editor, sourceFile, taskLine)) return;
	const sourceKind = getLocator(plugin).classify(sourceFile.path)?.kind;
	if (!sourceKind) return;

	const menu = new Menu();
	const today = moment();
	addImmediateMenuItem(
		plugin,
		menu,
		editor,
		sourceFile,
		taskLine,
		sourceKind === "monthly" || sourceKind === "semester" ? "Plan for today" : "Move to today",
		"daily",
		today,
	);
	addImmediateMenuItem(plugin, menu, editor, sourceFile, taskLine, sourceKind === "semester" ? "Plan for this month" : "Move to this month", "monthly", today);
	addImmediateMenuItem(plugin, menu, editor, sourceFile, taskLine, "Move to this semester", "semester", today);
	addImmediateMenuItem(plugin, menu, editor, sourceFile, taskLine, "Schedule in future log", "future", today);
	menu.addSeparator();
	menu.addItem((item) =>
		item.setTitle(sourceKind === "monthly" || sourceKind === "semester" ? "Choose a day to plan…" : "Choose a date…").onClick(() => {
			new JournalTargetModal(plugin, "daily", (target) => {
				editor.setCursor({ line: taskLine, ch: 0 });
				void migrateTask(
					plugin,
					editor,
					sourceFile,
					target.kind,
					moment(target.path, `${plugin.settings.dailyNoteFormat}[.md]`, true),
				);
			}).open();
		}),
	);
	menu.addItem((item) =>
		item.setTitle(sourceKind === "semester" ? "Choose a month to plan…" : "Choose a month…").onClick(() => {
			new JournalTargetModal(plugin, "monthly", (target) => {
				editor.setCursor({ line: taskLine, ch: 0 });
				void migrateTask(
					plugin,
					editor,
					sourceFile,
					target.kind,
					moment(target.path, `${plugin.settings.monthlyNoteFormat}[.md]`, true),
				);
			}).open();
		}),
	);
	menu.addItem((item) =>
		item.setTitle("Choose a semester…").onClick(() => {
			new JournalTargetModal(plugin, "semester", (target) => {
				editor.setCursor({ line: taskLine, ch: 0 });
				void migrateTask(plugin, editor, sourceFile, "semester", dateForTarget(target));
			}).open();
		}),
	);
	menu.showAtMouseEvent(event);
}

function addImmediateMenuItem(
	plugin: ObUtilsPlugin,
	menu: Menu,
	editor: Editor,
	sourceFile: TFile,
	taskLine: number,
	title: string,
	targetKind: JournalKind,
	targetDate: ReturnType<typeof moment>,
): void {
	const targetPath = getLocator(plugin).pathFor(targetKind, targetDate.toDate());
	const target = plugin.app.vault.getAbstractFileByPath(targetPath);
	menu.addItem((item) => {
		item
			.setTitle(title)
			.setDisabled(!(target instanceof TFile) || target.path === sourceFile.path)
			.onClick(() => {
				editor.setCursor({ line: taskLine, ch: 0 });
				void migrateTask(plugin, editor, sourceFile, targetKind, targetDate);
			});
	});
}

function registerImmediateMigrationCommand(
	plugin: ObUtilsPlugin,
	id: string,
	name: string,
	targetKind: JournalKind,
	allowedSourceKinds: readonly SourceKind[],
): void {
	plugin.addCommand({
		id,
		name,
		editorCheckCallback: (checking, editor, context) => {
			if (
				!(context instanceof MarkdownView) ||
				!canMigrate(plugin, editor, context.file, allowedSourceKinds)
			) {
				return false;
			}
			if (!checking && context.file) {
				void migrateTask(plugin, editor, context.file, targetKind, moment());
			}
			return true;
		},
	});
}

function registerPickerCommand(
	plugin: ObUtilsPlugin,
	id: string,
	name: string,
	targetKind: ConcreteTargetKind,
	allowedSourceKinds: readonly SourceKind[],
): void {
	plugin.addCommand({
		id,
		name,
		editorCheckCallback: (checking, editor, context) => {
			if (
				!(context instanceof MarkdownView) ||
				!canMigrate(plugin, editor, context.file, allowedSourceKinds)
			) {
				return false;
			}
			if (!checking) {
				new JournalTargetModal(plugin, targetKind, (target) => {
					if (!context.file) return;
					void migrateTask(plugin, editor, context.file, target.kind, dateForTarget(target));
				}).open();
			}
			return true;
		},
	});
}

function canMigrate(
	plugin: ObUtilsPlugin,
	editor: Editor,
	file: TFile | null,
	allowedSourceKinds: readonly SourceKind[],
): boolean {
	if (!file || !hasValidFormats(plugin)) return false;
	const sourceKind = getLocator(plugin).classify(file.path)?.kind;
	if (!sourceKind || !allowedSourceKinds.includes(sourceKind)) return false;
	return /^\s*- \[ \] /.test(editor.getLine(editor.getCursor().line));
}

function canMigrateLine(
	plugin: ObUtilsPlugin,
	editor: Editor,
	file: TFile,
	taskLine: number,
): boolean {
	return hasValidFormats(plugin) && Boolean(getLocator(plugin).classify(file.path)) &&
		/^\s*- \[ \] /.test(editor.getLine(taskLine));
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

function dateForTarget(target: JournalNoteReference): ReturnType<typeof moment> {
	switch (target.kind) {
		case "daily":
			return moment({ year: target.year, month: target.month - 1, day: target.day });
		case "monthly":
			return moment({ year: target.year, month: target.month - 1, day: 1 });
		case "semester":
			return moment({ year: target.year, month: target.season === "Spring" ? 1 : 8, day: 1 });
		case "future":
			return moment({ year: target.year, month: 0, day: 1 });
	}
}

class JournalTargetModal extends FuzzySuggestModal<JournalNoteReference> {
	constructor(
		private readonly plugin: ObUtilsPlugin,
		private readonly targetKind: ConcreteTargetKind,
		private readonly choose: (target: JournalNoteReference) => void,
	) {
		super(plugin.app);
		this.setPlaceholder(`Choose an existing ${targetKind} note`);
	}

	getItems(): JournalNoteReference[] {
		const locator = getLocator(this.plugin);
		return this.plugin.app.vault
			.getMarkdownFiles()
			.map((file) => locator.classify(file.path))
			.filter(
				(reference): reference is JournalNoteReference =>
					reference?.kind === this.targetKind,
			)
			.sort((left, right) => right.path.localeCompare(left.path));
	}

	getItemText(item: JournalNoteReference): string {
		return item.path.replace(/\.md$/, "");
	}

	onChooseItem(item: JournalNoteReference): void {
		this.choose(item);
	}
}
