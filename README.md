# yy4382's Utilities for Obsidian

A collection of personal utility commands for Obsidian, including note file management and organization tools.

## Features

### Move Note to Directory

Quickly move the current note to any directory in your vault with a searchable picker interface.

**Features:**
- 🔍 Searchable directory picker (similar to command palette)
- ⏱️ Remembers your 10 most recently used directories
- 🎯 Recent directories shown at the top for quick access
- ✨ Automatic cleanup of deleted directories from recent list
- 🛡️ File conflict detection (prevents overwriting existing files)

**Usage:**
1. Open any note in Obsidian
2. Open command palette (`Cmd+P` / `Ctrl+P`)
3. Search for "Move note to directory"
4. Type to filter directories or use arrow keys to navigate
5. Press `Enter` to move the note

**Keyboard Navigation:**
- `↑` / `↓` - Navigate through directories
- `Enter` - Select directory and move note
- `Esc` - Cancel

### Convert Note to Zettelkasten Format

Convert notes to Zettelkasten format by adding a timestamp prefix to the filename.

**Features:**
- 📅 Automatic timestamp prefix in `yyMMdd-HHmm` format (e.g., `250105-0910 note title`)
- 🎯 Smart date detection: uses frontmatter `date` property or file creation time
- 🔒 Prevents duplicate conversion (skips notes already in zettelkasten format)
- 🛡️ File conflict detection (prevents overwriting existing files)
- 📁 Preserves directory structure
- 🌍 Cross-platform compatible using Obsidian's native API

**Usage:**
1. Open any note in Obsidian
2. Open command palette (`Cmd+P` / `Ctrl+P`)
3. Search for "Convert note to zettelkasten format"
4. Press `Enter` to convert

**Date Priority:**
1. Frontmatter `date` property (if present and valid)
2. File creation time (fallback)

**Example:**
- **Before:** `my note.md` (with frontmatter `date: 2025-01-05T09:10:00`)
- **After:** `250105-0910 my note.md`

## Settings

Access plugin settings via Settings → Community Plugins → yy4382's Utilities.

**Available Settings:**
- **Clear recent directories** - Button to clear the list of recently used directories

## Installation

### Manual Installation

1. Download the latest release files (`main.js`, `manifest.json`, `styles.css`)
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

## License

MIT

## Resources

- [Obsidian Plugin Developer Docs](https://docs.obsidian.md)
- [Obsidian API Reference](https://github.com/obsidianmd/obsidian-api)
