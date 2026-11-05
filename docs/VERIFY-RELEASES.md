# 校验安装包

本站与 GitHub Release 使用同一份安装包时，SHA-256 应完全一致。下载后请先校验，再安装。

## SHA-256

Linux：

```bash
sha256sum SuperReader-2.0.0.apk
```

macOS：

```bash
shasum -a 256 SuperReader-2.0.0.apk
```

Windows PowerShell：

```powershell
Get-FileHash .\SuperReader-2.0.0.apk -Algorithm SHA256
```

Windows CMD：

```bat
certutil -hashfile SuperReader-2.0.0.apk SHA256
```

当前正式版与预览版：

| 文件 | 大小 | SHA-256 |
| --- | --- | --- |
| `SuperReader-2.0.0.apk` | 13,771,270 字节 | `0917c8f39158ab1134ff5ba2b4f67686b12d3ead3585261f39f18c8477b7b780` |
| `SuperReader-2.0.0-preview1.apk` | 13,771,290 字节 | `3bc0cd834a1ed08bd8857a18c2973af990f1350bf9a5f6469ccaacd01a152ac2` |
| `SuperReader-Windows-1.1.0-preview2-r2.zip` | 23,709,516 字节 | `8021fd016e19af19b9a3bd3c2ac88534f44206449e65b8e5e701c95b1dd6c20e` |

以 `site/data/releases.json` 与 GitHub Release 附带的 `SHA256SUMS` 为准。本轮正式版与预览版分别升到 2.0.0 (20) 与 2.0.0-preview1 (40)，清单中的 `buildId` 均为 `20261105T172538Z`、`builtAt` 均为 `1793899538401`；两个包都新增本机交易账本与交易备注。

## Android 包名与版本

使用 Android SDK build-tools：

```bash
aapt dump badging SuperReader-2.0.0.apk | head -5
```

应看到：

- 正式版：`package: name='com.superreader.app' versionCode='20' versionName='2.0.0'`
- 预览版：`package: name='com.superreader.app.preview' versionCode='40' versionName='2.0.0-preview1'`

## 签名

当前所有 Android 包都是**测试签名**，不是生产签名：

```bash
apksigner verify --print-certs SuperReader-2.0.0.apk
```

证书主体应为 `CN=Android Debug`，证书 SHA-256 为
`c5446d7dc89f4f6474d5de9327a05f855861a62af57408d4d3a439da22ad73ac`。
同一张测试证书从 1.5.0 起一直沿用，因此新版本可以覆盖安装；如果你从其他渠道拿到签名不同的包，不要安装。

Windows 测试包**没有代码签名**；仅校验 ZIP 的 SHA-256，并确认解压后的目录来自上述官方下载地址。

## 安装建议

- 只从官网、本仓库、GitHub Release 或镜像站（`superreader-update-ch09cuq83vg.qoder.website`）下载。
- 正式版与预览版包名不同，可共存；两者的历史和卡包互不共享。
- 升级时保持签名一致；测试签名更换后，已安装版本无法覆盖升级，需要卸载重装，卸载会清除本地历史与卡包。
