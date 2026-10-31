# 更新检查

## 边界

- 只在用户进入“设置 → 检查更新”并点击按钮后发起请求，没有后台轮询、开机自检或自动下载。
- 只读取版本清单，不上传设备标识、卡号、BIN、证件信息或使用统计。
- 只使用 HTTPS；应用 Manifest 中的 `INTERNET` 权限仅为该功能和开发版的局域网读卡桥接服务。
- 下载在浏览器中完成，应用不静默安装 APK。

## 两条路径

| 来源 | 清单地址 | 下载根路径 |
| --- | --- | --- |
| 官网 | `https://superreader.828696.xyz/data/releases.json` | `https://superreader.828696.xyz/` |
| GitHub | `https://raw.githubusercontent.com/ZSOF-Rui/SuperReader/main/site/data/releases.json` | `https://raw.githubusercontent.com/ZSOF-Rui/SuperReader/main/site/` |

两条路径读取同一份 `site/data/releases.json`。应用并发请求，连接超时 8 秒、读取超时 10 秒，允许 HTTPS 重定向；任一来源成功即可返回结果，两个都失败才显示失败。

## 清单格式

```json
{
  "schemaVersion": 1,
  "channels": {
    "stable": {
      "label": "正式版",
      "packageName": "com.superreader.app",
      "latest": {
        "versionName": "1.6.0",
        "versionCode": 13,
        "releasedAt": "2026-10-31T19:54:44+08:00",
        "file": "downloads/SuperReader-1.6.0.apk",
        "sizeBytes": 11840542,
        "sha256": "10f4c9b6c276fdc8dcc6a9c3eb83ed9c7e3c92b11f74813a5c6e3ff9513960b7",
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
- `versionCode` 必须为正整数；只有大于当前安装版本才会提示更新。
- `file` 必须是 `downloads/` 下的相对路径，以 `.apk` 结尾，不能包含 `..`、反斜杠或绝对路径。
- `sha256` 必须是 64 位小写十六进制；格式不合法时仍显示版本，但不展示哈希。
- `sizeBytes`、`notes` 缺失时降级显示，不影响检查。

## 选择规则

1. 两个来源都解析成功后，选择 `versionCode` 更大的版本。
2. 版本号相同时优先官网，便于站点与 GitHub 内容短暂不一致时保持主站优先。
3. 一个来源失败时使用另一个来源，并在对话框中显示每个来源的状态。
4. 两个来源都失败或都没有当前渠道时显示“检查失败”，提供重试与官网下载入口。
5. 公开版本不高于当前版本时显示“已是最新”。

## 失败示例

| 现象 | 含义 |
| --- | --- |
| `官网：Unable to resolve host` | 自定义域名 DNS 未配置或当前网络无法解析 |
| `GitHub：HTTP 404` | 仓库或 `main` 分支上的清单路径不存在 |
| `清单中没有可用的 stable 通道` | 清单可访问，但渠道或字段不合法 |
| `检查失败` | 两个来源都没有返回可用版本 |

## 发布时同步

更新安装包后，必须同时更新以下三处，否则检查结果与站点下载会不一致：

1. `site/downloads/` 中的 APK；
2. `site/data/releases.json` 的版本号、大小与 SHA-256；
3. `site/index.html` 展示的版本号、大小与 SHA-256。

最后运行 `node scripts/check-site.mjs`。站点检查会拒绝大小或哈希不匹配的清单。
