import { describe, expect, it } from "vitest";
import { planMigration } from "../../src/bulletJournal/migrationPlanner";

describe("migration planner", () => {
	it("keeps a semester task open when planning it in a monthly note", () => {
		const result = planMigration({
			sourcePath: "2026 Fall.md",
			sourceText: "- [ ] Read paper\n",
			sourceKind: "semester",
			taskLine: 0,
			targetPath: "2026-09.md",
			targetText: "",
			targetKind: "monthly",
			newBlockId: "bujo-semester",
			returnLink: "[[2026 Fall#^bujo-semester|↩]]",
		});
		expect(result.sourceText).toBe("- [ ] Read paper ^bujo-semester\n");
		expect(result.targetText).toBe("- [ ] Read paper [[2026 Fall#^bujo-semester|↩]]\n");
		expect(result.record.operation).toBe("planning");
	});
	it("migrates an incomplete task to a daily note", () => {
		const result = planMigration({
			sourcePath: "Daily/2026-09-20.md",
			sourceText: "- [ ] Buy milk\n",
			sourceKind: "daily",
			taskLine: 0,
			targetPath: "Daily/2026-09-21.md",
			targetText: "# Today\n",
			targetKind: "daily",
			newBlockId: "bujo-a1b2c3",
			returnLink: "[[Daily/2026-09-20#^bujo-a1b2c3|↩]]",
		});

		expect(result).toMatchObject({
			ok: true,
			sourceText: "- [>] Buy milk ^bujo-a1b2c3\n",
			targetText:
				"# Today\n\n- [ ] Buy milk [[Daily/2026-09-20#^bujo-a1b2c3|↩]]\n",
			record: {
				sourcePath: "Daily/2026-09-20.md",
				targetPath: "Daily/2026-09-21.md",
				sourceLineBefore: "- [ ] Buy milk",
				sourceLineAfter: "- [>] Buy milk ^bujo-a1b2c3",
				targetInsertedText:
					"\n- [ ] Buy milk [[Daily/2026-09-20#^bujo-a1b2c3|↩]]\n",
				blockId: "bujo-a1b2c3",
				generatedBlockId: true,
			},
		});
	});

	it("copies the complete indented task subtree", () => {
		const result = planMigration({
			sourcePath: "Daily/2026-09-20.md",
			sourceText:
				"- [ ] Prepare release\n  Add notes\n  - [ ] Run checks\n- [ ] Unrelated task\n",
			sourceKind: "daily",
			taskLine: 0,
			targetPath: "Daily/2026-09-21.md",
			targetText: "",
			targetKind: "daily",
			newBlockId: "bujo-release",
			returnLink: "[[Daily/2026-09-20#^bujo-release|↩]]",
		});

		expect(result).toMatchObject({
			ok: true,
			sourceText:
				"- [>] Prepare release ^bujo-release\n  Add notes\n  - [ ] Run checks\n- [ ] Unrelated task\n",
			targetText:
				"- [ ] Prepare release [[Daily/2026-09-20#^bujo-release|↩]]\n  Add notes\n  - [ ] Run checks\n",
		});
	});

	it("keeps the migration chain to the immediate source", () => {
		const previousReturnLink = "[[Daily/2026-09-19#^bujo-first|↩]]";
		const result = planMigration({
			sourcePath: "Daily/2026-09-20.md",
			sourceText: `- [ ] Buy milk ${previousReturnLink}\n`,
			sourceKind: "daily",
			taskLine: 0,
			targetPath: "Daily/2026-09-21.md",
			targetText: "",
			targetKind: "daily",
			newBlockId: "bujo-second",
			returnLink: "[[Daily/2026-09-20#^bujo-second|↩]]",
			previousReturnLink,
		});

		expect(result).toMatchObject({
			ok: true,
			sourceText:
				"- [>] Buy milk [[Daily/2026-09-19#^bujo-first|↩]] ^bujo-second\n",
			targetText:
				"- [ ] Buy milk [[Daily/2026-09-20#^bujo-second|↩]]\n",
		});
	});

	it("reuses an existing source block ID without copying it", () => {
		const result = planMigration({
			sourcePath: "Daily/2026-09-20.md",
			sourceText: "- [ ] Buy milk ^milk-task\n",
			sourceKind: "daily",
			taskLine: 0,
			targetPath: "2026-09.md",
			targetText: "",
			targetKind: "monthly",
			newBlockId: "bujo-unused",
			returnLink: "[[Daily/2026-09-20#^milk-task|↩]]",
		});

		expect(result).toMatchObject({
			ok: true,
			sourceText: "- [>] Buy milk ^milk-task\n",
			targetText:
				"- [ ] Buy milk [[Daily/2026-09-20#^milk-task|↩]]\n",
		});
	});

	it("moves a nested task subtree to the target as a top-level task", () => {
		const result = planMigration({
			sourcePath: "Daily/2026-09-20.md",
			sourceText: "- [ ] Parent\n  - [ ] Nested task\n    More detail\n",
			sourceKind: "daily",
			taskLine: 1,
			targetPath: "Daily/2026-09-21.md",
			targetText: "",
			targetKind: "daily",
			newBlockId: "bujo-nested",
			returnLink: "[[Daily/2026-09-20#^bujo-nested|↩]]",
		});

		expect(result.targetText).toBe(
			"- [ ] Nested task [[Daily/2026-09-20#^bujo-nested|↩]]\n  More detail\n",
		);
		expect(result.sourceText).toBe(
			"- [ ] Parent\n  - [>] Nested task ^bujo-nested\n    More detail\n",
		);
	});

	it("marks a task as scheduled when it moves to a future log", () => {
		const result = planMigration({
			sourcePath: "Daily/2026-09-20.md",
			sourceText: "- [ ] Someday\n",
			sourceKind: "daily",
			taskLine: 0,
			targetPath: "2026.md",
			targetText: "",
			targetKind: "future",
			newBlockId: "bujo-someday",
			returnLink: "[[Daily/2026-09-20#^bujo-someday|↩]]",
		});

		expect(result.sourceText).toBe("- [<] Someday ^bujo-someday\n");
	});

	it("plans a monthly task for a day without closing the monthly task", () => {
		const result = planMigration({
			sourcePath: "2026-09.md",
			sourceText: "- [ ] Monthly review\n",
			sourceKind: "monthly",
			taskLine: 0,
			targetPath: "Daily/2026-09-21.md",
			targetText: "",
			targetKind: "daily",
			newBlockId: "bujo-review",
			returnLink: "[[2026-09#^bujo-review|↩]]",
		});

		expect(result.sourceText).toBe(
			"- [ ] Monthly review ^bujo-review\n",
		);
		expect(result.targetText).toBe(
			"- [ ] Monthly review [[2026-09#^bujo-review|↩]]\n",
		);
		expect(result.record.operation).toBe("planning");
	});
});
