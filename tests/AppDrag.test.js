import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, enableAutoUnmount } from '@vue/test-utils';
import App from '../src/App.vue';

enableAutoUnmount(afterEach);

// Mock electronAPI
const mockElectronAPI = {
  handleDroppedPaths: vi.fn(),
  getSettings: vi.fn(),
  setThemeSource: vi.fn(),
  onMessageReply: vi.fn(),
  getAllFiles: vi.fn().mockResolvedValue({ success: true, files: [] }),
  getWatchedDirectories: vi.fn().mockResolvedValue({ success: true, directories: [] }),
  getAllTags: vi.fn().mockResolvedValue({ success: true, tags: [] }),
  addDirectory: vi.fn(),
  getDatabaseInfo: vi.fn().mockResolvedValue({ success: true, info: {} })
};

window.electronAPI = mockElectronAPI;
window.alert = vi.fn();

// Mock i18n
vi.mock('../src/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key) => key
  })
}));

// Mock Settings
vi.mock('../src/composables/useSettings', () => ({
  useSettings: () => ({
    loadSettings: vi.fn(),
    settings: { value: {} }
  })
}));

// Mock child components
vi.mock('../src/components/Dashboard.vue', () => ({ default: { template: '<div>Dashboard</div>' } }));
vi.mock('../src/components/Files.vue', () => ({ default: { template: '<div>Files</div>' } }));
vi.mock('../src/components/Tags.vue', () => ({ default: { template: '<div>Tags</div>' } }));
vi.mock('../src/components/Directories.vue', () => ({ default: { template: '<div>Directories</div>' } }));
vi.mock('../src/components/Settings.vue', () => ({ default: { template: '<div>Settings</div>' } }));

describe('App.vue Drag and Drop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.handleDroppedPaths.mockResolvedValue({ 
      success: true, 
      results: { files: 1, directories: 0, errors: [] } 
    });
    mockElectronAPI.getSettings.mockResolvedValue({});
  });

  it('should show overlay on drag enter with Files', async () => {
    const wrapper = mount(App, { attachTo: document.body });
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for onMounted async listeners
    
    const event = new Event('dragenter', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { types: ['Files'] }
    });
    
    window.dispatchEvent(event);
    await wrapper.vm.$nextTick();
    
    // Check if overlay exists
    expect(wrapper.find('.drag-overlay').exists()).toBe(true);
  });

  it('should not show overlay on drag enter without Files', async () => {
    const wrapper = mount(App, { attachTo: document.body });
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for onMounted async listeners
    
    const event = new Event('dragenter', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { types: ['text/plain'] }
    });
    
    window.dispatchEvent(event);
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('.drag-overlay').exists()).toBe(false);
  });

  it('should handle file drop correctly', async () => {
    const wrapper = mount(App, { attachTo: document.body });
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for onMounted async listeners
    
    // Simulate drag enter first
    const enterEvent = new Event('dragenter', { bubbles: true });
    Object.defineProperty(enterEvent, 'dataTransfer', {
      value: { types: ['Files'] }
    });
    window.dispatchEvent(enterEvent);
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.isDragging).toBe(true);
    
    // Simulate drop
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [
          { path: '/path/to/file1.txt' },
          { path: '/path/to/file2.txt' }
        ]
      }
    });
    
    window.dispatchEvent(dropEvent);
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async drop handler
    
    // Check if isDragging is reset
    expect(wrapper.vm.isDragging).toBe(false);
    
    // Check if electronAPI was called
    expect(mockElectronAPI.handleDroppedPaths).toHaveBeenCalledWith([
      '/path/to/file1.txt',
      '/path/to/file2.txt'
    ]);
  });
});
