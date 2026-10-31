# 卡阅官网

纯静态站点，无外部字体、脚本、CDN 或统计服务。所有路径均为相对路径，可直接部署在 GitHub Pages 的子路径下。生产域名为 `superreader.828696.xyz`，`site/CNAME` 已写入该域名。

## 目录

```
site/
├── index.html            主站（下载 / 更新 / 卡片 / 开发进展 / 隐私 / FAQ）
├── lab/
│   └── web-nfc.html      Web NFC 只读实验页（NDEF）
├── assets/
│   ├── styles.css        主站样式与动效
│   ├── ui.js             导航、滚动进度、进场动效（主站与 lab 共用）
│   ├── app.js            清单加载、版本比较、复制 SHA-256
│   ├── lab.css           lab 页样式
│   ├── lab.js            NDEFReader 扫描与记录渲染
│   ├── logo.svg          站点图标
│   └── og.png            1200×630 分享图
├── data/releases.json    版本清单：正式版与预览版的最新版本与历史
└── downloads/            APK 与 Windows 测试版 ZIP
```

Windows 下载是静态面板，不进入 `releases.json`，也不参与 Android 版本比较；当前提供 `SuperReader-Windows-1.1.0-preview2-r2.zip`（PC/SC 只读、未真卡验证、无代码签名）。

## 本地预览

```bash
python -m http.server 8765 --directory site
# 打开 http://127.0.0.1:8765/
```

不要直接双击 `index.html`：`fetch()` 读取 `data/releases.json` 在 `file://` 下会被浏览器拦截。

发布前检查清单、APK 大小 / SHA-256、HTML 本地链接：

```bash
node scripts/check-site.mjs
```

## 检查更新的真实边界

- 应用不会自动联网，也没有应用内自动下载或静默安装。
- 用户在“设置 → 检查更新”手动触发后，应用并发读取两个 HTTPS 清单：
  - 官网：`https://superreader.828696.xyz/data/releases.json`
  - GitHub：`https://raw.githubusercontent.com/ZSOF-Rui/SuperReader/main/site/data/releases.json`
- 只读取版本号、下载地址、大小与 SHA-256，不上传任何设备或卡片数据。
- 两个通道包名不同（`com.superreader.app` / `com.superreader.app.preview`），版本号不能跨通道比较。
- 站点上的“检查更新”是浏览器端功能：用户选择正式版或预览版通道，填入当前 `versionCode`，页面读取 `releases.json` 后按该通道比较并给出下载入口。
- 浏览器只在 `localStorage` 中缓存最近一次输入的 `versionCode` 与所选通道，不上传任何数据。

## Web NFC 实验页

`lab/web-nfc.html` 是独立的只读 NDEF 演示，不接入主站下载面板，也不写入版本清单。主站只保留下载区里的 Windows 测试版面板；本页只保留直达 URL：

- 只在 **Android Chrome / Chromium** 且页面处于 HTTPS 或 localhost、保持前台时可用；桌面浏览器、Firefox、iOS Safari 不提供 `NDEFReader`，页面会显示“Web NFC API 不可用”并禁用扫描，这是预期行为。
- 只解码 NDEF 的文本、网址、MIME、Smart Poster 与未知记录；不写标签、不上传、不保存。
- **不能**读交通卡、银行卡或护照芯片：Web NFC 不暴露 ISO 7816 APDU，也不支持 FeliCa 与 MIFARE Classic。
- 真机测试：电脑运行 `python -m http.server 8765 --directory site`，执行 `adb reverse tcp:8765 tcp:8765`，手机 Chrome 打开 `http://localhost:8765/lab/web-nfc.html`。
- 页面不加载任何第三方脚本、字体或统计资源。

## 更新清单流程

1. 构建对应渠道的 APK，复制到 `site/downloads/`，文件名带版本号，不覆盖旧文件。
2. 计算大小与哈希：

   ```bash
   stat -c '%s' site/downloads/SuperReader-<版本>.apk
   sha256sum site/downloads/SuperReader-<版本>.apk
   ```

3. 更新 `data/releases.json` 对应渠道（`stable` 或 `preview`）：
   - 旧的 `latest` 移入该渠道的 `history`（可保留下载与哈希，便于回滚）；
   - 写入新的 `versionName`、`versionCode`、`releasedAt`、`file`、`sizeBytes`、`sha256`、`notes`；
   - 同一渠道的 `versionCode` 必须大于上一版，更新才会被识别；两个渠道的版本号互不比较。
4. 同步更新 `index.html` 中展示的版本、大小与 SHA-256。
5. 运行 `node scripts/check-site.mjs`，提交 `site/` 变更。Pages 工作流会先跑同一检查再部署。

`scripts/check-site.mjs` 会扫描 `site/**/*.html`（含 `lab/web-nfc.html`），按每个页面所在目录解析相对链接，拒绝绝对路径、越界路径、缺失资源与第三方脚本 / 样式；同时校验清单字段、APK 是否真实存在、大小、ZIP 头、SHA-256，要求同时存在 `stable` 与 `preview` 渠道，并拒绝其他渠道。

## GitHub Pages 与自定义域名

1. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 推送到 `main` 后，`.github/workflows/site-check.yml` 先检查清单，`.github/workflows/pages.yml` 再部署 `site/`。
3. `site/CNAME` 指定 `superreader.828696.xyz`。域名服务商需添加：

   | 类型 | 主机记录 | 值 |
   | --- | --- | --- |
   | CNAME | `superreader` | `zsof-rui.github.io` |

4. 在 Pages 设置中确认 Custom domain 为 `superreader.828696.xyz`，并启用 HTTPS。
5. DNS 生效前，`https://zsof-rui.github.io/SuperReader/` 仍可访问；GitHub 清单路径不依赖自定义域名。

## 发布状态与限制

- 当前下载是 **debug / 测试签名**，不是应用商店正式签名包。
- 公开站点与版本清单包含正式版 1.6.0 与预览版 1.7.0-preview1；开发版 1.8.0-dev1 留给内部测试，不在此发布。
- 下载区另有 Windows 1.1.0-preview2 测试包：PC/SC 只读，未在真实读卡器与真实银行卡上验收，无代码签名。
- 主站只保留 Android 下载、Windows 测试版下载、功能、卡片、开发进展、隐私与 FAQ。
