import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import ObUtilsPlugin from "./main";

export interface ObUtilsSettings {
	recentDirectories: string[];
}

export const DEFAULT_SETTINGS: ObUtilsSettings = {
	recentDirectories: [],
};

export class ObUtilsSettingTab extends PluginSettingTab {
	plugin: ObUtilsPlugin;

	constructor(app: App, plugin: ObUtilsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Clear recent directories")
			.setDesc("Clear the list of recently used directories")
			.addButton((button) =>
				button.setButtonText("Clear").onClick(() => {
					this.plugin.settings.recentDirectories = [];
					void this.plugin.saveSettings();
					new Notice("Recent directories cleared");
				}),
			);
	}
}
