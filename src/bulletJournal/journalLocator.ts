import { moment } from "obsidian";

export interface JournalFormats {
	daily: string;
	monthly: string;
	future: string;
	semesterSpring?: string;
	semesterFall?: string;
}

export type JournalKind = "daily" | "monthly" | "future" | "semester";
export type SemesterSeason = "Spring" | "Fall";

const DEFAULT_SEMESTER_FORMATS = {
	semesterSpring: "YYYY [Spring]",
	semesterFall: "YYYY [Fall]",
};

export interface DailyNoteReference {
	kind: "daily";
	year: number;
	month: number;
	day: number;
	path: string;
}

export interface MonthlyNoteReference {
	kind: "monthly";
	year: number;
	month: number;
	path: string;
}

export interface FutureLogReference {
	kind: "future";
	year: number;
	path: string;
}

export interface SemesterNoteReference {
	kind: "semester";
	year: number;
	season: SemesterSeason;
	path: string;
}

export type JournalNoteReference =
	| DailyNoteReference
	| MonthlyNoteReference
	| FutureLogReference
	| SemesterNoteReference;

export interface JournalLocator {
	classify(path: string): JournalNoteReference | null;
	pathFor(kind: JournalKind, date: Date): string;
}

export function semesterForDate(date: Date): { year: number; season: SemesterSeason } {
	const month = date.getMonth();
	return month >= 1 && month <= 7
		? { year: date.getFullYear(), season: "Spring" }
		: { year: month === 0 ? date.getFullYear() - 1 : date.getFullYear(), season: "Fall" };
}

export function validateJournalFormats(formats: JournalFormats): string | null {
	const semesterFormats = { ...DEFAULT_SEMESTER_FORMATS, ...formats };
	const sample = moment({ year: 2026, month: 8, day: 21, hour: 12 });
	const formatted = {
		daily: sample.format(formats.daily),
		monthly: sample.format(formats.monthly),
		future: sample.format(formats.future),
		semesterSpring: sample.format(semesterFormats.semesterSpring),
		semesterFall: sample.format(semesterFormats.semesterFall),
	};
	const daily = moment(formatted.daily, formats.daily, true);
	if (
		!daily.isValid() ||
		daily.year() !== sample.year() ||
		daily.month() !== sample.month() ||
		daily.date() !== sample.date()
	) {
		return "Daily note format must include an unambiguous day";
	}

	const monthly = moment(formatted.monthly, formats.monthly, true);
	if (
		!monthly.isValid() ||
		monthly.year() !== sample.year() ||
		monthly.month() !== sample.month()
	) {
		return "Monthly note format must include an unambiguous month";
	}

	const future = moment(formatted.future, formats.future, true);
	if (!future.isValid() || future.year() !== sample.year()) {
		return "Future log format must include an unambiguous year";
	}
	for (const [season, format, value] of [
		["Spring", semesterFormats.semesterSpring, formatted.semesterSpring],
		["Fall", semesterFormats.semesterFall, formatted.semesterFall],
	] as const) {
		const parsed = moment(value, format, true);
		if (!parsed.isValid() || parsed.year() !== sample.year() || !value.includes(season)) {
			return `${season} semester format must include a year and the literal season name`;
		}
	}

	if (new Set(Object.values(formatted)).size !== Object.values(formatted).length) {
		return "Journal formats must resolve to different paths";
	}
	return null;
}

export function createJournalLocator(formats: JournalFormats): JournalLocator {
	const semesterFormats = { ...DEFAULT_SEMESTER_FORMATS, ...formats };
	return {
		pathFor(kind: JournalKind, date: Date): string {
			if (kind === "semester") {
				const semester = semesterForDate(date);
				const format = semester.season === "Spring"
					? semesterFormats.semesterSpring
					: semesterFormats.semesterFall;
				return `${moment({ year: semester.year, month: 8, day: 21 }).format(format)}.md`;
			}
			return `${moment(date).format(formats[kind])}.md`;
		},
		classify(path: string): JournalNoteReference | null {
			const pathWithoutExtension = path.endsWith(".md")
				? path.slice(0, -3)
				: path;
			const daily = moment(pathWithoutExtension, formats.daily, true);

			if (daily.isValid()) {
				return {
					kind: "daily",
					year: daily.year(),
					month: daily.month() + 1,
					day: daily.date(),
					path,
				};
			}

			const monthly = moment(pathWithoutExtension, formats.monthly, true);

			if (monthly.isValid()) {
				return {
					kind: "monthly",
					year: monthly.year(),
					month: monthly.month() + 1,
					path,
				};
			}

			const future = moment(pathWithoutExtension, formats.future, true);

			if (future.isValid()) {
				return {
					kind: "future",
					year: future.year(),
					path,
				};
			}

			for (const [season, format] of [
				["Spring", semesterFormats.semesterSpring],
				["Fall", semesterFormats.semesterFall],
			] as const) {
				const semester = moment(pathWithoutExtension, format, true);
				if (semester.isValid() && pathWithoutExtension.includes(season)) {
					return { kind: "semester", year: semester.year(), season, path };
				}
			}

			return null;
		},
	};
}
