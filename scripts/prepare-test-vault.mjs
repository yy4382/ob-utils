import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginDirectory = join(
	repository,
	"tests/ob-utils-test/.obsidian/plugins/obsidian-yy4382-utils",
);

await mkdir(pluginDirectory, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css"]) {
	await cp(join(repository, file), join(pluginDirectory, file));
}
