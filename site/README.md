# 卡阅官网

纯静态站点，无外部字体、脚本、CDN 或统计服务。所有路径均为相对路径，可直接部署在 GitHub Pages 的子路径下。

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

- App 只在用户手动点“检查更新”时联网：同时通过 HTTPS 读取 `https://superreader.828696.xyz/data/releases.json`、`https://raw.githubusercontent.com/ZSOF-Rui/SuperReader/main/site/data/releases.json` 与 `https://superreader-update-ch09cuq83vg.qoder.website/data/releases.json`，选 versionCode 更高的清单；单条失败时使用其余来源，三处都失败则提示网络错误。应用不会自动检查，也不会上传卡片数据。
- 更新清单只包含版本号、安装包路径、大小、SHA-256 与说明；App 校验包名与 APK 相对路径，不自动下载或安装。
- 站点上的“检查更新”是浏览器端功能：用户选择正式版或预览版通道，填入当前 `versionCode`，页面读取 `releases.json` 后按该通道比较并给出下载入口。
- 两个通道包名不同（`com.superreader.app` / `com.superreader.app.preview`），版本号不能跨通道比较；页面会让用户先选通道。
- 浏览器只在 `localStorage` 中缓存最近一次输入的 `versionCode` 与所选通道，不上传任何数据。

## Web NFC 实验页

`lab/web-nfc.html` 是独立的只读 NDEF 演示，不接入主站下载面板，也不写入版本清单。主站已移除跨平台对比区与相关入口，但保留下载区里的 Windows 测试版面板；本页只保留直达 URL：

- 只在 **Android Chrome / Chromium** 且页面处于 HTTPS 或 localhost、保持前台时可用；桌面浏览器、Firefox、iOS Safari 不提供 `NDEFReader`，页面会显示“Web NFC API 不可用”并禁用扫描，这是预期行为。
- 只解码 NDEF 的文本、网址、MIME、Smart Poster 与未知记录；不写标签、不上传、不保存。
- **不能**读交通卡、银行卡或护照芯片：Web NFC 不暴露 ISO 7816 APDU，也不支持 FeliCa 与 MIFARE Classic。
- 真机测试：电脑运行 `python -m http.server 8765 --directory site`，执行 `adb reverse tcp:8765 tcp:8765`，手机 Chrome 打开 `http://localhost:8765/lab/web-nfc.html`。
- 真实标签读取需 Android Chrome + 写好内容的 NDEF 标签；当前开发环境只有桌面浏览器，已用模拟 NDEF 记录验证渲染路径，**未做真实标签读取**。
- 页面不加载任何第三方脚本、字体或统计资源。

## 更新清单流程

1. 构建对应 flavor 的 debug APK，复制到 `site/downloads/`，文件名带版本号，不覆盖旧文件。
2. 计算大小与哈希：

   ```bash
   stat -c '%s' site/downloads/SuperReader-<版本>.apk
   sha256sum site/downloads/SuperReader-<版本>.apk
   ```

3. 更新 `data/releases.json` 对应渠道（`stable` 或 `preview`）：
   - 旧的 `latest` 移入该渠道的 `history`（可保留下载与哈希，便于回滚）；
   - 写入新的 `versionName`、`versionCode`、`releasedAt`、`file`、`sizeBytes`、`sha256`、`notes`；
   - 同一渠道的 `versionCode` 必须大于上一版，更新才会被识别；两个渠道的版本号互不比较。
   - 把同一份 `data/releases.json` 与最新两个 APK 同步到 `dist/qsite/`，并删除镜像中不再被清单引用的旧 APK。
4. 运行 `node scripts/check-site.mjs`（主站）与 `node scripts/check-qsite.mjs`（镜像），提交 `site/` 变更。`pages.yml` 会先跑主站检查再部署。

`scripts/check-site.mjs` 会扫描 `site/**/*.html`（含 `lab/web-nfc.html`），按每个页面所在目录解析相对链接，拒绝绝对路径、越界路径、缺失资源与第三方脚本 / 样式；同时校验清单字段、APK 是否真实存在、大小、ZIP 头、SHA-256，要求同时存在 `stable` 与 `preview` 渠道，并拒绝其他渠道。

## GitHub 托管

1. 公开仓库 `ZSOF-Rui/SuperReader` 只包含站点、文档、参考资料与安装包，不包含 Android / Windows / iOS 核心源码；站点位于仓库的 `site/` 目录，版本清单与 APK 一并提交。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**；`site/CNAME` 固定自定义域名为 `superreader.828696.xyz`。
3. 域名服务商处添加 CNAME 记录：`superreader` → `zsof-rui.github.io`。DNS 生效前 App 的官网路径会失败；GitHub 默认站点地址也会 301 到未解析的域名，此时只能用 GitHub raw 或 Qoder 镜像兜底，但部分网络会阻断 `raw.githubusercontent.com`。
4. `.github/workflows/pages.yml` 在 `site/**` 变更后运行 `node scripts/check-site.mjs` 并部署 `site` 目录。
5. 公开仓库不构建 Android APK；安装包由主仓库构建后复制到 `site/downloads/` 再提交。主仓库的 `.github/workflows/release.yml` 只把正式版 APK 放入 GitHub Release，不会自动改写 `releases.json`。

站点使用相对路径。设置自定义域名后，项目页 `https://zsof-rui.github.io/SuperReader/` 会 301 到 `https://superreader.828696.xyz/`；CNAME 生效前该地址无法打开，DNS 生效后 GitHub 才能签发 HTTPS 证书。

## Qoder 镜像（第三更新源）

- 镜像地址：`https://superreader-update-ch09cuq83vg.qoder.website/`
- 产物目录：`dist/qsite/`，只含镜像首页、同一份 `data/releases.json` 与当前正式版/预览版两个 APK，总大小控制在 50 MiB 内；历史版本留在 `site/downloads/`，不进入镜像。
- 更新步骤：复制新 APK 与清单 → `node scripts/check-qsite.mjs` → 用同一 Project 重新打包并发布。`dist/qsite/` 不提交到公开仓库，避免重复占用仓库空间。

工作流会在 runner 上删除 `gradle.properties` 里的本地代理配置，再使用 Gradle 8.9 / JDK 17 / Android SDK 35 构建。项目没有 Gradle Wrapper，因此依赖 `gradle/actions/setup-gradle`。

### 测试签名密钥（GitHub Actions）

GitHub 的临时 runner 不保证保留同一把 debug keystore；依赖 runner 自带的 debug 签名时，每次发布的证书可能不同，用户无法覆盖升级、只能卸载重装。为了让所有 CI / Release 包使用同一把**测试签名**密钥，在仓库 Secrets 中新增 `ANDROID_DEBUG_KEYSTORE_BASE64`：

```bash
# Git Bash / macOS / Linux：把本机已有的 debug keystore 转成单行 base64
base64 -w0 ~/.android/debug.keystore > debug.keystore.base64
# 或在 PowerShell：
# [Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\.android\debug.keystore")) | Set-Content debug.keystore.base64
```

把文件内容粘贴为 secret。工作流会把它还原到 runner 的 `~/.android/debug.keystore`（AGP 的默认 debug 签名路径）。`release.yml` 在推送 `v*` 标签时**强制要求**该 secret；`ci.yml` 未设置时只告警，方便 fork 跑测试。

注意：

- 这只是 debug / 测试签名，不是生产签名；上架前仍需 release keystore。
- 不要提交 `*.keystore`、`*.jks` 或 base64 文件；`.gitignore` 已忽略前两者。
- 该密钥一旦更换，已安装用户无法覆盖升级，必须卸载，卸载会清除本地历史与卡包。

## 发布状态与限制

- 当前下载是 **debug / 测试签名**，不是应用商店正式签名包。
- 公开站点与版本清单包含正式版 1.7.0 与预览版 1.8.0-preview1；六张实验卡随正式版发布，但均未真卡逐张验证。开发版 1.9.0-dev1 留给内部测试，不在此发布。
- 下载区另有 Windows 1.1.0-preview2 测试包：PC/SC 只读，未在真实读卡器与真实银行卡上验收，无代码签名。
- 站点已移除跨平台对比与相关描述；主站只保留 Android 下载、Windows 测试版下载、功能、卡片、开发进展、隐私与 FAQ。
- 自定义域名 `superreader.828696.xyz` 已解析到 Cloudflare（104.21.30.65 / 172.67.172.53）；GitHub Pages 默认地址 `https://zsof-rui.github.io/SuperReader/` 不依赖该 DNS。
