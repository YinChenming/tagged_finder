import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, enableAutoUnmount } from '@vue/test-utils';
import Dashboard from '../../src/components/Dashboard.vue';

enableAutoUnmount(afterEach);

// Mock i18n
vi.mock('../../src/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key) => {
      if (key === 'dashboard.activity.indexedDir') return 'Indexed {dir}';
      return key;
    }
  })
}));

// Mock electronAPI
const mockElectronAPI = {
  getAllFiles: vi.fn(),
  getAllTags: vi.fn(),
  getWatchedDirectories: vi.fn(),
  getDatabaseInfo: vi.fn(),
  selectDirectory: vi.fn(),
  indexDirectory: vi.fn(),
  watchDirectory: vi.fn(),
  scanDirectory: vi.fn(),
  addDirectory: vi.fn()
};

window.electronAPI = mockElectronAPI;
window.alert = vi.fn();

describe('Dashboard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.getAllFiles.mockResolvedValue({ success: true, files: [] });
    mockElectronAPI.getAllTags.mockResolvedValue({ success: true, tags: [] });
    mockElectronAPI.getWatchedDirectories.mockResolvedValue({ success: true, directories: [] });
    mockElectronAPI.getDatabaseInfo.mockResolvedValue({ size: 1024 });
    mockElectronAPI.addDirectory.mockResolvedValue({ success: true });
  });

  it('should handle Windows paths correctly in activity log', async () => {
    const wrapper = mount(Dashboard);

    // Mock selectDirectory to return a Windows path
    const windowsPath = 'C:\\Users\\Test\\Documents\\Project';
    mockElectronAPI.selectDirectory.mockResolvedValue(windowsPath);
    mockElectronAPI.addDirectory.mockResolvedValue({ success: true });

    const addBtn = wrapper.find('.action-btn.primary');
    expect(addBtn.exists()).toBe(true);
    
    await addBtn.trigger('click');
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    // Check recentActivities
    const activities = wrapper.vm.recentActivities;
    expect(activities.length).toBeGreaterThan(0);
    
    const latestActivity = activities[0];
    expect(latestActivity.text).toBe('Indexed Project');
  });

  it('should reload data when data-updated event is dispatched', async () => {
    const wrapper = mount(Dashboard);
    
    // Verify initial calls
    expect(mockElectronAPI.getAllFiles).toHaveBeenCalledTimes(1);
    
    // Trigger update
    window.dispatchEvent(new CustomEvent('data-updated'));
    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    
    // Verify subsequent calls
    expect(mockElectronAPI.getAllFiles).toHaveBeenCalledTimes(2);
    expect(mockElectronAPI.getWatchedDirectories).toHaveBeenCalledTimes(2);
    expect(mockElectronAPI.getDatabaseInfo).toHaveBeenCalledTimes(2);
  });
});
