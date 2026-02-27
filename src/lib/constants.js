export const DEFAULT_SETTINGS = {
  enabled: true,
  autoTranslate: true,
  targetLanguage: 'zh-CN',
  provider: {
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey: '',
    timeoutMs: 30000
  },
  model: 'qwen-mt-turbo',
  models: [
    'qwen-mt-turbo',
    'qwen-mt-plus',
    'qwen-mt-max'
  ],
  alwaysTranslateLanguages: {
    en: true,
    ja: true
  }
};

export const STORAGE_KEY = 'qwenMtTranslatorSettings';
export const TAB_STATE_KEY = 'qwenMtTranslatorTabState';
