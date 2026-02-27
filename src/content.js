const state = {
  translated: false,
  translating: false,
  originalTexts: new Map(),
  nodes: [],
  lastError: null
};

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);

function detectPageLanguage() {
  return (
    document.documentElement.lang ||
    document.body?.getAttribute('lang') ||
    navigator.language ||
    'auto'
  ).toLowerCase();
}

function collectTextNodes() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) continue;
    const value = node.nodeValue?.trim();
    if (!value) continue;
    if (value.length < 2) continue;
    nodes.push(node);
  }

  return nodes;
}

function chunkArray(input, size) {
  const chunks = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
}

function updateBadge(message, tone = 'info') {
  const id = '__qwen_mt_toast';
  let toast = document.getElementById(id);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = id;
    document.body.appendChild(toast);
  }

  const bg = tone === 'error' ? '#ff4d4f' : tone === 'success' ? '#16a34a' : '#2563eb';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: 2147483647,
    background: bg,
    color: '#fff',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '12px',
    boxShadow: '0 8px 20px rgba(0,0,0,.25)',
    fontFamily: 'system-ui, sans-serif'
  });

  setTimeout(() => {
    toast?.remove();
  }, 1800);
}

async function translatePage(force = false) {
  if (state.translating) return;
  if (state.translated && !force) return;

  state.translating = true;
  updateBadge('Qwen MT 正在翻译整页…');

  try {
    const settingsRes = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (!settingsRes.ok) throw new Error(settingsRes.error || '获取设置失败');

    const nodes = collectTextNodes();
    const texts = nodes.map((n) => n.nodeValue);
    if (!texts.length) {
      updateBadge('当前页面没有可翻译文本', 'info');
      return;
    }

    const chunks = chunkArray(texts, 30);
    const translatedTexts = [];

    for (const chunk of chunks) {
      const res = await chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXTS',
        payload: {
          texts: chunk,
          targetLanguage: settingsRes.settings.targetLanguage,
          sourceLanguage: detectPageLanguage(),
          model: settingsRes.settings.model
        }
      });
      if (!res.ok) throw new Error(res.error || '翻译失败');
      translatedTexts.push(...res.translations);
    }

    nodes.forEach((node, index) => {
      if (!state.originalTexts.has(node)) {
        state.originalTexts.set(node, node.nodeValue);
      }
      node.nodeValue = translatedTexts[index] || node.nodeValue;
    });

    state.nodes = nodes;
    state.translated = true;
    state.lastError = null;
    updateBadge('翻译完成', 'success');
  } catch (err) {
    state.lastError = err.message;
    updateBadge(`翻译失败：${err.message}`, 'error');
  } finally {
    state.translating = false;
  }
}

function restorePage() {
  for (const node of state.nodes) {
    if (!node.isConnected) continue;
    const original = state.originalTexts.get(node);
    if (typeof original === 'string') {
      node.nodeValue = original;
    }
  }
  state.translated = false;
  updateBadge('已恢复原文', 'info');
}

async function maybeAutoTranslate(alwaysTranslateLanguages = {}) {
  const pageLang = detectPageLanguage().split('-')[0];
  if (alwaysTranslateLanguages[pageLang]) {
    await translatePage();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === 'TOGGLE_TRANSLATION') {
      if (state.translated) {
        restorePage();
      } else {
        await translatePage();
      }
      sendResponse({ ok: true, translated: state.translated });
      return;
    }

    if (message.type === 'RETRANSLATE_PAGE') {
      if (state.translated) restorePage();
      await translatePage(true);
      sendResponse({ ok: true, translated: state.translated });
      return;
    }

    if (message.type === 'AUTO_TRANSLATE_CHECK') {
      await maybeAutoTranslate(message.alwaysTranslateLanguages);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'GET_PAGE_LANGUAGE') {
      sendResponse({ ok: true, language: detectPageLanguage() });
      return;
    }
  })();
  return true;
});
