import { JournalKind } from "./journalLocator";

export type JournalOperation = "migration" | "scheduling" | "planning";

export interface MigrationRequest {
	sourcePath: string;
	sourceText: string;
	sourceKind: JournalKind;
	taskLine: number;
	targetPath: string;
	targetText: string;
	targetKind: JournalKind;
	newBlockId: string;
	returnLink: string;
	previousReturnLink?: string;
}

export interface MigrationPlan {
	ok: true;
	sourceText: string;
	targetText: string;
	record: MigrationRecord;
}

export interface MigrationRecord {
	operation: JournalOperation;
	sourcePath: string;
	targetPath: string;
	sourceLineBefore: string;
	sourceLineAfter: string;
	targetInsertedText: string;
	blockId: string;
	generatedBlockId: boolean;
	returnLink: string;
}

export function getJournalOperation(
	sourceKind: JournalKind,
	targetKind: JournalKind,
): JournalOperation {
	if (targetKind === "future") return "scheduling";
	if ((sourceKind === "monthly" && targetKind === "daily") ||
		(sourceKind === "semester" && (targetKind === "daily" || targetKind === "monthly"))) {
		return "planning";
	}
	return "migration";
}

export interface ReversalRequest {
	record: MigrationRecord;
	sourceText: string;
	targetText: string;
	hasOtherBlockReferences: boolean;
}

export interface SuccessfulReversalPlan {
	ok: true;
	sourceText: string;
	targetText: string;
}

export interface FailedReversalPlan {
	ok: false;
	reason: "source-changed" | "target-changed";
}

export type ReversalPlan = SuccessfulReversalPlan | FailedReversalPlan;

export function planMigration(request: MigrationRequest): MigrationPlan {
	const sourceLines = request.sourceText.split("\n");
	const sourceLine = sourceLines[request.taskLine];

	if (sourceLine === undefined) {
		throw new Error("Task line is outside the source note");
	}

	const task = /^(\s*)- \[ \] (.*)$/.exec(sourceLine);

	if (!task) {
		throw new Error("Task line is not an incomplete Markdown task");
	}

	const indent = task[1] ?? "";
	const taskText = task[2] ?? "";
	const existingBlockId = /^(.*) \^([A-Za-z0-9-]+)$/.exec(taskText);
	const taskTextWithoutBlockId = existingBlockId?.[1] ?? taskText;
	const previousReturnLinkSuffix = request.previousReturnLink
		? ` ${request.previousReturnLink}`
		: null;
	const copiedTaskText =
		previousReturnLinkSuffix &&
		taskTextWithoutBlockId.endsWith(previousReturnLinkSuffix)
			? taskTextWithoutBlockId.slice(0, -previousReturnLinkSuffix.length)
			: taskTextWithoutBlockId;
	const operation = getJournalOperation(request.sourceKind, request.targetKind);
	const sourceStatus =
		operation === "scheduling" ? "<" : operation === "planning" ? " " : ">";
	const subtreeLines = [sourceLine];
	const pendingBlankLines: string[] = [];

	for (let lineIndex = request.taskLine + 1; lineIndex < sourceLines.length; lineIndex += 1) {
		const line = sourceLines[lineIndex];

		if (line === undefined) {
			break;
		}

		if (line.trim().length === 0) {
			pendingBlankLines.push(line);
			continue;
		}

		const childIndent = /^\s*/.exec(line)?.[0] ?? "";
		if (childIndent.length <= indent.length) {
			break;
		}

		subtreeLines.push(...pendingBlankLines, line);
		pendingBlankLines.length = 0;
	}

	const sourceTaskText = existingBlockId
		? taskText
		: `${taskText} ^${request.newBlockId}`;
	const sourceLineAfter = `${indent}- [${sourceStatus}] ${sourceTaskText}`;
	sourceLines[request.taskLine] = sourceLineAfter;

	const copiedLines = [
		`- [ ] ${copiedTaskText} ${request.returnLink}`,
		...subtreeLines.slice(1).map((line) => line.slice(indent.length)),
	];
	const targetSeparator =
		request.targetText.length === 0
			? ""
			: request.targetText.endsWith("\n")
				? "\n"
				: "\n\n";
	const targetInsertedText = `${targetSeparator}${copiedLines.join("\n")}\n`;
	const targetText = `${request.targetText}${targetInsertedText}`;
	const blockId = existingBlockId?.[2] ?? request.newBlockId;

	return {
		ok: true,
		sourceText: sourceLines.join("\n"),
		targetText,
		record: {
			operation,
			sourcePath: request.sourcePath,
			targetPath: request.targetPath,
			sourceLineBefore: sourceLine,
			sourceLineAfter,
			targetInsertedText,
			blockId,
			generatedBlockId: existingBlockId === null,
			returnLink: request.returnLink,
		},
	};
}

export function getTaskBlockId(sourceText: string, taskLine: number): string | null {
	const line = sourceText.split("\n")[taskLine];
	if (!line || !/^\s*- \[ \] /.test(line)) {
		return null;
	}

	return / \^([A-Za-z0-9-]+)$/.exec(line)?.[1] ?? null;
}

export function planReversal(request: ReversalRequest): ReversalPlan {
	const { record } = request;

	if (!hasExactlyOneOccurrence(request.sourceText, record.sourceLineAfter)) {
		return { ok: false, reason: "source-changed" };
	}

	if (!hasExactlyOneOccurrence(request.targetText, record.targetInsertedText)) {
		return { ok: false, reason: "target-changed" };
	}

	const restoredSourceLine =
		record.generatedBlockId && request.hasOtherBlockReferences
			? `${record.sourceLineBefore} ^${record.blockId}`
			: record.sourceLineBefore;

	return {
		ok: true,
		sourceText: request.sourceText.replace(
			record.sourceLineAfter,
			restoredSourceLine,
		),
		targetText: request.targetText.replace(record.targetInsertedText, ""),
	};
}

function hasExactlyOneOccurrence(text: string, value: string): boolean {
	const firstIndex = text.indexOf(value);
	return firstIndex >= 0 && text.indexOf(value, firstIndex + value.length) < 0;
}
