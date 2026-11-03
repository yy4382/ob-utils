import { spawnSync } from "node:child_process";
import process from "node:process";

const vault = process.env.OBSIDIAN_TEST_VAULT?.trim();

if (!vault) {
	console.error(
		"OBSIDIAN_TEST_VAULT is required; refusing to use the active vault.",
	);
	process.exit(2);
}

const result = spawnSync(
	"obsidian",
	[`vault=${vault}`, ...process.argv.slice(2)],
	{ stdio: "inherit" },
);

if (result.error) {
	throw result.error;
}

process.exit(result.status ?? 1);
