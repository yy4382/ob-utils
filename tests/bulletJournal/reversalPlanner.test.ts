import { describe, expect, it } from "vitest";
import {
	MigrationRecord,
	planReversal,
} from "../../src/bulletJournal/migrationPlanner";

describe("migration reversal planner", () => {
	const record: MigrationRecord = {
		operation: "migration",
		sourcePath: "Daily/2026-09-20.md",
		targetPath: "Daily/2026-09-21.md",
		sourceLineBefore: "- [ ] Buy milk",
		sourceLineAfter: "- [>] Buy milk ^bujo-a1b2c3",
		targetInsertedText:
			"\n- [ ] Buy milk [[Daily/2026-09-20#^bujo-a1b2c3|↩]]\n",
		blockId: "bujo-a1b2c3",
		generatedBlockId: true,
		returnLink: "[[Daily/2026-09-20#^bujo-a1b2c3|↩]]",
	};

	it("reverses a migration while preserving unrelated edits", () => {
		const result = planReversal({
			record,
			sourceText:
				"# Log\n- [>] Buy milk ^bujo-a1b2c3\n- [ ] Added later\n",
			targetText:
				"# Today\n\n- [ ] Buy milk [[Daily/2026-09-20#^bujo-a1b2c3|↩]]\nAdded later\n",
			hasOtherBlockReferences: false,
		});

		expect(result).toEqual({
			ok: true,
			sourceText: "# Log\n- [ ] Buy milk\n- [ ] Added later\n",
			targetText: "# Today\nAdded later\n",
		});
	});

	it("refuses to reverse when the migrated target task changed", () => {
		const result = planReversal({
			record,
			sourceText: "- [>] Buy milk ^bujo-a1b2c3\n",
			targetText:
				"- [x] Buy milk [[Daily/2026-09-20#^bujo-a1b2c3|↩]]\n",
			hasOtherBlockReferences: false,
		});

		expect(result).toEqual({ ok: false, reason: "target-changed" });
	});

	it("keeps a generated block ID when another note still references it", () => {
		const result = planReversal({
			record,
			sourceText: "- [>] Buy milk ^bujo-a1b2c3\n",
			targetText: record.targetInsertedText,
			hasOtherBlockReferences: true,
		});

		expect(result).toEqual({
			ok: true,
			sourceText: "- [ ] Buy milk ^bujo-a1b2c3\n",
			targetText: "",
		});
	});

	it("refuses to reverse when the migrated source task changed", () => {
		const result = planReversal({
			record,
			sourceText: "- [x] Buy milk ^bujo-a1b2c3\n",
			targetText: record.targetInsertedText,
			hasOtherBlockReferences: false,
		});

		expect(result).toEqual({ ok: false, reason: "source-changed" });
	});
});
