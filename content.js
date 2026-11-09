(() => {
  "use strict";

  const buttonSelector = [
    "#buy-now-button",
    'input[name="submit.buy-now"]',
    "#buyNow",
    "#oneClickBuyButton",
    "#one-click-button",
    'input[name="submit.one-click-order"]',
    "#turbo-checkout-pyo-button"
  ].join(", ");

  const wrapperSelector = "#buyNow_feature_div, .a-button-oneclick";
  const activeClass = "anti-one-click-active";
  const hiddenClass = "anti-one-click-hidden";
  const labelClass = "anti-one-click-label";
  const labels = new Map();
  const buttonStates = new Map();
  let enabled = true;
  let isScheduled = false;
  let sawStorageChange = false;

  function disableButtons() {
    isScheduled = false;
    if (!enabled) return;
    document.documentElement?.classList.add(activeClass);

    for (const [target, label] of labels) {
      if (target.isConnected && label.isConnected) continue;
      label.remove();
      labels.delete(target);
    }
    for (const button of buttonStates.keys()) {
      if (!button.isConnected) buttonStates.delete(button);
    }

    for (const button of document.querySelectorAll(buttonSelector)) {
      if (!buttonStates.has(button)) {
        buttonStates.set(button, {
          disabled: button.getAttribute("disabled"),
          ariaDisabled: button.getAttribute("aria-disabled")
        });
      }
      if (!button.hasAttribute("disabled")) button.setAttribute("disabled", "disabled");
      if (button.getAttribute("aria-disabled") !== "true") {
        button.setAttribute("aria-disabled", "true");
      }

      const target = button.closest("#buyNow_feature_div")
        || button.closest(".a-button-oneclick")
        || button.closest(".a-button")
        || button;
      target.classList.add(hiddenClass);

      if (!labels.has(target)) {
        const label = document.createElement("span");
        label.className = labelClass;
        label.textContent = "今すぐ買わない";
        target.insertAdjacentElement("afterend", label);
        labels.set(target, label);
      }
    }
  }

  function restoreButtons() {
    for (const [target, label] of labels) {
      target.classList.remove(hiddenClass);
      label.remove();
    }
    labels.clear();

    for (const [button, state] of buttonStates) {
      if (state.disabled === null) button.removeAttribute("disabled");
      else button.setAttribute("disabled", state.disabled);
      if (state.ariaDisabled === null) button.removeAttribute("aria-disabled");
      else button.setAttribute("aria-disabled", state.ariaDisabled);
    }
    buttonStates.clear();
  }

  function setEnabled(value) {
    enabled = value;
    if (enabled) {
      document.documentElement?.classList.add(activeClass);
      disableButtons();
    } else {
      restoreButtons();
      document.documentElement?.classList.remove(activeClass);
    }
  }

  function scheduleDisable() {
    if (!enabled || isScheduled) return;
    document.documentElement?.classList.add(activeClass);
    isScheduled = true;
    requestAnimationFrame(disableButtons);
  }

  // Block clicks before Amazon's page handlers while the extension is on.
  document.addEventListener("click", (event) => {
    if (!enabled || !(event.target instanceof Element)) return;
    if (!event.target.closest(buttonSelector + ", " + wrapperSelector)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.enabled) return;
    sawStorageChange = true;
    setEnabled(changes.enabled.newValue !== false);
  });

  // Start in the protective state, then apply the saved preference.
  setEnabled(true);
  chrome.storage.local.get({ enabled: true }).then(({ enabled: saved }) => {
    if (!sawStorageChange) setEnabled(saved !== false);
  });

  const observer = new MutationObserver(scheduleDisable);
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["id", "name", "disabled"]
  });
})();
