# 校验安装包

本站与 GitHub Release 使用同一份安装包时，SHA-256 应完全一致。下载后请先校验，再安装。

## SHA-256

Linux：

```bash
sha256sum SuperReader-1.6.1.apk
```

macOS：

```bash
shasum -a 256 SuperReader-1.6.1.apk
```

Windows PowerShell：

```powershell
Get-FileHash .\SuperReader-1.6.1.apk -Algorithm SHA256
```

Windows CMD：

```bat
certutil -hashfile SuperReader-1.6.1.apk SHA256
```

当前正式版与预览版：

| 文件 | 大小 | SHA-256 |
| --- | --- | --- |
| `SuperReader-1.6.1.apk` | 11,837,625 字节 | `90fed5aa6314c76478c86447bfb267ced0143a40871b5efedb826521e240fc0b` |
| `SuperReader-1.7.0-preview2.apk` | 13,506,766 字节 | `c11c6d67239b4bd3b2cda250d95436e302ecf17d4cbac19386d0a8806f65e74d` |
| `SuperReader-Windows-1.1.0-preview2-r2.zip` | 23,709,516 字节 | `8021fd016e19af19b9a3bd3c2ac88534f44206449e65b8e5e701c95b1dd6c20e` |

以 `site/data/releases.json` 与 GitHub Release 附带的 `SHA256SUMS` 为准。

## Android 包名与版本

使用 Android SDK build-tools：

```bash
aapt dump badging SuperReader-1.6.1.apk | head -5
```

应看到：

- 正式版：`package: name='com.superreader.app' versionCode='14' versionName='1.6.1'`
- 预览版：`package: name='com.superreader.app.preview' versionCode='23' versionName='1.7.0-preview2'`

## 签名

当前所有 Android 包都是**测试签名**，不是生产签名：

```bash
apksigner verify --print-certs SuperReader-1.6.1.apk
```

证书主体应为 `CN=Android Debug`。如果你从其他渠道拿到签名不同的包，不要安装。

Windows 测试包**没有代码签名**；仅校验 ZIP 的 SHA-256，并确认解压后的目录来自上述官方下载地址。

## 安装建议

- 只从官网、本仓库、GitHub Release 或镜像站（`superreader-update-ch09cuq83vg.qoder.website`）下载。
- 正式版与预览版包名不同，可共存；两者的历史和卡包互不共享。
- 升级时保持签名一致；测试签名更换后，已安装版本无法覆盖升级，需要卸载重装，卸载会清除本地历史与卡包。
