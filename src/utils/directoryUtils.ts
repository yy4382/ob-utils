import { App, TFolder, Vault } from "obsidian";

/**
 * Get all directories in the vault
 */
export function getAllDirectories(app: App): string[] {
	const folders: string[] = [];
	const files = app.vault.getAllLoadedFiles();

	for (const file of files) {
		if (file instanceof TFolder) {
			// Skip root directory (/) as we represent it with empty string
			if (file.path !== "/" && file.path !== "") {
				folders.push(file.path);
			}
		}
	}

	// Sort alphabetically for consistent display
	return folders.sort();
}

/**
 * Add a directory to the recent list
 * Maintains a maximum of 10 recent directories
 */
export function addRecentDirectory(
	recent: string[],
	dirPath: string,
): string[] {
	// Remove the directory if it already exists (to move it to front)
	const filtered = recent.filter((path) => path !== dirPath);

	// Add to front
	const updated = [dirPath, ...filtered];

	// Limit to 10 items
	return updated.slice(0, 10);
}

/**
 * Check if a file exists at the specified path
 */
export function checkFileExists(
	vault: Vault,
	dirPath: string,
	fileName: string,
): boolean {
	const targetPath = dirPath ? `${dirPath}/${fileName}` : fileName;
	const file = vault.getAbstractFileByPath(targetPath);
	return file !== null;
}

/**
 * Clean up recent directories list by removing directories that no longer exist
 */
export function cleanupRecentDirectories(app: App, recent: string[]): string[] {
	const allDirs = getAllDirectories(app);
	// Add empty string for root directory
	allDirs.unshift("");

	// Filter out directories that no longer exist
	return recent.filter((dir) => allDirs.includes(dir));
}
