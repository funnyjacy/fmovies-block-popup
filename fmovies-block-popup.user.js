// ==UserScript==
// @name         f-movies 禁止新标签页广告跳转
// @namespace    local.block.fmovies
// @version      1.2
// @description  删除广告覆盖层 / 弹后即关 window.open / 摘除 target=_blank
// @match        *://*.f-movies.org/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const log = (...a) => console.log('[block-ads]', ...a);

  // 1. window.open：放它真弹出来、再立刻关掉。
  //    有些播放器会检测 popunder 是否真的触发过，否则不给播；
  //    全禁会让播放按钮失灵。弹后即关两头都顾到。
  const rawOpen = window.open;
  window.open = function (url, name, features) {
    log('window.open 弹后即关:', url);
    let w = null;
    try {
      w = rawOpen.call(window, url, name, features);
      if (w) {
        try { w.close(); } catch (_) {}
      }
    } catch (_) {}
    if (!w) {
      // 被浏览器弹窗拦截时给个假 window，防广告脚本报错重试
      w = { closed: true, close() {}, focus() {}, blur() {}, postMessage() {}, document: { write() {} } };
    }
    return w;
  };

  // 2. 删除广告覆盖层：外站 <a> 盖在播放器上骗点击。
  //    只 preventDefault 不够——点击被它吃掉就到不了下面的播放器 iframe，
  //    必须把元素本身删掉，点击才能落进播放器。
  function isExternalA(a) {
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript')) return false;
    try {
      return new URL(href, location.href).origin !== location.origin;
    } catch (_) { return false; }
  }
  function purge(root) {
    root.querySelectorAll('a').forEach(a => {
      if (isExternalA(a)) {
        log('删除广告覆盖链接:', (a.getAttribute('href') || '').slice(0, 120));
        a.remove();
      } else if (a.target === '_blank') {
        a.removeAttribute('target');
      }
    });
  }
  // document-start 时机下 documentElement 可能还是 null，用 document 兜底
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'A') {
          if (isExternalA(n)) { log('删除广告覆盖链接:', (n.getAttribute('href') || '').slice(0, 120)); n.remove(); }
          else if (n.target === '_blank') n.removeAttribute('target');
        } else purge(n);
      }
    }
  });
  mo.observe(document, { childList: true, subtree: true });
  // 首轮清扫（DOM 就绪后补一遍，防漏掉 document-start 时已存在的）
  if (document.body) purge(document);
  else document.addEventListener('DOMContentLoaded', () => purge(document), { once: true });

  // 3. 点击兜底：万一覆盖层是动态重建的、在删除前的瞬间被点到，拦下外站跳转。
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (isExternalA(a)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      log('已拦截外站链接点击:', (a.getAttribute('href') || '').slice(0, 120));
    }
  }, true);

  log('反弹窗脚本已加载 @ document-start');
})();
