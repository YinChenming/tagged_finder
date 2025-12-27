# Tagged Finder

> **Reshape Your File Management Vision**

Tagged Finder is a modern, intelligent file tagging and management tool designed to break the limitations of traditional folder hierarchies. Through an efficient tagging system and real-time file monitoring, it provides a multi-dimensional way to manage files across directories, making classification and retrieval intuitive and fast.

---

## 💡 Philosophy

In traditional operating systems, files are confined to a single folder path. However, human thinking is networked—a file can be related to "Work", "Finance", and "2025" simultaneously.

Tagged Finder aims to **break the physical path constraints**. We don't change your file storage location; instead, we provide a "lens" that allows you to review and control your digital assets through **Tags**, a more intuitive dimension.

## 🎯 Target Audience

Tagged Finder is built for Power Users who demand more than basic file management:

- **🎨 Creatives**: Designers, editors, and artists managing massive assets (images, videos, audio, fonts).
- **📚 Knowledge Workers**: Researchers and students building knowledge networks with documents, notes, and e-books.
- **💻 Developers**: Programmers managing code snippets, docs, configs, and resources across projects.
- **🗂️ Digital Organizers**: Anyone looking to escape "folder hell" and pursue ultimate efficiency and order.

## 🚀 Key Features

- **🏷️ Smart Tagging System**: Create custom tags with colors. Tag files instantly using a simple interface.
- **🔍 Advanced Filtering**:
  - **Search**: Filter by file name or type.
  - **Tag Logic**: Filter files using sophisticated logic:
    - **Include (OR)**: Match files with *any* of the selected tags.
    - **Include (AND)**: Match files with *all* of the selected tags.
    - **Exclude (NOT)**: Hide files containing specific tags.
- **👁️ Real-time Monitoring**: Automatically tracks file additions, modifications, and deletions in watched directories using `chokidar`.
- **⚡ High-Performance Indexing**: Built-in `better-sqlite3` database handles tens of thousands of file records with millisecond-level query response.
- **🖱️ Drag & Drop Support**: Seamlessly drag files from Tagged Finder to other applications (Finder, Explorer, VS Code, etc.) with OS-level integration.
- **🌐 Internationalization (i18n)**: Full support for **English** and **Simplified Chinese**, automatically detecting system language.
- **📄 File Management**: Add individual files or entire directories to the watch list. Virtual folder support for scattered file management.
- **� Auto-Refresh**: UI components automatically update when data changes (e.g., after file drops or directory indexing).
- **�️ Cross-Platform**: Built with Electron and Vue 3, providing a consistent and smooth experience.
  - ✅ **Windows 11** (Verified)
  - ✅ **macOS** (Verified)

## 🛠️ Tech Stack

- **Core**: Electron 32, Vue 3.5, Vite 6
- **Data**: Better-SQLite3 (v11)
- **Watcher**: Chokidar (v5)
- **Testing**: Vitest, Vue Test Utils
- **UI**: Modern CSS3, Component-based Architecture

## 📦 Getting Started

### Prerequisites
- Node.js v18+
- npm / yarn / pnpm

### Installation & Run

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/tagged_finder.git
   cd tagged_finder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Rebuild native modules** (Essential for database compatibility)
   ```bash
   npm run rebuild-electron
   ```

4. **Start development mode**
   ```bash
   npm run electron:dev
   ```

5. **Build for production**
   ```bash
   npm run electron:build
   ```

## 🧪 Testing

The project includes a comprehensive test suite using **Vitest** covering database logic, file watching, and UI components. Recent updates ensure robust testing with mock implementations for native modules (like `better-sqlite3`) to ensure cross-platform CI compatibility.

To run the tests:
```bash
npm test
```

This will execute:
- **Database Tests**: Verifies CRUD operations, foreign key constraints, and cascading deletes.
- **Watcher Tests**: Verifies file system monitoring and auto-indexing.
- **Component Tests**: Verifies UI rendering, interaction, event handling (auto-refresh), and drag & drop functionality.
- **Mocking Strategy**: Uses `vi.mock` to simulate backend APIs and database interactions for isolated, fast unit testing.

## 📂 Project Structure

```
tagged_finder/
├── electron/           # Electron main process files
├── src/
│   ├── components/     # Vue 3 components (Files, Tags, Dashboard, etc.)
│   ├── composables/    # Shared logic (i18n, settings)
│   ├── database/       # SQLite database manager
│   ├── locales/        # Translation files (en-US, zh-CN)
│   ├── main/           # Backend logic (FileWatcher)
│   ├── App.vue         # Root component
│   └── main.js         # Vue entry point
├── tests/              # Vitest test files
├── public/             # Static assets
└── package.json        # Project configuration
```

## ❓ Troubleshooting

### Native Module Errors (ERR_DLOPEN_FAILED)

If you encounter an error like `Error: The module '...better_sqlite3.node' was compiled against a different Node.js version`, it means the native dependencies need to be rebuilt for the Electron version you are using.

Run the following command to fix it:
```bash
npm run rebuild-electron
```

### Database Initialization Errors

If the application crashes on startup or database operations fail, ensure the `data` directory exists or the application has permission to write to the user data directory. The application now includes auto-recovery for database connections, but permissions issues must be resolved at the OS level.

## 📄 License

This project is licensed under the GNU General Public License v3.0 (GPL v3) - see the [LICENSE](LICENSE) file for details.
