import { ref, computed, reactive } from 'vue';
import zhCN from '../locales/zh-CN';
import enUS from '../locales/en-US';

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS
};

const currentLocale = ref('zh-CN');

export function useI18n() {
  const t = (path) => {
    const keys = path.split('.');
    let value = messages[currentLocale.value];
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return path; // Return key if not found
      }
    }
    
    return value;
  };

  const setLocale = (locale) => {
    if (messages[locale]) {
      currentLocale.value = locale;
    }
  };

  return {
    locale: currentLocale,
    t,
    setLocale
  };
}
