# 更新检查

## 边界

- 启动后自动检查一次，发现更高版本或同版本号的新构建时弹窗提示；同一个构建只提示一次，之后不重复打扰。首次启动若已是最新或三路都查询失败，会短暂提示一次检查结果。此外只在用户进入“设置 → 检查更新”并点击按钮后发起请求。没有后台轮询、定时任务或自动下载。
- 只读取版本清单，不上传设备标识、卡号、BIN、证件信息或使用统计。
- 只使用 HTTPS；应用 Manifest 中的 `INTERNET` 权限仅用于更新检查和预览版 / 开发版的局域网读卡桥接服务。
- 下载在浏览器中完成，应用不静默安装 APK。

## 三条路径

| 来源 | 清单地址 | 下载根路径 |
| --- | --- | --- |
| 官网 | `https://superreader.828696.xyz/data/releases.json` | `https://superreader.828696.xyz/` |
| GitHub | `https://raw.githubusercontent.com/ZSOF-Rui/SuperReader/main/site/data/releases.json` | `https://raw.githubusercontent.com/ZSOF-Rui/SuperReader/main/site/` |
| 镜像站 | `https://superreader-update-ch09cuq83vg.qoder.website/data/releases.json` | `https://superreader-update-ch09cuq83vg.qoder.website/` |

三处读取同一份 `site/data/releases.json`。应用并发请求，连接超时 8 秒、读取超时 10 秒，允许 HTTPS 重定向；任一来源成功即可返回结果，三处都失败才显示失败。

部分网络会阻断 `raw.githubusercontent.com`，此时 GitHub 路径可能返回连接错误；官网或镜像站仍可完成检查。应用会分别显示三个来源的状态，不会把“某一路失败”误报成“已是最新”。镜像站只保留最新两个安装包，旧版本下载仍以官网与 GitHub 为准。

## 清单格式

```json
{
  "schemaVersion": 1,
  "channels": {
    "stable": {
      "label": "正式版",
      "packageName": "com.superreader.app",
      "latest": {
        "versionName": "2.0.0",
        "versionCode": 20,
        "releasedAt": "2026-11-06T22:21:00+08:00",
        "buildId": "20261106T141925Z",
        "builtAt": 1793974765142,
        "file": "downloads/SuperReader-2.0.0.apk",
        "sizeBytes": 13771270,
        "sha256": "4bc37d6abd1704faa645511c0f71da2dee38b9bdbe41bbe7d9c15c8aad792a06",
        "notes": ["…"]
      },
      "history": []
    }
  }
}
```

- `schemaVersion` 目前为 `1`。
- 应用按构建渠道读取 `stable` 或 `preview`；预览版不会拿正式版清单比较。
- 正式版只接受 `packageName = com.superreader.app`，预览版只接受 `com.superreader.app.preview`；开发版跳过包名校验。
- `versionCode` 必须为正整数；大于当前安装版本时直接视为更新。
- `buildId` 是构建标识，`builtAt` 是构建时间的 Unix 毫秒；两者可选。`versionCode` 相同时，只有 `buildId` 与已安装版本不同且 `builtAt` 更大才提示更新；缺少任一字段时同版本不提示。
- 应用按 `versionCode:buildId` 记录已提示的构建，同一个构建只弹一次；旧的仅按 `versionCode` 去重记录仍兼容没有 `buildId` 的清单。
- `file` 必须是 `downloads/` 下的相对路径，以 `.apk` 结尾，不能包含 `..`、反斜杠或绝对路径。
- `sha256` 必须是 64 位小写十六进制；格式不合法时仍显示版本，但不展示哈希。
- `sizeBytes`、`notes` 缺失时降级显示，不影响检查。

## 选择规则

1. 多个来源都解析成功后，选择 `versionCode` 更大的版本；`versionCode` 相同时选择 `builtAt` 更大的构建，再相同则按官网、镜像站、GitHub 的顺序取下载地址。
2. 只有 `versionCode` 更大，或版本号相同但 `buildId` 不同且 `builtAt` 更大时，才判定为可更新。
3. 部分来源失败时使用其余来源，并在对话框中显示每个来源的状态。
4. 三个来源都失败或都没有当前渠道时显示“检查失败”，提供重试与官网下载入口。
5. 公开版本与当前构建相同，或版本号相同但没有更新的构建标识时，显示“已是最新”。

## 失败示例

| 现象 | 含义 |
| --- | --- |
| `官网：Unable to resolve host` | 当前网络无法解析自定义域名（DNS 已配置好，通常是本地网络、代理或 DNS 问题） |
| `GitHub：HTTP 404` | 仓库或 `main` 分支上的清单路径不存在 |
| `镜像：HTTP 5xx` | 镜像站暂不可用，官网与 GitHub 仍可完成检查 |
| `清单中没有可用的 stable 通道` | 清单可访问，但渠道或字段不合法 |
| `检查失败` | 三个来源都没有返回可用版本 |

## 发布时同步

更新安装包后，必须同时更新以下三处，否则检查结果与站点下载会不一致：

1. `site/downloads/` 中的 APK；
2. `site/data/releases.json` 的版本号、大小、SHA-256；若版本号不变重发，还要更新 `buildId` 与 `builtAt`（`builtAt` 必须比上一构建更大）；
3. `site/index.html` 展示的版本号、大小与 SHA-256。

同版本重发只用于修复必须尽快到达已安装用户的缺陷。普通功能更新仍应递增 `versionCode`，避免用户误以为没有变化。

最后运行 `node scripts/check-site.mjs`。站点检查会拒绝大小或哈希不匹配的清单。

镜像站是仓库之外的独立产物目录：把同一份 `releases.json` 与最新正式版、预览版 APK 复制进去，重新发布后再抽查远端清单与 APK 哈希。镜像只保留最新两个包，整体不超过 50 MiB。
