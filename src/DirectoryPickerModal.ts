import { App, SuggestModal } from "obsidian";
import ObUtilsPlugin from "./main";
import { getAllDirectories } from "./utils/directoryUtils";

/**
 * Modal for selecting a directory to move the current note to
 */
export class DirectoryPickerModal extends SuggestModal<string> {
	plugin: ObUtilsPlugin;
	allDirectories: string[];
	recentDirectories: string[];
	onChoose: (directory: string) => void;

	constructor(
		app: App,
		plugin: ObUtilsPlugin,
		onChoose: (directory: string) => void,
	) {
		super(app);
		this.plugin = plugin;
		this.onChoose = onChoose;

		// Load all directories
		this.allDirectories = getAllDirectories(app);

		// Add root directory as an option
		this.allDirectories.unshift("");

		// Load recent directories from settings
		this.recentDirectories = plugin.settings.recentDirectories;

		this.setPlaceholder("Type to search for a directory...");
	}

	getSuggestions(query: string): string[] {
		const lowerQuery = query.toLowerCase();

		// If query is empty, show recent directories at top followed by all directories
		if (!query) {
			const recent = this.recentDirectories.filter((dir) =>
				this.allDirectories.includes(dir),
			);
			const nonRecent = this.allDirectories.filter(
				(dir) => !this.recentDirectories.includes(dir),
			);
			return [...recent, ...nonRecent];
		}

		// Filter directories by query
		const filtered = this.allDirectories.filter((dir) => {
			const dirName = dir || "root";
			return dirName.toLowerCase().includes(lowerQuery);
		});

		// Sort: recent directories first, then alphabetically
		return filtered.sort((a, b) => {
			const aIsRecent = this.recentDirectories.includes(a);
			const bIsRecent = this.recentDirectories.includes(b);

			if (aIsRecent && !bIsRecent) return -1;
			if (!aIsRecent && bIsRecent) return 1;
			return a.localeCompare(b);
		});
	}

	renderSuggestion(directory: string, el: HTMLElement): void {
		const isRecent = this.recentDirectories.includes(directory);
		const displayName = directory || "Root";

		// Create container
		const container = el.createDiv({ cls: "directory-suggestion" });

		// Add directory path
		const text = container.createSpan({ cls: "suggestion-text" });
		text.setText(displayName);

		// Add "Recent" badge if applicable
		if (isRecent) {
			const badge = container.createSpan({
				cls: "suggestion-badge recent-badge",
			});
			badge.setText(" Recent");
		}
	}

	onChooseSuggestion(
		directory: string,
		evt: MouseEvent | KeyboardEvent,
	): void {
		this.onChoose(directory);
	}
}
