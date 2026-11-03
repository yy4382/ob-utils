import { Editor, MarkdownView, moment, Notice, TFile } from "obsidian";
import type ObUtilsPlugin from "../main";
import { createJournalLocator, JournalKind } from "./journalLocator";
import {
	getTaskBlockId,
	MigrationRecord,
	planMigration,
	planReversal,
} from "./migrationPlanner";

export async function migrateTask(
	plugin: ObUtilsPlugin,
	editor: Editor,
	sourceFile: TFile,
	targetKind: JournalKind,
	targetDate: ReturnType<typeof moment>,
): Promise<void> {
	const locator = getLocator(plugin);
	const sourceReference = locator.classify(sourceFile.path);
	if (!sourceReference) {
		new Notice("The source note is not a configured journal note");
		return;
	}
	const targetPath = locator.pathFor(targetKind, targetDate.toDate());
	if (targetPath === sourceFile.path) {
		new Notice("The task is already in that journal note");
		return;
	}

	const targetFile = plugin.app.vault.getAbstractFileByPath(targetPath);
	if (!(targetFile instanceof TFile)) {
		new Notice(`Journal note does not exist: ${targetPath}`);
		return;
	}

	const sourceText = editor.getValue();
	const taskLine = editor.getCursor().line;
	const blockId = getTaskBlockId(sourceText, taskLine) ?? createBlockId();
	const returnLink = plugin.app.fileManager.generateMarkdownLink(
		sourceFile,
		targetPath,
		`#^${blockId}`,
		"↩",
	);
	const previousRecord = findPreviousMigration(
		plugin.settings.migrationHistory,
		sourceFile.path,
		editor.getLine(taskLine),
	);
	let targetText: string | undefined;
	let plan: ReturnType<typeof planMigration> | undefined;
	try {
		targetText = await readCurrentText(plugin, targetFile);
		plan = planMigration({
			sourcePath: sourceFile.path,
			sourceText,
			sourceKind: sourceReference.kind,
			taskLine,
			targetPath,
			targetText,
			targetKind,
			newBlockId: blockId,
			returnLink,
			previousReturnLink: previousRecord?.returnLink,
		});
		await writeCurrentText(plugin, targetFile, targetText, plan.targetText);
		editor.setValue(plan.sourceText);
	} catch (error) {
		if (typeof plan !== "undefined" && typeof targetText !== "undefined") {
			await compensateTarget(plugin, targetFile, plan.targetText, targetText);
		}
		new Notice(`Task operation failed: ${errorMessage(error)}`);
		return;
	}

	const previousHistory = plugin.settings.migrationHistory;
	plugin.settings.migrationHistory = [...previousHistory, plan.record].slice(-100);
	try {
		await plugin.saveSettings();
		new Notice(successMessage(plan.record.operation, targetPath));
	} catch {
		plugin.settings.migrationHistory = previousHistory;
		new Notice("Task operation completed, but its undo record could not be saved");
	}
}

export async function undoLastMigration(plugin: ObUtilsPlugin): Promise<void> {
	const record = plugin.settings.migrationHistory.at(-1);
	if (!record) return;

	const sourceFile = plugin.app.vault.getAbstractFileByPath(record.sourcePath);
	const targetFile = plugin.app.vault.getAbstractFileByPath(record.targetPath);
	if (!(sourceFile instanceof TFile) || !(targetFile instanceof TFile)) {
		new Notice("Cannot undo the task operation because a journal note is missing");
		return;
	}

	const sourceText = await readCurrentText(plugin, sourceFile);
	const targetText = await readCurrentText(plugin, targetFile);
	const hasOtherBlockReferences = record.generatedBlockId
		? await hasOtherReferences(plugin, record, targetText)
		: false;
	const plan = planReversal({
		record,
		sourceText,
		targetText,
		hasOtherBlockReferences,
	});
	if (!plan.ok) {
		const changedPart = plan.reason === "source-changed" ? "source task" : "target task";
		new Notice(`Cannot undo the task operation because the ${changedPart} changed`);
		return;
	}

	let targetWasChanged = false;
	try {
		await writeCurrentText(plugin, targetFile, targetText, plan.targetText);
		targetWasChanged = true;
		await writeCurrentText(plugin, sourceFile, sourceText, plan.sourceText);
	} catch (error) {
		if (targetWasChanged) {
			await compensateTarget(plugin, targetFile, plan.targetText, targetText);
		}
		new Notice(`Undo failed: ${errorMessage(error)}`);
		return;
	}

	plugin.settings.migrationHistory.pop();
	try {
		await plugin.saveSettings();
		new Notice("Last task operation undone");
	} catch {
		plugin.settings.migrationHistory.push(record);
		new Notice("Task operation was undone, but the undo history could not be saved");
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

function findPreviousMigration(
	records: MigrationRecord[],
	sourcePath: string,
	currentLine: string,
): MigrationRecord | undefined {
	for (let index = records.length - 1; index >= 0; index -= 1) {
		const record = records[index];
		if (!record || record.targetPath !== sourcePath) continue;
		if (currentLine.endsWith(` ${record.returnLink}`)) return record;
	}
	return undefined;
}

function createBlockId(): string {
	return `bujo-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

async function compensateTarget(
	plugin: ObUtilsPlugin,
	file: TFile,
	expectedText: string,
	restoredText: string,
): Promise<void> {
	try {
		await writeCurrentText(plugin, file, expectedText, restoredText);
	} catch {
		new Notice("Automatic repair failed; check both journal notes manually");
	}
}

async function readCurrentText(plugin: ObUtilsPlugin, file: TFile): Promise<string> {
	return getOpenView(plugin, file)?.editor.getValue() ?? plugin.app.vault.cachedRead(file);
}

async function writeCurrentText(
	plugin: ObUtilsPlugin,
	file: TFile,
	expectedText: string,
	nextText: string,
): Promise<void> {
	const view = getOpenView(plugin, file);
	if (view) {
		if (view.editor.getValue() !== expectedText) throw new Error("Note changed");
		view.editor.setValue(nextText);
		return;
	}

	await plugin.app.vault.process(file, (text) => {
		if (text !== expectedText) throw new Error("Note changed");
		return nextText;
	});
}

function getOpenView(plugin: ObUtilsPlugin, file: TFile): MarkdownView | null {
	for (const leaf of plugin.app.workspace.getLeavesOfType("markdown")) {
		if (leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path) {
			return leaf.view;
		}
	}
	return null;
}

async function hasOtherReferences(
	plugin: ObUtilsPlugin,
	record: MigrationRecord,
	targetText: string,
): Promise<boolean> {
	const marker = `#^${record.blockId}`;
	for (const file of plugin.app.vault.getMarkdownFiles()) {
		const text = file.path === record.targetPath
			? targetText.replace(record.targetInsertedText, "")
			: await readCurrentText(plugin, file);
		if (text.includes(marker)) return true;
	}
	return false;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function successMessage(
	operation: MigrationRecord["operation"],
	targetPath: string,
): string {
	switch (operation) {
		case "planning":
			return `Task planned for ${targetPath}`;
		case "scheduling":
			return `Task scheduled in ${targetPath}`;
		case "migration":
			return `Task migrated to ${targetPath}`;
	}
}
