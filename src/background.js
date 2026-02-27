import { DEFAULT_SETTINGS, STORAGE_KEY, TAB_STATE_KEY } from './lib/constants.js';

async function getSettings() {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEY] || {}) };
}

async function updateSettings(patch) {
  const settings = await getSettings();
  const merged = {
    ...settings,
    ...patch,
    provider: { ...settings.provider, ...(patch.provider || {}) },
    alwaysTranslateLanguages: {
      ...settings.alwaysTranslateLanguages,
      ...(patch.alwaysTranslateLanguages || {})
    }
  };
  await chrome.storage.sync.set({ [STORAGE_KEY]: merged });
  return merged;
}

async function getTabState() {
  const data = await chrome.storage.session.get(TAB_STATE_KEY);
  return data[TAB_STATE_KEY] || {};
}

async function setTabTranslation(tabId, enabled) {
  const state = await getTabState();
  state[tabId] = enabled;
  await chrome.storage.session.set({ [TAB_STATE_KEY]: state });
}

async function callQwenMt({ model, endpoint, apiKey, targetLanguage, sourceLanguage, texts }) {
  const instruction = `You are a professional webpage translator powered by Qwen MT. Translate each input line from ${sourceLanguage || 'auto-detected language'} to ${targetLanguage}. Preserve placeholders like {{...}}, URLs, numbers, and basic punctuation style. Return strictly JSON array of translated strings in the same order.`;
  const joinedText = texts.map((text, index) => `${index + 1}. ${text}`).join('\n');
  const body = {
    model,
    temperature: 0.1,
    messages: [
      { role: 'system', content: instruction },
      { role: 'user', content: joinedText }
    ]
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Qwen MT 请求失败: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Qwen MT 未返回可用翻译内容');
  }

  try {
    const normalized = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(normalized);
    if (!Array.isArray(parsed)) throw new Error('格式不是数组');
    return parsed;
  } catch {
    const lines = content
      .split('\n')
      .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
      .filter(Boolean);
    return lines;
  }
}

async function translateTexts(payload) {
  const settings = await getSettings();
  if (!settings.provider.apiKey) {
    throw new Error('未配置 API Key，请在设置页面填写');
  }

  return callQwenMt({
    model: payload.model || settings.model,
    endpoint: settings.provider.endpoint,
    apiKey: settings.provider.apiKey,
    targetLanguage: payload.targetLanguage || settings.targetLanguage,
    sourceLanguage: payload.sourceLanguage,
    texts: payload.texts
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'GET_SETTINGS': {
        sendResponse({ ok: true, settings: await getSettings() });
        return;
      }
      case 'UPDATE_SETTINGS': {
        sendResponse({ ok: true, settings: await updateSettings(message.patch) });
        return;
      }
      case 'TRANSLATE_TEXTS': {
        const translations = await translateTexts(message.payload);
        sendResponse({ ok: true, translations });
        return;
      }
      case 'SET_TAB_TRANSLATION': {
        await setTabTranslation(message.tabId, message.enabled);
        sendResponse({ ok: true });
        return;
      }
      case 'GET_TAB_STATE': {
        const state = await getTabState();
        sendResponse({ ok: true, state });
        return;
      }
      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })().catch((err) => {
    sendResponse({ ok: false, error: err.message });
  });
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === 'toggle-translation') {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION' });
  }

  if (command === 'retranslate-page') {
    chrome.tabs.sendMessage(tab.id, { type: 'RETRANSLATE_PAGE' });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url?.startsWith('http')) return;
  const settings = await getSettings();
  if (!settings.autoTranslate) return;
  chrome.tabs.sendMessage(tabId, {
    type: 'AUTO_TRANSLATE_CHECK',
    alwaysTranslateLanguages: settings.alwaysTranslateLanguages
  });
});
