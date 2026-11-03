import { EditorState, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { editorInfoField, moment, TFile } from "obsidian";
import type ObUtilsPlugin from "../main";
import { createJournalLocator, JournalNoteReference, validateJournalFormats } from "./journalLocator";

export function createJournalNavigatorExtension(plugin: ObUtilsPlugin) {
	return StateField.define<DecorationSet>({
		create: (state) => buildDecorations(plugin, state),
		update: (decorations, transaction) =>
			transaction.docChanged
				? buildDecorations(plugin, transaction.state)
				: decorations,
		provide: (field) => EditorView.decorations.from(field),
	});
}

function buildDecorations(plugin: ObUtilsPlugin, state: EditorState): DecorationSet {
	const file = state.field(editorInfoField, false)?.file;
	const journal = file && hasValidFormats(plugin)
		? getLocator(plugin).classify(file.path)
		: null;
	if (!journal) {
		return Decoration.none;
	}

	return Decoration.set([
		Decoration.widget({
			widget: new JournalNavigatorWidget(
				plugin,
				Math.max(3, 8 - state.doc.lines),
				journal,
			),
			block: true,
			side: 1,
		}).range(state.doc.length),
	]);
}

class JournalNavigatorWidget extends WidgetType {
	constructor(
		private readonly plugin: ObUtilsPlugin,
		private readonly gapLines: number,
		private readonly journal: JournalNoteReference,
	) {
		super();
	}

	eq(other: JournalNavigatorWidget): boolean {
		return other.plugin === this.plugin &&
			other.gapLines === this.gapLines &&
			other.journal.path === this.journal.path;
	}

	toDOM(): HTMLElement {
		const root = createEl("section");
		root.className = "bujo-navigator";
		root.setAttribute("aria-label", "Journal calendar");
		root.style.setProperty("--bujo-navigator-gap", `${this.gapLines}lh`);
		let displayedMonth = this.journal.kind === "future"
			? moment({ year: this.journal.year, month: this.journal.year === moment().year() ? moment().month() : 0 }).startOf("month")
			: this.journal.kind === "semester"
				? moment({ year: this.journal.year, month: this.journal.season === "Spring" ? 1 : 8 }).startOf("month")
			: moment({ year: this.journal.year, month: this.journal.month - 1 }).startOf("month");

		const render = (): void => {
			root.empty();
			root.appendChild(this.createHeader(displayedMonth, (delta) => {
				displayedMonth = delta === 0
					? moment().startOf("month")
					: displayedMonth.clone().add(delta, "month");
				render();
			}));
			root.appendChild(this.createCalendar(displayedMonth));
			root.appendChild(this.createJournalLinks(displayedMonth));
		};

		render();
		return root;
	}

	private createHeader(
		month: ReturnType<typeof moment>,
		navigate: (delta: number) => void,
	): HTMLElement {
		const header = createEl("header");
		header.className = "bujo-navigator__header";
		header.appendChild(createButton("‹", "Previous month", () => navigate(-1)));

		const heading = createDiv();
		heading.className = "bujo-navigator__heading";
		const title = createEl("strong");
		title.textContent = month.format("MMMM YYYY");
		heading.appendChild(title);
		const today = createButton("Today", "Show current month", () => navigate(0));
		today.className = "bujo-navigator__today";
		heading.appendChild(today);
		header.appendChild(heading);
		header.appendChild(createButton("›", "Next month", () => navigate(1)));
		return header;
	}

	private createCalendar(month: ReturnType<typeof moment>): HTMLElement {
		const grid = createDiv();
		grid.className = "bujo-navigator__grid";
		grid.setAttribute("role", "grid");
		const locale = moment.localeData();
		const weekdays = locale.weekdaysMin();
		const firstDay = locale.firstDayOfWeek();
		for (let index = 0; index < 7; index += 1) {
			const label = createSpan();
			label.className = "bujo-navigator__weekday";
			label.textContent = weekdays[(firstDay + index) % 7] ?? "";
			grid.appendChild(label);
		}

		const first = month.clone().startOf("month");
		const offset = (first.day() - firstDay + 7) % 7;
		const day = first.clone().subtract(offset, "day");
		for (let index = 0; index < 42; index += 1) {
			const current = day.clone().add(index, "day");
			const path = getLocator(this.plugin).pathFor("daily", current.toDate());
			const button = this.createPathButton(current.format("D"), path);
			button.classList.add("bujo-navigator__day");
			if (current.month() !== month.month()) {
				button.classList.add("is-outside-month");
			}
			if (current.isSame(moment(), "day")) button.classList.add("is-today");
			if (this.journal.kind === "daily" &&
				current.year() === this.journal.year &&
				current.month() + 1 === this.journal.month &&
				current.date() === this.journal.day) {
				button.classList.add("is-current-note");
				button.setAttribute("aria-current", "page");
			}
			grid.appendChild(button);
		}
		return grid;
	}

	private createJournalLinks(month: ReturnType<typeof moment>): HTMLElement {
		const footer = createEl("footer");
		footer.className = "bujo-navigator__links";
		footer.appendChild(
			this.createPathButton(
				month.format("MMMM"),
				getLocator(this.plugin).pathFor("monthly", month.toDate()),
				true,
			),
		);
		const semester = getLocator(this.plugin).classify(getLocator(this.plugin).pathFor("semester", month.toDate()));
		if (semester?.kind === "semester") {
			footer.appendChild(this.createPathButton(
				`${semester.year} ${semester.season}`,
				semester.path,
				true,
			));
		}
		footer.appendChild(
			this.createPathButton(
				`${month.format("YYYY")} future log`,
				getLocator(this.plugin).pathFor("future", month.toDate()),
				true,
			),
		);
		return footer;
	}

	private createPathButton(label: string, path: string, markCurrentNote = false): HTMLButtonElement {
		const button = createEl("button");
		button.type = "button";
		button.textContent = label;
		button.setAttribute("aria-label", path.replace(/\.md$/, ""));
		if (markCurrentNote && path === this.journal.path) {
			button.classList.add("is-current-note-link");
			button.setAttribute("aria-current", "page");
		}
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			button.disabled = true;
			button.title = `${path} does not exist`;
			return button;
		}

		button.addEventListener("click", (event) => {
			event.preventDefault();
			const newTab = event.metaKey || event.ctrlKey;
			void this.plugin.app.workspace.getLeaf(newTab ? "tab" : false).openFile(file);
		});
		return button;
	}
}

function createButton(
	label: string,
	title: string,
	onClick: () => void,
): HTMLButtonElement {
	const button = createEl("button");
	button.type = "button";
	button.textContent = label;
	button.title = title;
	button.addEventListener("click", (event) => {
		event.preventDefault();
		onClick();
	});
	return button;
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
