import {
	App,
	Notice,
	PluginSettingTab,
	SettingDefinitionItem,
} from "obsidian";
import ObUtilsPlugin from "./main";
import type { MigrationRecord } from "./bulletJournal/migrationPlanner";
import { validateJournalFormats } from "./bulletJournal/journalLocator";

export interface ObUtilsSettings {
	recentDirectories: string[];
	dailyNoteFormat: string;
	monthlyNoteFormat: string;
	futureLogFormat: string;
	springSemesterFormat: string;
	fallSemesterFormat: string;
	migrationHistory: MigrationRecord[];
}

export const DEFAULT_SETTINGS: ObUtilsSettings = {
	recentDirectories: [],
	dailyNoteFormat: "[Daily]/YYYY-MM-DD",
	monthlyNoteFormat: "YYYY-MM",
	futureLogFormat: "YYYY",
	springSemesterFormat: "YYYY [Spring]",
	fallSemesterFormat: "YYYY [Fall]",
	migrationHistory: [],
};

export class ObUtilsSettingTab extends PluginSettingTab {
	plugin: ObUtilsPlugin;

	constructor(app: App, plugin: ObUtilsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Daily note format",
				desc: "Strict Moment path format, without the .md extension.",
				render: (setting) => {
					const error = setting.descEl.createDiv("bujo-setting-error");
					setting.addMomentFormat((text) =>
						text
							.setValue(this.plugin.settings.dailyNoteFormat)
							.onChange(async (value) => {
								this.plugin.settings.dailyNoteFormat = value;
								this.updateFormatError(error);
								await this.plugin.saveSettings();
							}),
					);
					this.updateFormatError(error);
				},
			},
			{
				name: "Monthly note format",
				desc: "Strict Moment path format, without the .md extension.",
				render: (setting) => {
					const error = setting.descEl.createDiv("bujo-setting-error");
					setting.addMomentFormat((text) =>
						text
							.setValue(this.plugin.settings.monthlyNoteFormat)
							.onChange(async (value) => {
								this.plugin.settings.monthlyNoteFormat = value;
								this.updateFormatError(error);
								await this.plugin.saveSettings();
							}),
					);
					this.updateFormatError(error);
				},
			},
			{
				name: "Future log format",
				desc: "Strict Moment path format, without the .md extension.",
				render: (setting) => {
					const error = setting.descEl.createDiv("bujo-setting-error");
					setting.addMomentFormat((text) =>
						text
							.setValue(this.plugin.settings.futureLogFormat)
							.onChange(async (value) => {
								this.plugin.settings.futureLogFormat = value;
								this.updateFormatError(error);
								await this.plugin.saveSettings();
							}),
					);
					this.updateFormatError(error);
				},
			},
			{
				name: "Spring semester format",
				desc: "Strict Moment path format, without the .md extension. Use [Spring] for the season name.",
				render: (setting) => {
					const error = setting.descEl.createDiv("bujo-setting-error");
					setting.addMomentFormat((text) =>
						text.setValue(this.plugin.settings.springSemesterFormat).onChange(async (value) => {
							this.plugin.settings.springSemesterFormat = value;
							this.updateFormatError(error);
							await this.plugin.saveSettings();
						}),
					);
					this.updateFormatError(error);
				},
			},
			{
				name: "Fall semester format",
				desc: "Strict Moment path format, without the .md extension. Use [Fall] for the season name.",
				render: (setting) => {
					const error = setting.descEl.createDiv("bujo-setting-error");
					setting.addMomentFormat((text) =>
						text.setValue(this.plugin.settings.fallSemesterFormat).onChange(async (value) => {
							this.plugin.settings.fallSemesterFormat = value;
							this.updateFormatError(error);
							await this.plugin.saveSettings();
						}),
					);
					this.updateFormatError(error);
				},
			},
			{
				name: "Clear recent directories",
				desc: "Clear the list of recently used directories.",
				render: (setting) => {
					setting.addButton((button) =>
						button.setButtonText("Clear").onClick(() => {
							this.plugin.settings.recentDirectories = [];
							void this.plugin.saveSettings();
							new Notice("Recent directories cleared");
						}),
					);
				},
			},
		];
	}

	private updateFormatError(element: HTMLElement): void {
		const error = validateJournalFormats({
			daily: this.plugin.settings.dailyNoteFormat,
			monthly: this.plugin.settings.monthlyNoteFormat,
			future: this.plugin.settings.futureLogFormat,
			semesterSpring: this.plugin.settings.springSemesterFormat,
			semesterFall: this.plugin.settings.fallSemesterFormat,
		});
		element.textContent = error ?? "";
		element.toggleClass("is-visible", error !== null);
	}
}
