# TagLens

> **Reshape Your File Management Vision**

TagLens is a modern, intelligent file tagging and management tool designed to break the limitations of traditional folder hierarchies. Through an efficient tagging system and real-time file monitoring, it provides a multi-dimensional way to manage files across directories, making classification and retrieval intuitive and fast.

---

## 💡 Philosophy

In traditional operating systems, files are confined to a single folder path. However, human thinking is networked—a file can be related to "Work", "Finance", and "2025" simultaneously.

TagLens aims to **break the physical path constraints**. We don't change your file storage location; instead, we provide a "lens" that allows you to review and control your digital assets through **Tags**, a more intuitive dimension.

## 🎯 Target Audience

TagLens is built for Power Users who demand more than basic file management:

- **🎨 Creatives**: Designers, editors, and artists managing massive assets (images, videos, audio, fonts).
- **📚 Knowledge Workers**: Researchers and students building knowledge networks with documents, notes, and e-books.
- **💻 Developers**: Programmers managing code snippets, docs, configs, and resources across projects.
- **🗂️ Digital Organizers**: Anyone looking to escape "folder hell" and pursue ultimate efficiency and order.

## 🚀 Key Features

- **🏷️ Smart Tagging System**: Create custom tags with colors. Tag files instantly and filter by tag combinations.
- **👁️ Real-time Monitoring**: Automatically tracks file additions, modifications, and deletions in watched directories using `chokidar`.
- **⚡ High-Performance Indexing**: Built-in `better-sqlite3` database handles tens of thousands of file records with millisecond-level query response.
- **🖱️ Drag & Drop Support**: Seamlessly drag files from TagLens to other applications (Finder, Explorer, VS Code, etc.) with OS-level integration.
- **📄 File Management**: Add individual files or entire directories to the watch list. Virtual folder support for scattered file management.
- **🖥️ Cross-Platform**: Built with Electron and Vue 3, providing a consistent and smooth experience on Windows, macOS, and Linux.

## 🛠️ Tech Stack

- **Core**: Electron, Vue 3, Vite
- **Data**: Better-SQLite3
- **Watcher**: Chokidar
- **UI**: Modern CSS3, Component-based Architecture

## 📦 Getting Started

### Prerequisites
- Node.js v16+
- npm / yarn / pnpm

### Installation & Run

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/taglens.git
   cd taglens
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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
