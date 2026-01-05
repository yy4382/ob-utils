import { App, Notice } from "obsidian";
import ObUtilsPlugin from "./main";
import { checkFileExists } from "./utils/directoryUtils";
import {
	generateZettelkastenName,
	hasZettelkastenFormat,
} from "./utils/zettelkastenUtils";

/**
 * Convert the current note to Zettelkasten format by prepending timestamp
 */
export async function convertToZettelkasten(
	app: App,
	plugin: ObUtilsPlugin,
): Promise<void> {
	// Get the active file
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		new Notice("No active file to convert");
		return;
	}

	// Check if already in Zettelkasten format
	if (hasZettelkastenFormat(activeFile.basename)) {
		new Notice("Note already follows zettelkasten format");
		return;
	}

	// Generate new filename
	const newBasename = generateZettelkastenName(app, activeFile);
	if (!newBasename) {
		new Notice("Could not determine date for note");
		return;
	}

	// Construct new path (preserve directory)
	const directory = activeFile.parent?.path || "";
	const newFilename = `${newBasename}.${activeFile.extension}`;
	const newPath = directory ? `${directory}/${newFilename}` : newFilename;

	// Check for file conflicts
	if (checkFileExists(app.vault, directory, newFilename)) {
		new Notice(`A file named '${newFilename}' already exists`);
		return;
	}

	// Perform the rename operation
	try {
		await app.vault.rename(activeFile, newPath);
		new Notice(`Converted to zettelkasten format: ${newBasename}`);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`Failed to convert note: ${errorMessage}`);
		console.error("Zettelkasten conversion error:", error);
	}
}
