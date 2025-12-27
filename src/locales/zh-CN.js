export default {
  nav: {
    dashboard: '仪表盘',
    files: '文件',
    tags: '标签',
    directories: '目录管理',
    settings: '设置'
  },
  app: {
    title: 'Tagged Finder',
    footer: '© 2025 Tagged Finder - 文件索引与标签管理工具',
    dragDrop: {
      hint: '释放文件或目录以添加'
    }
  },
  settings: {
    title: '应用设置',
    general: {
      title: '常规设置',
      autoStart: '应用启动时自动开始监控',
      autoScan: '启动时自动扫描新文件',
      interval: '监控间隔(秒)',
      language: '界面语言',
      theme: '颜色主题'
    },
    index: {
      title: '索引设置',
      indexContent: '索引文件内容',
      depth: '内容索引深度',
      depths: {
        light: '轻量 (仅前几行)',
        medium: '中等 (前100行)',
        full: '完整 (所有内容)'
      },
      ignore: '忽略模式',
      ignorePlaceholder: '每行一个模式，例如：\n*.pdf\n*.doc\n*.txt\n.* (以.开头的隐藏文件)',
      ignoreHint: '使用glob模式匹配，每行一个'
    },
    database: {
      title: '数据库设置',
      location: '数据库位置',
      change: '更改',
      size: '数据库大小'
    },
    themes: {
      system: '跟随系统',
      light: '浅色模式',
      dark: '深色模式'
    }
  },
  dashboard: {
    title: '仪表盘',
    stats: {
      indexedFiles: '已索引文件',
      createdTags: '已创建标签',
      watchedDirs: '监控目录',
      dbSize: '数据库大小'
    },
    activity: {
      title: '最近活动',
      appStarted: '应用已启动',
      dbInitialized: '数据库已初始化',
      indexedDir: '已索引目录: {dir}',
      refreshed: '刷新了 {count}/{total} 个目录索引',
      none: '暂无活动记录',
      justNow: '刚刚'
    },
    actions: {
      title: '快速操作',
      addAndIndex: '添加并索引目录',
      refreshAll: '刷新所有索引',
      viewAll: '查看所有文件'
    }
  },
  directories: {
    title: '目录管理',
    add: {
      placeholder: '选择要监控的目录...',
      browse: '浏览目录...',
      files: '添加文件...',
      button: '添加目录'
    },
    status: {
      watching: '监控中',
      stopped: '已停止'
    },
    meta: {
      files: '文件数: {count}',
      lastIndexed: '上次索引: {date}'
    },
    actions: {
      stop: '停止监控',
      start: '开始监控',
      reindex: '重新索引',
      delete: '删除'
    },
    empty: {
      title: '暂无监控目录，请添加第一个目录',
      hint: '添加目录后，系统将自动扫描并索引其中的所有文件'
    },
    stats: {
      total: '已添加目录',
      watching: '正在监控',
      indexed: '已索引文件',
      size: '总文件大小'
    },
    delete: {
      title: '确认删除',
      message: '确定要移除目录 "{path}" 吗？',
      warning: '此操作将从索引中删除所有与此目录相关的文件。'
    }
  },
  tags: {
    title: '标签管理',
    search: {
      placeholder: '搜索标签...'
    },
    add: {
      placeholder: '输入新标签名称...',
      customColor: '自定义颜色',
      button: '添加标签'
    },
    list: {
      fileCount: '{count} 个文件'
    },
    actions: {
      viewFiles: '查看文件',
      edit: '编辑',
      delete: '删除'
    },
    empty: '暂无标签，请创建第一个标签',
    files: {
      title: '标签为 "{name}" 的文件',
      empty: '此标签下暂无文件'
    },
    edit: {
      title: '编辑标签',
      name: '标签名称',
      color: '标签颜色',
      save: '保存更改'
    },
    delete: {
      title: '确认删除',
      message: '确定要删除标签 "{name}" 吗？',
      warning: '此操作将移除所有与此标签关联的文件标记。'
    }
  },
  files: {
    title: '文件管理',
    selectAll: '全选/取消全选',
    invertSelection: '反选',
    selectedCount: '已选 {count} 项',
    searchPlaceholder: '搜索文件名...',
    advancedFilter: '高级标签筛选',
    tagFilter: '标签筛选',
    sortByName: '按名称排序',
    sortByDate: '按修改日期排序',
    sortBySize: '按大小排序',
    allTypes: '所有类型',
    images: '图片',
    videos: '视频',
    includeTags: '包含标签:',
    matchAny: '满足任意一个 (OR)',
    matchAll: '同时满足所有 (AND)',
    excludeTags: '排除标签:',
    fileName: '文件名',
    path: '路径',
    size: '大小',
    date: '修改日期',
    tags: '标签',
    actions: '操作',
    noFiles: '暂无匹配的文件',
    goToDashboard: '去仪表盘添加目录',
    fileInfo: '文件信息',
    infoName: '文件名:',
    infoPath: '完整路径:',
    infoSize: '大小:',
    infoDate: '修改日期:',
    infoIndexed: '索引时间:',
    addTag: '添加标签',
    deleteConfirm: '确定要删除文件 "{name}" 吗？'
  },
  common: {
    cancel: '取消',
    apply: '应用',
    never: '从未',
    alerts: {
      nameRequired: '请输入名称',
      selectDir: '请选择一个目录',
      dirExists: '该目录已添加',
      filesAdded: '成功添加 {count} 个文件到监控列表',
      addFailed: '添加文件失败: {error}',
      indexStarted: '索引已开始，请稍后刷新页面查看结果',
      tagRequired: '请输入标签名称'
    }
  }
}
