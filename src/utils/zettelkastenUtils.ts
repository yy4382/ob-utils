import { App, TFile } from "obsidian";
import dayjs from "dayjs";

/**
 * Zettelkasten Configuration
 * To change the Zettelkasten format, update both values below:
 * - ZETTELKASTEN_FORMAT: dayjs format string (https://day.js.org/docs/en/display/format)
 * - ZETTELKASTEN_PATTERN: regex pattern to match the format
 *
 * Current format: yyMMdd-HHmm (e.g., "250105-0910 note title")
 */
const ZETTELKASTEN_FORMAT = "YYMMDD-HHmm";
const ZETTELKASTEN_PATTERN = /^\d{6}-\d{4}\s/;

/**
 * Check if a filename already follows Zettelkasten format
 */
export function hasZettelkastenFormat(basename: string): boolean {
	return ZETTELKASTEN_PATTERN.test(basename);
}

/**
 * Format a date as Zettelkasten timestamp using the configured format
 */
export function formatZettelkastenTimestamp(date: Date): string {
	return dayjs(date).format(ZETTELKASTEN_FORMAT);
}

/**
 * Validate if a date object is valid
 */
export function isValidDate(date: Date): boolean {
	return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Parse frontmatter date value (string or number) into Date object
 */
export function parseFrontmatterDate(dateValue: unknown): Date | null {
	if (!dateValue) return null;

	// Handle number (Unix timestamp in milliseconds)
	if (typeof dateValue === "number") {
		const date = new Date(dateValue);
		return isValidDate(date) ? date : null;
	}

	// Handle string (ISO format or parseable date string)
	if (typeof dateValue === "string") {
		const date = new Date(dateValue);
		return isValidDate(date) ? date : null;
	}

	return null;
}

/**
 * Extract date for a note following priority:
 * 1. Frontmatter 'date' property
 * 2. File creation time (ctime)
 */
export function extractDateForNote(app: App, file: TFile): Date | null {
	// Priority 1: Frontmatter date
	const cache = app.metadataCache.getFileCache(file);
	if (cache?.frontmatter?.date) {
		const frontmatterDate = parseFrontmatterDate(cache.frontmatter.date);
		if (frontmatterDate) {
			return frontmatterDate;
		}
	}

	// Priority 2: File creation time
	return new Date(file.stat.ctime);
}

/**
 * Generate new Zettelkasten filename for a note
 * Returns null if note already has Zettelkasten format
 */
export function generateZettelkastenName(
	app: App,
	file: TFile,
): string | null {
	// Check if already in format
	if (hasZettelkastenFormat(file.basename)) {
		return null;
	}

	// Extract date
	const date = extractDateForNote(app, file);
	if (!date) {
		return null;
	}

	// Generate timestamp and prepend to basename
	const timestamp = formatZettelkastenTimestamp(date);
	return `${timestamp} ${file.basename}`;
}
