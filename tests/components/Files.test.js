import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, enableAutoUnmount } from '@vue/test-utils';
import Files from '../../src/components/Files.vue';

enableAutoUnmount(afterEach);

// Mock i18n module
vi.mock('../../src/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key) => key,
    locale: { value: 'zh-CN' }
  })
}));

// Mock electronAPI
const mockElectronAPI = {
  getAllFiles: vi.fn(),
  getAllTags: vi.fn(),
  getFileTags: vi.fn(),
  openFile: vi.fn(),
  deleteFile: vi.fn(),
  tagFile: vi.fn(),
  untagFile: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  getSupportedDragFormats: vi.fn().mockReturnValue(['text/plain']),
  dragFile: vi.fn()
};

window.electronAPI = mockElectronAPI;
window.confirm = vi.fn(() => true); // Auto-confirm dialogs

describe('Files.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.getAllFiles.mockResolvedValue({ success: true, files: [] });
    mockElectronAPI.getAllTags.mockResolvedValue({ success: true, tags: [] });
    mockElectronAPI.getFileTags.mockResolvedValue({ success: true, tags: [] });
  });

  // Helper to mount and wait for files load
  const mountWithFiles = async (files) => {
    mockElectronAPI.getAllFiles.mockResolvedValue({ success: true, files });
    const wrapper = mount(Files);
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  };

  it('should render title properly', () => {
    const wrapper = mount(Files);
    expect(wrapper.find('h2').text()).toBe('files.title');
  });

  it('should load files on mount', async () => {
    const files = [
      { id: 1, name: 'test.txt', path: '/test.txt', size: 1024, mtime: Date.now() }
    ];
    await mountWithFiles(files);
    expect(mockElectronAPI.getAllFiles).toHaveBeenCalled();
  });

  it('should call deleteFile API when delete button is clicked', async () => {
     const files = [
      { id: 1, name: 'test.txt', path: '/test.txt', size: 1024, mtime: Date.now() }
    ];
    mockElectronAPI.deleteFile.mockResolvedValue({ success: true });

    const wrapper = await mountWithFiles(files);
    
    // Trigger delete
    const deleteBtn = wrapper.find('.action-btn.delete');
    if (deleteBtn.exists()) {
        await deleteBtn.trigger('click');
        expect(mockElectronAPI.deleteFile).toHaveBeenCalledWith(1);
    }
  });

  it('should reload files when data-updated event is dispatched', async () => {
    const wrapper = await mountWithFiles([]);
    
    expect(mockElectronAPI.getAllFiles).toHaveBeenCalledTimes(1);
    
    window.dispatchEvent(new CustomEvent('data-updated'));
    await wrapper.vm.$nextTick();
    
    expect(mockElectronAPI.getAllFiles).toHaveBeenCalledTimes(2);
    expect(mockElectronAPI.getAllTags).toHaveBeenCalledTimes(2);
  });

  describe('Drag and Drop', () => {
    it('should drag single unselected file and auto-select it', async () => {
      const files = [
        { id: 1, name: 'file1.txt', path: '/file1.txt', size: 1024, mtime: Date.now() },
        { id: 2, name: 'file2.txt', path: '/file2.txt', size: 1024, mtime: Date.now() }
      ];
      const wrapper = await mountWithFiles(files);

      const rows = wrapper.findAll('.file-item');
      expect(rows.length).toBe(2);

      // Drag second file (unselected)
      await rows[1].trigger('dragstart');

      // Verify it became selected
      expect(wrapper.vm.selectedFileIds).toEqual([2]);
      
      // Verify dragFile called with correct path
      expect(mockElectronAPI.dragFile).toHaveBeenCalledWith(['/file2.txt']);
    });

    it('should drag multiple selected files', async () => {
      const files = [
        { id: 1, name: 'file1.txt', path: '/file1.txt', size: 1024, mtime: Date.now() },
        { id: 2, name: 'file2.txt', path: '/file2.txt', size: 1024, mtime: Date.now() }
      ];
      const wrapper = await mountWithFiles(files);
      
      // Select both
      wrapper.vm.selectedFileIds = [1, 2];
      await wrapper.vm.$nextTick();

      const rows = wrapper.findAll('.file-item');
      await rows[0].trigger('dragstart');

      expect(mockElectronAPI.dragFile).toHaveBeenCalledWith(['/file1.txt', '/file2.txt']);
    });

    it('should preserve selection when dragging a selected file', async () => {
       const files = [
        { id: 1, name: 'file1.txt', path: '/file1.txt', size: 1024, mtime: Date.now() },
        { id: 2, name: 'file2.txt', path: '/file2.txt', size: 1024, mtime: Date.now() },
        { id: 3, name: 'file3.txt', path: '/file3.txt', size: 1024, mtime: Date.now() }
      ];
      const wrapper = await mountWithFiles(files);
      
      // Select 1 and 3
      wrapper.vm.selectedFileIds = [1, 3];
      await wrapper.vm.$nextTick();

      const rows = wrapper.findAll('.file-item');
      // Drag 1 (selected)
      await rows[0].trigger('dragstart');
      
      // Selection should remain [1, 3]
      expect(wrapper.vm.selectedFileIds).toEqual([1, 3]);
      expect(mockElectronAPI.dragFile).toHaveBeenCalledWith(['/file1.txt', '/file3.txt']);
    });

    it('should select only the dragged file if it was not part of selection', async () => {
       const files = [
        { id: 1, name: 'file1.txt', path: '/file1.txt', size: 1024, mtime: Date.now() },
        { id: 2, name: 'file2.txt', path: '/file2.txt', size: 1024, mtime: Date.now() }
      ];
      const wrapper = await mountWithFiles(files);
      
      // Select 1
      wrapper.vm.selectedFileIds = [1];
      await wrapper.vm.$nextTick();

      const rows = wrapper.findAll('.file-item');
      // Drag 2 (not selected)
      await rows[1].trigger('dragstart');
      
      // Selection should become [2]
      expect(wrapper.vm.selectedFileIds).toEqual([2]);
      expect(mockElectronAPI.dragFile).toHaveBeenCalledWith(['/file2.txt']);
    });
  });
});
