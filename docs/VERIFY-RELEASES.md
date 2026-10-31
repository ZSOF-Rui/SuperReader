# 校验安装包

本站与 GitHub Release 使用同一份安装包时，SHA-256 应完全一致。下载后请先校验，再安装。

## SHA-256

Linux：

```bash
sha256sum SuperReader-1.6.0.apk
```

macOS：

```bash
shasum -a 256 SuperReader-1.6.0.apk
```

Windows PowerShell：

```powershell
Get-FileHash .\SuperReader-1.6.0.apk -Algorithm SHA256
```

Windows CMD：

```bat
certutil -hashfile SuperReader-1.6.0.apk SHA256
```

当前正式版与预览版：

| 文件 | 大小 | SHA-256 |
| --- | --- | --- |
| `SuperReader-1.6.0.apk` | 11,840,542 字节 | `10f4c9b6c276fdc8dcc6a9c3eb83ed9c7e3c92b11f74813a5c6e3ff9513960b7` |
| `SuperReader-1.7.0-preview1.apk` | 13,509,679 字节 | `260f6d1d2375487ceecc790dbab38f62cc1e7ab7842c7c492e63d46bc2d30122` |
| `SuperReader-Windows-1.1.0-preview2-r2.zip` | 23,709,516 字节 | `8021fd016e19af19b9a3bd3c2ac88534f44206449e65b8e5e701c95b1dd6c20e` |

以 `site/data/releases.json` 与 GitHub Release 附带的 `SHA256SUMS` 为准。

## Android 包名与版本

使用 Android SDK build-tools：

```bash
aapt dump badging SuperReader-1.6.0.apk | head -5
```

应看到：

- 正式版：`package: name='com.superreader.app' versionCode='13' versionName='1.6.0'`
- 预览版：`package: name='com.superreader.app.preview' versionCode='22' versionName='1.7.0-preview1'`

## 签名

当前所有 Android 包都是**测试签名**，不是生产签名：

```bash
apksigner verify --print-certs SuperReader-1.6.0.apk
```

证书主体应为 `CN=Android Debug`。如果你从其他渠道拿到签名不同的包，不要安装。

Windows 测试包**没有代码签名**；仅校验 ZIP 的 SHA-256，并确认解压后的目录来自上述官方下载地址。

## 安装建议

- 只从官网、本仓库或 GitHub Release 下载。
- 正式版与预览版包名不同，可共存；两者的历史和卡包互不共享。
- 升级时保持签名一致；测试签名更换后，已安装版本无法覆盖升级，需要卸载重装，卸载会清除本地历史与卡包。
