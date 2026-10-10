# fmovies-block-popup

油猴脚本：拦截 f-movies.org 点播放时弹出的新标签页广告，且不影响播放器正常工作。

## 安装

1. 浏览器装好 [Tampermonkey](https://www.tampermonkey.net/)
2. 新建脚本，粘贴 `fmovies-block-popup.user.js` 全部内容，保存

## 原理

三层拦截，均实测有效：

| 层 | 手段 | 针对的广告方式 |
|---|---|---|
| 1 | `window.open` 弹后即关 | popunder 弹窗。真弹出来立刻 `close()`，播放器的"弹过窗"检测能过，广告窗口闪现即死 |
| 2 | 删除外站 `<a>` 覆盖层 | 播放器上盖一层透明外站链接骗点击。只拦点击不够（点击到不了播放器，按钮会"点死"），必须把元素从 DOM 删掉 |
| 3 | 摘除 `target="_blank"` | 新标签页跳转，含动态插入的 |

## 踩过的坑（改脚本别改回去）

- **document-start 时机下 `document.documentElement` 是 null**，MutationObserver 必须 observe `document`，否则脚本自爆、后面的逻辑全不执行
- **不能无差别 `stopImmediatePropagation` 点击事件**——网站自己的按钮（换服务器、选集）全靠普通 click 监听，掐了站就废了
- **覆盖层只 `preventDefault` 不够**：点击被覆盖层吃掉后不会落到下面的播放器 iframe，表现为播放按钮无反应

## 验证方式

用 CDP `Page.addScriptToEvaluateOnNewDocument`（等价于 document-start 注入）在 Chrome 调试实例里注入脚本体，实测：点 Play 视频正常播放、全程无新标签页弹出、换服务器/选集功能正常。
