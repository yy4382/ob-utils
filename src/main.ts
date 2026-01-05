import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, ObUtilsSettings, ObUtilsSettingTab} from "./settings";
import {DirectoryPickerModal} from './DirectoryPickerModal';
import {moveNoteToDirectory} from './MoveNoteCommand';

export default class ObUtilsPlugin extends Plugin {
	settings: ObUtilsSettings;

	async onload() {
		await this.loadSettings();

		// Add command to move note to directory
		this.addCommand({
			id: 'move-note-to-directory',
			name: 'Move note to directory',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();

				if (activeFile) {
					if (!checking) {
						new DirectoryPickerModal(
							this.app,
							this,
							(targetDir: string) => {
								void moveNoteToDirectory(this.app, this, targetDir);
							}
						).open();
					}
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObUtilsSettingTab(this.app, this));

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ObUtilsSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
