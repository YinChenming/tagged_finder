<template>
  <div class="dashboard">
    <h2>{{ t('dashboard.title') }}</h2>
    
    <!-- 统计卡片区域 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-content">
          <div class="stat-number">{{ fileCount }}</div>
          <div class="stat-label">{{ t('dashboard.stats.indexedFiles') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏷️</div>
        <div class="stat-content">
          <div class="stat-number">{{ tagCount }}</div>
          <div class="stat-label">{{ t('dashboard.stats.createdTags') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📂</div>
        <div class="stat-content">
          <div class="stat-number">{{ watchedDirs.length }}</div>
          <div class="stat-label">{{ t('dashboard.stats.watchedDirs') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-number">{{ dbSizeFormatted }}</div>
          <div class="stat-label">{{ t('dashboard.stats.dbSize') }}</div>
        </div>
      </div>
    </div>
    
    <!-- 最近活动 -->
    <div class="recent-activity">
      <h3>{{ t('dashboard.activity.title') }}</h3>
      <div class="activity-list">
        <div class="activity-item" v-for="(activity, index) in recentActivities" :key="index">
          <span class="activity-icon">{{ activity.icon }}</span>
          <span class="activity-text">{{ activity.text }}</span>
          <span class="activity-time">{{ activity.time }}</span>
        </div>
        <div v-if="recentActivities.length === 0" class="no-activity">
          {{ t('dashboard.activity.none') }}
        </div>
      </div>
    </div>
    
    <!-- 快速操作 -->
    <div class="quick-actions">
      <h3>{{ t('dashboard.actions.title') }}</h3>
      <div class="action-buttons">
        <button class="action-btn primary" @click="selectAndIndexDirectory">
          <span class="btn-icon">➕</span>
          {{ t('dashboard.actions.addAndIndex') }}
        </button>
        <button class="action-btn secondary" @click="refreshAllIndexes">
          <span class="btn-icon">🔄</span>
          {{ t('dashboard.actions.refreshAll') }}
        </button>
        <button class="action-btn secondary" @click="viewAllFiles">
          <span class="btn-icon">📋</span>
          {{ t('dashboard.actions.viewAll') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from '../composables/useI18n';

// 状态数据
const { t } = useI18n();
const fileCount = ref(0);
const tagCount = ref(0);
const watchedDirs = ref([]);
const dbSize = ref(0);
const recentActivities = ref([
  { icon: '🆕', text: t('dashboard.activity.appStarted'), time: t('dashboard.activity.justNow') },
  { icon: '📊', text: t('dashboard.activity.dbInitialized'), time: t('dashboard.activity.justNow') }
]);

// 计算属性
const dbSizeFormatted = computed(() => {
  if (dbSize.value < 1024) return `${dbSize.value} B`;
  if (dbSize.value < 1024 * 1024) return `${(dbSize.value / 1024).toFixed(1)} KB`;
  return `${(dbSize.value / (1024 * 1024)).toFixed(1)} MB`;
});

// 方法
const loadDashboardData = async () => {
  try {
    // 获取文件统计
    const filesResponse = await window.electronAPI.getAllFiles();
    if (filesResponse.success) {
      fileCount.value = filesResponse.files.length;
    }
    
    // 获取标签统计
    const tagsResponse = await window.electronAPI.getAllTags();
    if (tagsResponse.success) {
      tagCount.value = tagsResponse.tags.length;
    }
    
    // 获取监控目录
    const dirsResponse = await window.electronAPI.getWatchedDirectories();
    if (dirsResponse.success) {
      // 过滤掉虚拟目录（虽然前端Directories组件也过滤了，但这里确保一致性）
      // 注意：electronAPI.getWatchedDirectories 已经由后端过滤了虚拟目录
      // 所以这里不需要额外处理，直接赋值即可
      watchedDirs.value = dirsResponse.directories;
    } else {
      console.error('获取监控目录失败:', dirsResponse.error);
    }
    
    // 获取数据库信息（用于获取真实大小）
    const dbInfoResponse = await window.electronAPI.getDatabaseInfo();
    if (dbInfoResponse && !dbInfoResponse.error) {
       dbSize.value = dbInfoResponse.size;
    } else {
       dbSize.value = 0;
    }
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
  }
};

const selectAndIndexDirectory = async () => {
  try {
    // 选择目录
    const directoryPath = await window.electronAPI.selectDirectory();
    if (directoryPath) {
      // 索引目录
      // 直接调用 addDirectory，它会处理添加数据库、索引和监控
      const result = await window.electronAPI.addDirectory(directoryPath);
      
      if (result.success) {
        // 更新活动记录
        recentActivities.value.unshift({
          icon: '📂',
          text: t('dashboard.activity.indexedDir').replace('{dir}', directoryPath.split(/[/\\]/).pop()),
          time: t('dashboard.activity.justNow')
        });
        
        // 重新加载数据
        await loadDashboardData();
      } else {
        alert(`索引目录失败: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('选择并索引目录失败:', error);
    alert('操作失败，请重试');
  }
};

const refreshAllIndexes = async () => {
  try {
    // 获取当前所有监控的目录
    const dirsResponse = await window.electronAPI.getWatchedDirectories();
    if (dirsResponse.success) {
      const directories = dirsResponse.directories;
      let successCount = 0;
      
      // 逐个重新索引
      for (const dir of directories) {
        const result = await window.electronAPI.scanDirectory(dir.id);
        if (result.success) {
          successCount++;
        }
      }
      
      // 更新活动记录
      recentActivities.value.unshift({
        icon: '🔄',
        text: t('dashboard.activity.refreshed').replace('{count}', successCount).replace('{total}', directories.length),
        time: t('dashboard.activity.justNow')
      });
      
      // 重新加载仪表盘数据
      await loadDashboardData();
    } else {
      console.error('获取目录失败:', dirsResponse.error);
    }
  } catch (error) {
    console.error('刷新索引失败:', error);
  }
};

const viewAllFiles = () => {
  // 切换到文件标签页
  const appComponent = document.querySelector('.app-container');
  if (appComponent) {
    // 通过事件触发切换
    const event = new CustomEvent('switch-tab', { detail: { tab: 'files' } });
    window.dispatchEvent(event);
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadDashboardData();
  window.addEventListener('data-updated', loadDashboardData);
});

onUnmounted(() => {
  window.removeEventListener('data-updated', loadDashboardData);
});
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 2rem;
  color: #2c3e50;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2.5rem;
  margin-right: 1rem;
  background: #f5f5f5;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
}

.stat-label {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

/* 最近活动 */
.recent-activity {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recent-activity h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
  font-size: 1.25rem;
}

.activity-list {
  max-height: 200px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #ecf0f1;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 1.2rem;
  margin-right: 1rem;
  min-width: 24px;
  text-align: center;
}

.activity-text {
  flex: 1;
  color: #34495e;
}

.activity-time {
  color: #95a5a6;
  font-size: 0.85rem;
}

.no-activity {
  text-align: center;
  color: #95a5a6;
  padding: 2rem;
  font-style: italic;
}

/* 快速操作 */
.quick-actions {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quick-actions h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
  font-size: 1.25rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: #2196f3;
  color: white;
}

.action-btn.primary:hover {
  background: #1976d2;
}

.action-btn.secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.action-btn.secondary:hover {
  background: #bdc3c7;
}

.btn-icon {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>