const statusEl = document.getElementById('status');
const targetLanguageEl = document.getElementById('targetLanguage');
const modelSelectEl = document.getElementById('modelSelect');
const autoTranslateEl = document.getElementById('autoTranslate');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#b91c1c' : '#0f766e';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function request(type, payload = {}) {
  const res = await chrome.runtime.sendMessage({ type, ...payload });
  if (!res?.ok) throw new Error(res?.error || '请求失败');
  return res;
}

async function init() {
  const { settings } = await request('GET_SETTINGS');

  targetLanguageEl.value = settings.targetLanguage;
  autoTranslateEl.checked = settings.autoTranslate;

  modelSelectEl.innerHTML = settings.models
    .map((model) => `<option value="${model}">${model}</option>`)
    .join('');
  modelSelectEl.value = settings.model;
}

document.getElementById('translateBtn').addEventListener('click', async () => {
  try {
    const tab = await getActiveTab();
    await chrome.tabs.sendMessage(tab.id, { type: 'RETRANSLATE_PAGE' });
    setStatus('已重新翻译当前页面');
  } catch (err) {
    setStatus(err.message, true);
  }
});

document.getElementById('toggleBtn').addEventListener('click', async () => {
  try {
    const tab = await getActiveTab();
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION' });
    setStatus('已切换翻译状态');
  } catch (err) {
    setStatus(err.message, true);
  }
});

targetLanguageEl.addEventListener('change', async () => {
  await request('UPDATE_SETTINGS', { patch: { targetLanguage: targetLanguageEl.value } });
  setStatus(`目标语言已设置为 ${targetLanguageEl.value}`);
});

modelSelectEl.addEventListener('change', async () => {
  await request('UPDATE_SETTINGS', { patch: { model: modelSelectEl.value } });
  setStatus(`模型切换为 ${modelSelectEl.value}`);
});

autoTranslateEl.addEventListener('change', async () => {
  await request('UPDATE_SETTINGS', { patch: { autoTranslate: autoTranslateEl.checked } });
  setStatus(autoTranslateEl.checked ? '已启用自动翻译' : '已关闭自动翻译');
});

document.getElementById('alwaysTranslateBtn').addEventListener('click', async () => {
  try {
    const tab = await getActiveTab();
    const langRes = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_LANGUAGE' });
    const pageLang = (langRes?.language || 'auto').split('-')[0];

    const { settings } = await request('GET_SETTINGS');
    const patch = {
      alwaysTranslateLanguages: {
        ...settings.alwaysTranslateLanguages,
        [pageLang]: true
      }
    };

    await request('UPDATE_SETTINGS', { patch });
    setStatus(`已将 ${pageLang} 加入“始终翻译”`);
  } catch (err) {
    setStatus(err.message, true);
  }
});

init().catch((err) => setStatus(err.message, true));
