<template>
  <div class="dashboard">
    <h2>仪表盘</h2>
    
    <!-- 统计卡片区域 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-content">
          <div class="stat-number">{{ fileCount }}</div>
          <div class="stat-label">已索引文件</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏷️</div>
        <div class="stat-content">
          <div class="stat-number">{{ tagCount }}</div>
          <div class="stat-label">已创建标签</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📂</div>
        <div class="stat-content">
          <div class="stat-number">{{ watchedDirs.length }}</div>
          <div class="stat-label">监控目录</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-number">{{ dbSizeFormatted }}</div>
          <div class="stat-label">数据库大小</div>
        </div>
      </div>
    </div>
    
    <!-- 最近活动 -->
    <div class="recent-activity">
      <h3>最近活动</h3>
      <div class="activity-list">
        <div class="activity-item" v-for="(activity, index) in recentActivities" :key="index">
          <span class="activity-icon">{{ activity.icon }}</span>
          <span class="activity-text">{{ activity.text }}</span>
          <span class="activity-time">{{ activity.time }}</span>
        </div>
        <div v-if="recentActivities.length === 0" class="no-activity">
          暂无活动记录
        </div>
      </div>
    </div>
    
    <!-- 快速操作 -->
    <div class="quick-actions">
      <h3>快速操作</h3>
      <div class="action-buttons">
        <button class="action-btn primary" @click="selectAndIndexDirectory">
          <span class="btn-icon">➕</span>
          添加并索引目录
        </button>
        <button class="action-btn secondary" @click="refreshAllIndexes">
          <span class="btn-icon">🔄</span>
          刷新所有索引
        </button>
        <button class="action-btn secondary" @click="viewAllFiles">
          <span class="btn-icon">📋</span>
          查看所有文件
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

// 状态数据
const fileCount = ref(0);
const tagCount = ref(0);
const watchedDirs = ref([]);
const dbSize = ref(0);
const recentActivities = ref([
  { icon: '🆕', text: '应用已启动', time: '刚刚' },
  { icon: '📊', text: '数据库已初始化', time: '刚刚' }
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
      watchedDirs.value = dirsResponse.directories;
    } else {
      console.error('获取监控目录失败:', dirsResponse.error);
    }
    
    // 模拟数据库大小
    dbSize.value = Math.floor(Math.random() * 1024 * 1024); // 模拟1MB以内的数据库大小
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
      const indexResult = await window.electronAPI.indexDirectory(directoryPath);
      if (indexResult.success) {
        // 开始监控目录
        await window.electronAPI.watchDirectory(directoryPath);
        
        // 更新活动记录
        recentActivities.value.unshift({
          icon: '📂',
          text: `已索引目录: ${directoryPath.split('/').pop()}`,
          time: '刚刚'
        });
        
        // 重新加载数据
        await loadDashboardData();
      } else {
        alert(`索引目录失败: ${indexResult.error}`);
      }
    }
  } catch (error) {
    console.error('选择并索引目录失败:', error);
    alert('操作失败，请重试');
  }
};

const refreshAllIndexes = () => {
  // 这里可以实现刷新所有索引的逻辑
  recentActivities.value.unshift({
    icon: '🔄',
    text: '刷新所有索引',
    time: '刚刚'
  });
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