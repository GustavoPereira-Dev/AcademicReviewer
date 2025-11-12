# File Organizer CLI

A powerful command-line tool for organizing and managing files with automated sorting and renaming capabilities.

## Features

- **Scan directories** - View file statistics and categorization
- **Organize by type** - Automatically sort files into categorized folders (images, videos, documents, etc.)
- **Batch rename** - Rename multiple files using customizable patterns
- **Preview mode** - See changes before applying them
- **File statistics** - Get detailed information about your files

## Installation

```bash
npm install
npm link
```

## Usage

### Scan a Directory

Scan a directory and display file statistics:

```bash
file-organizer scan <directory>
```

### Organize Files by Type

Organize files into categorized folders:

```bash
file-organizer organize <directory>
```

Preview changes without applying them:

```bash
file-organizer organize <directory> --preview
```

### Batch Rename Files

Rename files using a pattern:

```bash
file-organizer rename <directory> --pattern "{name}_{counter}{ext}"
```

Preview rename changes:

```bash
file-organizer rename <directory> --pattern "{date}_{name}{ext}" --preview
```

### Pattern Variables

- `{name}` - Original filename (without extension)
- `{counter}` - Sequential number (001, 002, ...)
- `{date}` - File modification date (YYYY-MM-DD)
- `{ext}` - File extension (including dot)

View all pattern options:

```bash
file-organizer help-patterns
```

## Examples

```bash
# Scan your downloads folder
file-organizer scan ~/Downloads

# Organize files by type
file-organizer organize ~/Downloads

# Preview organization
file-organizer organize ~/Downloads --preview

# Rename files with date prefix
file-organizer rename ~/Photos --pattern "{date}_{name}{ext}"

# Rename with counter
file-organizer rename ~/Documents --pattern "doc_{counter}{ext}"
```

## File Categories

The tool automatically categorizes files into:

- **images** - jpg, png, gif, svg, webp, etc.
- **videos** - mp4, avi, mkv, mov, etc.
- **audio** - mp3, wav, flac, aac, etc.
- **documents** - pdf, doc, txt, rtf, etc.
- **spreadsheets** - xls, xlsx, csv, etc.
- **presentations** - ppt, pptx, key, etc.
- **archives** - zip, rar, 7z, tar, etc.
- **code** - js, py, java, html, css, etc.
- **executables** - exe, app, dmg, etc.
- **fonts** - ttf, otf, woff, etc.
- **others** - any uncategorized files

## License

ISC
