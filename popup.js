const toggle = document.querySelector("#enabled");
const status = document.querySelector("#status");

function showState(enabled) {
  toggle.checked = enabled;
  status.textContent = enabled ? "オン：購入ボタンを無効化中" : "オフ：購入ボタンを表示中";
}

chrome.storage.local.get({ enabled: true }).then(({ enabled }) => {
  showState(enabled !== false);
  toggle.disabled = false;
}).catch(() => {
  status.textContent = "設定を読み込めませんでした";
});

toggle.addEventListener("change", async () => {
  const next = toggle.checked;
  toggle.disabled = true;
  try {
    await chrome.storage.local.set({ enabled: next });
    showState(next);
  } catch {
    showState(!next);
    status.textContent = "設定を保存できませんでした";
  } finally {
    toggle.disabled = false;
  }
});
