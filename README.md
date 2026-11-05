# yy4382's Utilities for Obsidian

A collection of personal utility commands for Obsidian: note file management, Zettelkasten naming, and Bullet Journal task migration. Requires Obsidian 1.13 or later.

## Features

### Move note to directory

Move the current note to any directory in your vault with a searchable picker that lists your 10 most recently used directories first.

### Convert note to Zettelkasten format

Prefix the current note's filename with a `yyMMdd-HHmm` timestamp (e.g. `my note.md` → `250105-0910 my note.md`), taken from the frontmatter `date` property or, failing that, the file creation time.

### Bullet Journal

Task migration and navigation for daily, monthly, semester, and future log notes. Notes are recognized by the path formats in the settings; the plugin never creates journal notes, so destinations must already exist.

**Task migration** moves or plans an incomplete task (`- [ ]`) together with its nested content into another journal note, leaving a `↩` link back to the source. Use the action icon beside a task, or the editor commands.

- Daily and future log tasks can move to today, this month, this semester, or the future log; monthly tasks can be planned for a day; semester tasks can be planned into a day or month. Pickers choose any existing note.
- The source is marked as migrated (`>`) or scheduled (`<`); planned tasks stay open in their monthly or semester note.
- **Undo last task operation** reverses the most recent operation, even after a restart (last 100 are kept).

**Journal navigator** adds a compact month calendar below journal notes, with links to the month's daily, monthly, and semester notes and the year's future log.

Both features work in Live Preview and Source mode, but not Reading view. See [the design doc](docs/design/bullet-journal.md) for full behavior.

## Settings

Access settings via **Settings → Community plugins → yy4382's Utilities**.

- **Daily note format**, **Monthly note format**, **Future log format**, **Spring semester format**, **Fall semester format** - Moment path formats (without `.md`) used to recognize journal notes. Invalid or ambiguous formats disable the Bullet Journal features.
- **Clear recent directories** - Clear the list of recently used directories.

## Installation

### Install with BRAT

1. In Obsidian, open **Settings → Community plugins → Browse**, search for **BRAT**, then install and enable it.
2. Open **Settings → BRAT** and select **Add Beta plugin**.
3. Enter `https://github.com/yy4382/ob-utils`, select the latest version, and select **Add Plugin**.
4. Enable **yy4382's Utilities** in **Settings → Community plugins** if it is not already enabled.

BRAT can check for updates and install new releases for you. See the [BRAT documentation](https://tfthacker.com/BRAT) for update settings. Installation requires at least one published [release](https://github.com/yy4382/ob-utils/releases) with plugin assets.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` (if present) from the [latest release](https://github.com/yy4382/ob-utils/releases/latest).
2. Create a folder: `YourVault/.obsidian/plugins/obsidian-yy4382-utils/`
3. Copy the downloaded files into this folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### Development Installation

1. Clone this repository into your vault's plugins folder:
   ```bash
   cd YourVault/.obsidian/plugins
   git clone https://github.com/yy4382/ob-utils obsidian-yy4382-utils
   cd obsidian-yy4382-utils
   ```
2. Install dependencies:
   ```bash
   corepack enable
   pnpm install
   ```
3. Build the plugin:
   ```bash
   pnpm run build
   ```
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

## Development

### Building

- `pnpm run dev` - Start compilation in watch mode
- `pnpm run build` - Build for production
- `pnpm run lint` - Run ESLint

### Publishing a release

1. Set the same `x.y.z` version in `package.json` and `manifest.json`.
2. Add that version to `versions.json`, mapped to the `minAppVersion` in `manifest.json`.
3. Commit and push these changes along with the release workflow.
4. Tag that commit with the exact version, without a `v` prefix, and push the tag. For example, for version `0.1.0`:
   ```bash
   git tag 0.1.0
   git push origin 0.1.0
   ```

The **Release plugin** GitHub Actions workflow validates the version, installs the locked dependencies, runs lint and the production build, and publishes a release with generated notes. It attaches `main.js`, `manifest.json`, and `styles.css` (if present) as individual assets for BRAT and manual installation. Build artifacts do not need to be committed.

## License

MIT

## Resources

- [Obsidian Plugin Developer Docs](https://docs.obsidian.md)
- [Obsidian API Reference](https://github.com/obsidianmd/obsidian-api)
