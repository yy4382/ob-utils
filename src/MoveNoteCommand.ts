import { App, Notice } from "obsidian";
import ObUtilsPlugin from "./main";
import {
	addRecentDirectory,
	checkFileExists,
	cleanupRecentDirectories,
} from "./utils/directoryUtils";

/**
 * Move the current note to the specified directory
 */
export async function moveNoteToDirectory(
	app: App,
	plugin: ObUtilsPlugin,
	targetDir: string,
): Promise<void> {
	// Get the active file
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		new Notice("No active file to move");
		return;
	}

	// Build target path
	const targetPath = targetDir
		? `${targetDir}/${activeFile.name}`
		: activeFile.name;

	// Check for file conflicts
	if (checkFileExists(app.vault, targetDir, activeFile.name)) {
		new Notice(
			`A file named '${activeFile.name}' already exists in this directory`,
		);
		return;
	}

	// Check if already at destination
	if (activeFile.path === targetPath) {
		new Notice("File is already in this directory");
		return;
	}

	// Perform the move operation
	try {
		await app.vault.rename(activeFile, targetPath);
		new Notice(`Moved to ${targetDir || "root"}`);

		// Clean up non-existent directories from recent list
		plugin.settings.recentDirectories = cleanupRecentDirectories(
			app,
			plugin.settings.recentDirectories,
		);

		// Update recent directories
		plugin.settings.recentDirectories = addRecentDirectory(
			plugin.settings.recentDirectories,
			targetDir,
		);
		await plugin.saveSettings();
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		new Notice(`Failed to move file: ${errorMessage}`);
		console.error("Move error:", error);
	}
}
