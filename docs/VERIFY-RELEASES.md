# 校验安装包

本站与 GitHub Release 使用同一份安装包时，SHA-256 应完全一致。下载后请先校验，再安装。

## SHA-256

Linux：

```bash
sha256sum SuperReader-1.7.2.apk
```

macOS：

```bash
shasum -a 256 SuperReader-1.7.2.apk
```

Windows PowerShell：

```powershell
Get-FileHash .\SuperReader-1.7.2.apk -Algorithm SHA256
```

Windows CMD：

```bat
certutil -hashfile SuperReader-1.7.2.apk SHA256
```

当前正式版与预览版：

| 文件 | 大小 | SHA-256 |
| --- | --- | --- |
| `SuperReader-1.7.2.apk` | 11,970,209 字节 | `3a4fda823a07afec7103ec792895102bc4c6e0820706b4a711e0004763ffc14d` |
| `SuperReader-1.8.0-preview7.apk` | 13,639,990 字节 | `28ccd164c3cf248d6b9ae86a46055fcb61aaef67fd1f8c72ba5deaf21ff1707c` |
| `SuperReader-Windows-1.1.0-preview2-r2.zip` | 23,709,516 字节 | `8021fd016e19af19b9a3bd3c2ac88534f44206449e65b8e5e701c95b1dd6c20e` |

以 `site/data/releases.json` 与 GitHub Release 附带的 `SHA256SUMS` 为准。

## Android 包名与版本

使用 Android SDK build-tools：

```bash
aapt dump badging SuperReader-1.7.2.apk | head -5
```

应看到：

- 正式版：`package: name='com.superreader.app' versionCode='17' versionName='1.7.2'`
- 预览版：`package: name='com.superreader.app.preview' versionCode='31' versionName='1.8.0-preview7'`

## 签名

当前所有 Android 包都是**测试签名**，不是生产签名：

```bash
apksigner verify --print-certs SuperReader-1.7.2.apk
```

证书主体应为 `CN=Android Debug`。如果你从其他渠道拿到签名不同的包，不要安装。

Windows 测试包**没有代码签名**；仅校验 ZIP 的 SHA-256，并确认解压后的目录来自上述官方下载地址。

## 安装建议

- 只从官网、本仓库、GitHub Release 或镜像站（`superreader-update-ch09cuq83vg.qoder.website`）下载。
- 正式版与预览版包名不同，可共存；两者的历史和卡包互不共享。
- 升级时保持签名一致；测试签名更换后，已安装版本无法覆盖升级，需要卸载重装，卸载会清除本地历史与卡包。
