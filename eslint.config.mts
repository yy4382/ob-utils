import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						"eslint.config.mts",
						"manifest.json",
						"scripts/*.mjs",
					],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["package.json"],
		rules: {
			"depend/ban-dependencies": ["error", { allowed: ["moment"] }],
		},
	},
	{
		files: ["tests/adapters/**/*.ts"],
		rules: {
			"@typescript-eslint/no-restricted-imports": "off",
		},
	},
	{
		files: ["scripts/**/*.mjs", "vitest.config.ts"],
		rules: {
			"obsidianmd/no-nodejs-modules": "off",
		},
	},
	{
		files: ["scripts/prepare-test-vault.mjs", "eslint.config.mts"],
		rules: {
			"obsidianmd/hardcoded-config-path": "off",
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"tests/ob-utils-test/.obsidian/plugins",
		"tests/ob-utils-test/.obsidian/themes",
		"tests/ob-utils-test/.obsidian/workspace*.json",
	]),
);
