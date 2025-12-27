export default {
  nav: {
    dashboard: 'Dashboard',
    files: 'Files',
    tags: 'Tags',
    directories: 'Directories',
    settings: 'Settings'
  },
  app: {
    title: 'Tagged Finder',
    footer: '© 2025 Tagged Finder - File Indexing & Tag Management Tool',
    dragDrop: {
      hint: 'Drop files or directories to add'
    }
  },
  settings: {
    title: 'App Settings',
    general: {
      title: 'General',
      autoStart: 'Auto-start monitoring on launch',
      autoScan: 'Auto-scan new files on launch',
      interval: 'Monitoring Interval (s)',
      language: 'Interface Language',
      theme: 'Color Theme'
    },
    index: {
      title: 'Index Settings',
      indexContent: 'Index File Content',
      depth: 'Content Index Depth',
      depths: {
        light: 'Light (First few lines)',
        medium: 'Medium (First 100 lines)',
        full: 'Full (All content)'
      },
      ignore: 'Ignore Patterns',
      ignorePlaceholder: 'One pattern per line, e.g.:\n*.pdf\n*.doc\n*.txt\n.* (Hidden files starting with .)',
      ignoreHint: 'Use glob patterns, one per line'
    },
    database: {
      title: 'Database Settings',
      location: 'Database Location',
      change: 'Change',
      size: 'Database Size'
    },
    themes: {
      system: 'Follow System',
      light: 'Light Mode',
      dark: 'Dark Mode'
    }
  },
  dashboard: {
    title: 'Dashboard',
    stats: {
      indexedFiles: 'Indexed Files',
      createdTags: 'Created Tags',
      watchedDirs: 'Watched Directories',
      dbSize: 'Database Size'
    },
    activity: {
      title: 'Recent Activity',
      appStarted: 'App Started',
      dbInitialized: 'Database Initialized',
      indexedDir: 'Indexed directory: {dir}',
      refreshed: 'Refreshed {count}/{total} directory indexes',
      none: 'No recent activity',
      justNow: 'Just now'
    },
    actions: {
      title: 'Quick Actions',
      addAndIndex: 'Add & Index Directory',
      refreshAll: 'Refresh All Indexes',
      viewAll: 'View All Files'
    }
  },
  directories: {
    title: 'Directory Management',
    add: {
      placeholder: 'Select directory to watch...',
      browse: 'Browse...',
      files: 'Add Files...',
      button: 'Add Directory'
    },
    status: {
      watching: 'Watching',
      stopped: 'Stopped'
    },
    meta: {
      files: 'Files: {count}',
      lastIndexed: 'Last Indexed: {date}'
    },
    actions: {
      stop: 'Stop Watching',
      start: 'Start Watching',
      reindex: 'Re-index',
      delete: 'Delete'
    },
    empty: {
      title: 'No directories watched. Add your first directory.',
      hint: 'Adding a directory will automatically scan and index all files within it.'
    },
    stats: {
      total: 'Total Directories',
      watching: 'Watching',
      indexed: 'Indexed Files',
      size: 'Total Size'
    },
    delete: {
      title: 'Confirm Delete',
      message: 'Are you sure you want to remove directory "{path}"?',
      warning: 'This will remove all files associated with this directory from the index.'
    }
  },
  tags: {
    title: 'Tag Management',
    search: {
      placeholder: 'Search tags...'
    },
    add: {
      placeholder: 'Enter new tag name...',
      customColor: 'Custom Color',
      button: 'Add Tag'
    },
    list: {
      fileCount: '{count} files'
    },
    actions: {
      viewFiles: 'View Files',
      edit: 'Edit',
      delete: 'Delete'
    },
    empty: 'No tags yet. Create your first tag.',
    files: {
      title: 'Files with tag "{name}"',
      empty: 'No files with this tag'
    },
    edit: {
      title: 'Edit Tag',
      name: 'Tag Name',
      color: 'Tag Color',
      save: 'Save Changes'
    },
    delete: {
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete tag "{name}"?',
      warning: 'This will remove this tag from all associated files.'
    }
  },
  files: {
    title: 'File Management',
    selectAll: 'Select All / Deselect All',
    invertSelection: 'Invert',
    selectedCount: 'Selected {count} items',
    searchPlaceholder: 'Search filenames...',
    advancedFilter: 'Advanced Tag Filter',
    tagFilter: 'Tag Filter',
    sortByName: 'Sort by Name',
    sortByDate: 'Sort by Date',
    sortBySize: 'Sort by Size',
    allTypes: 'All Types',
    images: 'Images',
    videos: 'Videos',
    includeTags: 'Include Tags:',
    matchAny: 'Match Any (OR)',
    matchAll: 'Match All (AND)',
    excludeTags: 'Exclude Tags:',
    fileName: 'Name',
    path: 'Path',
    size: 'Size',
    date: 'Date Modified',
    tags: 'Tags',
    actions: 'Actions',
    noFiles: 'No matching files found',
    goToDashboard: 'Go to Dashboard to add directories',
    fileInfo: 'File Information',
    infoName: 'Name:',
    infoPath: 'Full Path:',
    infoSize: 'Size:',
    infoDate: 'Date Modified:',
    infoIndexed: 'Date Indexed:',
    addTag: 'Add Tag',
    deleteConfirm: 'Are you sure you want to delete file "{name}"?'
  },
  common: {
    cancel: 'Cancel',
    apply: 'Apply',
    never: 'Never',
    alerts: {
      nameRequired: 'Please enter a name',
      selectDir: 'Please select a directory',
      dirExists: 'Directory already added',
      filesAdded: 'Successfully added {count} files to watch list',
      addFailed: 'Failed to add files: {error}',
      indexStarted: 'Indexing started. Please refresh the page later to see results.',
      tagRequired: 'Please enter a tag name'
    }
  }
}
