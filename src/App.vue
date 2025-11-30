<template>
  <div class="app-container">
    <!-- 标题栏 -->
    <header class="app-header">
      <h1>Tagged Finder</h1>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 侧边栏导航 -->
      <aside class="sidebar">
        <nav class="nav-menu">
          <div class="nav-item" :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">
            <span class="nav-icon">📊</span>
            <span class="nav-label">仪表盘</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'files' }" @click="activeTab = 'files'">
            <span class="nav-icon">📁</span>
            <span class="nav-label">文件</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'tags' }" @click="activeTab = 'tags'">
            <span class="nav-icon">🏷️</span>
            <span class="nav-label">标签</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'directories' }" @click="activeTab = 'directories'">
            <span class="nav-icon">📂</span>
            <span class="nav-label">目录管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">设置</span>
          </div>
        </nav>
      </aside>

      <!-- 内容区域 -->
      <div class="content-area">
        <transition name="fade" mode="out-in">
          <Dashboard v-if="activeTab === 'dashboard'" class="tab-content" />
          <Files v-else-if="activeTab === 'files'" class="tab-content" />
          <Tags v-else-if="activeTab === 'tags'" class="tab-content" />
          <Directories v-else-if="activeTab === 'directories'" class="tab-content" />
          <Settings v-else-if="activeTab === 'settings'" class="tab-content" />
        </transition>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="app-footer">
      <p>© 2023 Tagged Finder - 文件索引与标签管理工具</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Dashboard from './components/Dashboard.vue';
import Files from './components/Files.vue';
import Tags from './components/Tags.vue';
import Directories from './components/Directories.vue';
import Settings from './components/Settings.vue';

// 活动标签页
const activeTab = ref('dashboard');

const switchTab = (tab) => {
  activeTab.value = tab;
};

// 监听切换标签的事件
window.addEventListener('switch-tab', (event) => {
  activeTab.value = event.detail.tab;
});

// 组件挂载时的初始化操作
onMounted(() => {
  console.log('Tagged Finder 应用已启动');
});
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* 标题栏 - 固定在顶部 */
.app-header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  display: flex;
  align-items: center;
}

.app-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

/* 主要内容区域 - 固定在顶部和底部之间 */
.main-content {
  display: flex;
  position: fixed;
  top: 70px; /* 与标题栏高度相同 */
  bottom: 45px; /* 与页脚高度相同 */
  left: 0;
  right: 0;
  overflow: hidden;
}

/* 侧边栏 - 固定在左侧 */
.sidebar {
  background-color: #ffffff;
  width: 240px;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  z-index: 50;
  position: fixed;
  left: 0;
  top: 70px;
  bottom: 45px;
  overflow-y: auto;
}

.nav-menu {
  padding: 1rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 1rem 2rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.nav-item:hover {
  background-color: #f5f5f5;
}

.nav-item.active {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
}

.nav-icon {
  font-size: 1.2rem;
  margin-right: 1rem;
}

.nav-label {
  font-size: 1rem;
}

/* 内容区域 - 固定在侧边栏右侧，可滚动 */
.content-area {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background-color: #fafafa;
  position: fixed;
  left: 240px;
  top: 70px;
  right: 0;
  bottom: 45px;
}

/* 页脚 - 固定在底部 */
.app-footer {
  background-color: #2c3e50;
  color: white;
  padding: 0.75rem 2rem;
  text-align: center;
  font-size: 0.875rem;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  /* 响应式内容区域 */
  .content-area {
    left: 60px;
    padding: 1rem;
  }

  .nav-label {
    display: none;
  }

  .nav-item {
    padding: 1rem;
    justify-content: center;
  }

  .nav-icon {
    margin-right: 0;
  }
}
</style>