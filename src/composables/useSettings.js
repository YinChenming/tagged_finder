import { ref, watch } from 'vue';
import { useI18n } from './useI18n';

const settings = ref({
  language: 'zh-CN',
  theme: 'system',
  autoStartMonitoring: true,
  autoScanNewFiles: true,
  monitoringInterval: 60,
  indexContent: false,
  contentIndexDepth: 'light',
  ignorePatterns: '',
  dbPath: ''
});

const { setLocale } = useI18n();

// Initialize
let initialized = false;

export function useSettings() {
  const loadSettings = async () => {
    try {
      const response = await window.electronAPI.getSettings();
      if (response.success) {
        settings.value = { ...settings.value, ...response.settings };
        
        // Apply language
        if (settings.value.language) {
          setLocale(settings.value.language);
        }
        
        // Apply theme
        if (settings.value.theme) {
          applyTheme(settings.value.theme);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      initialized = true;
    }
  };

  const saveSetting = async (key, value) => {
    settings.value[key] = value;
    
    // Special handling
    if (key === 'language') {
      setLocale(value);
    } else if (key === 'theme') {
      applyTheme(value);
    }

    try {
      await window.electronAPI.updateSettings({ [key]: value });
      // Also sync with main process for theme source if needed
      if (key === 'theme' && window.electronAPI.setThemeSource) {
        await window.electronAPI.setThemeSource(value);
      }
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'system') {
      // Remove data-theme attribute to let CSS media queries take over (or handle system logic here)
      // Actually, best way for system follow in CSS variables is usually just using media queries.
      // But if we want to support manual override, we usually use a class or attribute.
      // Strategy:
      // - 'light': data-theme="light"
      // - 'dark': data-theme="dark"
      // - 'system': remove data-theme attribute
      root.removeAttribute('data-theme');
      // Let Electron handle the window frame
    } else {
      root.setAttribute('data-theme', theme);
    }
    
    if (window.electronAPI.setThemeSource) {
      window.electronAPI.setThemeSource(theme);
    }
  };

  return {
    settings,
    loadSettings,
    saveSetting
  };
}
