# Tagged Finder

一个功能强大的文件索引和标记工具，使用Electron和Vue.js3开发，支持跨平台运行。

## 功能特性

- **文件索引**：对指定目录下的所有文件进行索引，支持快速查找
- **标签管理**：为文件和文件夹添加自定义标签，并支持根据标签倒查文件
- **实时监控**：自动追踪目录下文件的变化（创建、修改、删除）
- **跨平台支持**：在Windows和MacOS上均可运行
- **图形化界面**：直观易用的用户界面，支持现代化的文件管理体验
- **数据库存储**：使用SQLite3存储索引数据和标签信息
- **设置管理**：支持自定义索引规则和监控设置

## 技术栈

- **前端框架**：Vue.js 3
- **构建工具**：Vite
- **跨平台桌面应用**：Electron
- **数据库**：SQLite3 (better-sqlite3)
- **文件系统监控**：chokidar
- **UI组件库**：(可根据需要添加)

## 安装与开发

### 环境要求

- Node.js v16或更高版本
- npm、yarn或pnpm包管理器

### 安装步骤

1. 克隆项目仓库
```bash
git clone <repository-url>
cd tagged_finder
```

2. 安装依赖
```bash
npm install
# 或使用yarn
yarn install
# 或使用pnpm
pnpm install
```

3. 启动开发服务器
```bash
npm run electron:dev
# 或使用yarn
yarn electron:dev
# 或使用pnpm
pnpm electron:dev
```

## 构建与打包

### 开发环境运行

```bash
npm run electron:dev
```

### 构建应用

```bash
npm run electron:build
```
构建完成后，应用程序将在`out`目录中生成。

## 项目结构

```
tagged_finder/
├── electron/             # Electron主进程代码
│   ├── main.js           # 主进程入口文件
│   └── preload.js        # 预加载脚本
├── src/                  # Vue.js源代码
│   ├── main/             # 主进程相关代码
│   ├── renderer/         # 渲染进程相关代码
│   ├── database/         # 数据库相关代码
│   ├── components/       # Vue组件
│   ├── App.vue           # 主应用组件
│   └── main.js           # Vue应用入口
├── public/               # 静态资源
├── index.html            # HTML模板
├── package.json          # 项目配置和依赖
├── vite.config.js        # Vite配置
├── .gitignore            # Git忽略文件
└── README.md             # 项目说明文档
```

## 使用指南

### 添加监控目录
1. 在应用程序界面中，点击"目录管理"标签
2. 点击"添加目录"按钮，选择要监控的目录
3. 目录将自动被索引并开始监控

### 管理标签
1. 在应用程序界面中，点击"标签"标签
2. 点击"新建标签"按钮创建新标签，设置标签名称和颜色
3. 在文件列表中，选择文件并添加标签

### 搜索文件
1. 在应用程序界面中，点击"文件"标签
2. 使用搜索框输入关键词进行搜索
3. 使用标签过滤器根据标签筛选文件

## 配置选项

### 索引设置
- **索引深度**：控制索引的深度级别
- **忽略模式**：设置要忽略的文件模式（如临时文件、系统文件等）
- **内容索引**：是否索引文件内容（影响搜索功能）

### 监控设置
- **自动监控**：应用启动时是否自动开始监控
- **监控间隔**：设置监控文件系统变化的间隔时间
- **自动扫描新文件**：是否自动扫描并索引新添加的文件

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License
