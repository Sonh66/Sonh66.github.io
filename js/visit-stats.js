/* Keep the original Busuanzi dataset; make unavailable statistics explicit. */
(() => {
  'use strict';
  if (window.sonhVisitStats) return;
  window.sonhVisitStats = true;

  function init() {
    const keys = ['site_pv', 'site_uv', 'page_pv'];
    const fields = keys.map(key => [key, document.getElementById(`busuanzi_value_${key}`)]).filter(([, node]) => node);
    if (!fields.length) return;
    const canonical = document.querySelector('link[rel="canonical"]');
    const site = canonical ? new URL(canonical.href) : null;
    const preview = !site || location.hostname !== site.hostname;
    let active = false;
    let serial = 0;

    function render(state, data) {
      fields.forEach(([key, node]) => {
        node.dataset.statsState = state;
        node.setAttribute('aria-live', 'polite');
        node.replaceChildren();
        if (state === 'ready') {
          node.textContent = String(data[key]);
          node.title = '不蒜子实时统计';
        } else if (state === 'preview') {
          node.textContent = '本地预览';
          node.title = '预览环境不请求线上统计，请在正式域名查看';
        } else if (state === 'loading') {
          node.textContent = '加载中…';
          node.title = '正在获取不蒜子统计';
        } else {
          node.textContent = '暂不可用';
          node.title = '原统计服务暂未返回数据，历史数据仍保留在原服务中，可刷新页面重试';
        }
      });
    }

    function request() {
      if (active || preview) return;
      active = true;
      render('loading');
      const callback = `SonhVisitStats_${Date.now()}_${++serial}`;
      const script = document.createElement('script');
      let settled = false;
      let timer;
      function finish(data) {
        if (settled) return;
        settled = true;
        active = false;
        clearTimeout(timer);
        script.remove();
        // A response already queued before cancellation must not update newer UI.
        window[callback] = () => {};
        setTimeout(() => { delete window[callback]; }, 60000);
        const valid = data && fields.every(([key]) => Number.isSafeInteger(data[key]) && data[key] >= 0);
        render(valid ? 'ready' : 'error', data);
      }
      window[callback] = finish;
      script.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${callback}`;
      script.async = true;
      // The original service identifies the article from the HTTPS referrer.
      script.referrerPolicy = 'no-referrer-when-downgrade';
      script.onerror = () => finish(null);
      timer = setTimeout(() => finish(null), 8000);
      document.head.append(script);
    }

    if (preview) render('preview');
    else request();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
