import { describe, expect, it } from "vitest";
import {
	createJournalLocator,
	validateJournalFormats,
} from "../../src/bulletJournal/journalLocator";

describe("journal locator", () => {
	it("recognizes a daily note from its strict Moment path format", () => {
		const locator = createJournalLocator({
			daily: "[Daily]/YYYY-MM-DD",
			monthly: "YYYY-MM",
			future: "YYYY",
		});

		expect(locator.classify("Daily/2026-09-21.md")).toEqual({
			kind: "daily",
			year: 2026,
			month: 9,
			day: 21,
			path: "Daily/2026-09-21.md",
		});
	});

	it("recognizes a monthly note at the vault root", () => {
		const locator = createJournalLocator({
			daily: "[Daily]/YYYY-MM-DD",
			monthly: "YYYY-MM",
			future: "YYYY",
		});

		expect(locator.classify("2026-09.md")).toEqual({
			kind: "monthly",
			year: 2026,
			month: 9,
			path: "2026-09.md",
		});
	});

	it("recognizes an annual future log at the vault root", () => {
		const locator = createJournalLocator({
			daily: "[Daily]/YYYY-MM-DD",
			monthly: "YYYY-MM",
			future: "YYYY",
		});

		expect(locator.classify("2026.md")).toEqual({
			kind: "future",
			year: 2026,
			path: "2026.md",
		});
	});

	it("formats the daily target path from a local calendar date", () => {
		const locator = createJournalLocator({
			daily: "[Daily]/YYYY-MM-DD",
			monthly: "YYYY-MM",
			future: "YYYY",
		});

		expect(locator.pathFor("daily", new Date(2026, 8, 21))).toBe(
			"Daily/2026-09-21.md",
		);
	});

	it("recognizes semester pages and maps January to the previous fall", () => {
		const locator = createJournalLocator({
			daily: "[Daily]/YYYY-MM-DD",
			monthly: "YYYY-MM",
			future: "YYYY",
		});
		expect(locator.classify("2026 Fall.md")).toEqual({
			kind: "semester", year: 2026, season: "Fall", path: "2026 Fall.md",
		});
		expect(locator.classify("2026 Spring.md")).toEqual({
			kind: "semester", year: 2026, season: "Spring", path: "2026 Spring.md",
		});
		expect(locator.pathFor("semester", new Date(2027, 0, 15))).toBe("2026 Fall.md");
		expect(locator.pathFor("semester", new Date(2027, 1, 1))).toBe("2027 Spring.md");
		expect(locator.pathFor("semester", new Date(2026, 7, 31))).toBe("2026 Spring.md");
		expect(locator.pathFor("semester", new Date(2026, 8, 1))).toBe("2026 Fall.md");
	});
});

describe("journal format validation", () => {
	it("accepts distinct formats that preserve the required date precision", () => {
		expect(
			validateJournalFormats({
				daily: "[Daily]/YYYY-MM-DD",
				monthly: "YYYY-MM",
				future: "YYYY",
			}),
		).toBeNull();
	});

	it("rejects formats that lose required date precision", () => {
		expect(
			validateJournalFormats({
				daily: "[Daily]/YYYY-MM",
				monthly: "YYYY-MM",
				future: "YYYY",
			}),
		).toBe("Daily note format must include an unambiguous day");
	});

	it("rejects formats that resolve to the same path", () => {
		expect(
			validateJournalFormats({
				daily: "YYYY-MM-DD",
				monthly: "YYYY-MM-DD",
				future: "YYYY",
			}),
		).toBe("Journal formats must resolve to different paths");
	});

	it("rejects a semester format without its literal season name", () => {
		expect(validateJournalFormats({
			daily: "[Daily]/YYYY-MM-DD",
			monthly: "YYYY-MM",
			future: "YYYY",
			semesterSpring: "YYYY [Term]",
			semesterFall: "YYYY [Fall]",
		})).toBe("Spring semester format must include a year and the literal season name");
	});
});
