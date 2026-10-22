/* 轻燃 PWA · 安装引导与离线缓存注册 */
(function () {
  "use strict";
  const A = window.Qingran;
  if (!A || !A.isPwa) return;

  const DISMISS_KEY = "qingran.installDismissedAt";
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMobile = () => window.matchMedia("(max-width: 820px)").matches;
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: fullscreen)").matches;

  let deferredPrompt = null;
  let banner = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./", updateViaCache: "none" })
        .catch((err) => console.warn("轻燃离线缓存注册失败", err));
    });
  }

  if (navigator.storage && typeof navigator.storage.persist === "function") {
    navigator.storage.persist().catch(() => {});
  }

  function dismissedRecently() {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return at && Date.now() - at < 7 * 24 * 60 * 60 * 1000;
    } catch (err) {
      return false;
    }
  }

  function rememberDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (err) {}
  }

  function hideBanner() {
    if (banner) banner.remove();
    banner = null;
  }

  function showBanner() {
    if (!A.state.onboarded || !isMobile() || isStandalone() || dismissedRecently() || banner) return;
    banner = document.createElement("div");
    banner.className = "pwa-install-banner";
    banner.innerHTML = `
      <img src="icons/icon-192.png" alt="" class="pwa-install-icon">
      <div class="pwa-install-copy">
        <strong>把轻燃放到手机桌面</strong>
        <span>像 App 一样打开，离线也能记录</span>
      </div>
      <button class="pwa-install-action" type="button">安装</button>
      <button class="pwa-install-close" type="button" aria-label="关闭安装提示">×</button>`;
    document.body.appendChild(banner);
    banner.querySelector(".pwa-install-close").addEventListener("click", () => {
      rememberDismiss();
      hideBanner();
    });
    banner.querySelector(".pwa-install-action").addEventListener("click", installNow);
  }

  async function installNow() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          hideBanner();
          return;
        }
        deferredPrompt = null;
        return;
      } catch (err) {
        deferredPrompt = null;
      }
    }
    showInstallHelp();
  }

  function showInstallHelp() {
    if (document.querySelector(".pwa-help-backdrop")) return;
    const steps = isIOS
      ? [
          "用 Safari 打开当前页面",
          "点屏幕底部的「分享」按钮",
          "向下滑，选择「添加到主屏幕」",
          "点右上角「添加」",
        ]
      : [
          "用 Chrome 打开当前页面",
          "点右上角的「⋮」菜单",
          "选择「安装应用」或「添加到主屏幕」",
          "确认安装",
        ];
    const wrap = document.createElement("div");
    wrap.className = "pwa-help-backdrop";
    wrap.innerHTML = `
      <div class="pwa-help-card" role="dialog" aria-modal="true" aria-labelledby="pwaHelpTitle">
        <button class="pwa-help-close" type="button" aria-label="关闭">×</button>
        <img src="icons/icon-192.png" alt="" class="pwa-help-icon">
        <div class="pwa-help-kicker">QINGRAN · INSTALL</div>
        <h2 id="pwaHelpTitle">把轻燃装到主屏幕</h2>
        <p>安装后可以全屏打开，没有地址栏，也不需要联网。数据仍然只存在这台手机里。</p>
        <ol class="pwa-help-steps">
          ${steps.map((step) => `<li>${step}</li>`).join("")}
        </ol>
        <div class="pwa-help-note">如果找不到“安装”选项，也可以先直接用浏览器使用，记录不会丢。</div>
        <button class="pwa-help-done" type="button">知道了</button>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector(".pwa-help-close").addEventListener("click", close);
    wrap.querySelector(".pwa-help-done").addEventListener("click", close);
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) close();
    });
  }

  window.addEventListener("qingran:onboarded", () => {
    setTimeout(showBanner, 500);
  });

  window.addEventListener("load", () => {
    setTimeout(showBanner, 1600);
  });

  window.addEventListener("appinstalled", () => {
    hideBanner();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (err) {}
  });
})();
