function setStatus(text, error = false) {
  const status = document.getElementById('status');
  status.textContent = text;
  status.style.color = error ? '#dc2626' : '#16a34a';
}

async function request(type, payload = {}) {
  const res = await chrome.runtime.sendMessage({ type, ...payload });
  if (!res.ok) throw new Error(res.error || '请求失败');
  return res;
}

async function init() {
  const { settings } = await request('GET_SETTINGS');
  document.getElementById('endpoint').value = settings.provider.endpoint;
  document.getElementById('apiKey').value = settings.provider.apiKey;
  document.getElementById('timeoutMs').value = settings.provider.timeoutMs;
  document.getElementById('alwaysLangs').value = Object.keys(settings.alwaysTranslateLanguages)
    .filter((key) => settings.alwaysTranslateLanguages[key])
    .join(',');
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  try {
    const endpoint = document.getElementById('endpoint').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const timeoutMs = Number(document.getElementById('timeoutMs').value || 30000);
    const langsInput = document.getElementById('alwaysLangs').value.trim();

    const alwaysTranslateLanguages = {};
    langsInput
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .forEach((lang) => {
        alwaysTranslateLanguages[lang] = true;
      });

    await request('UPDATE_SETTINGS', {
      patch: {
        provider: { endpoint, apiKey, timeoutMs },
        alwaysTranslateLanguages
      }
    });

    setStatus('保存成功');
  } catch (err) {
    setStatus(err.message, true);
  }
});

init().catch((err) => setStatus(err.message, true));
