# 第三方组件与数据来源

本仓库的站点源码、文档、参考资料索引与脚本适用根目录 [LICENSE](LICENSE)。安装包与未公开的应用源码适用 [APP-LICENSE.md](APP-LICENSE.md)。以下第三方组件、数据和参考资料仍适用各自条款；本文件不改变、也不替代随包附带的许可证原文。

## Android 应用

| 组件 | 用途 | 许可 / 来源 |
| --- | --- | --- |
| Kotlin Standard Library、kotlinx.coroutines | 语言运行时与协程 | Apache License 2.0 |
| AndroidX Core、Activity、Lifecycle | 应用基础组件 | Apache License 2.0 |
| Jetpack Compose（UI、Material 3、Material Icons） | 界面 | Apache License 2.0 |
| AndroidX Splashscreen | 启动画面 | Apache License 2.0 |
| JUnit 4 | 单元测试（不进入运行时） | Eclipse Public License 1.0 |
| jp2-android 1.0.0 / OpenJPEG | 证件照 JPEG 2000 解码 | Apache License 2.0 |
| org.json 20240303 | 更新清单解析测试（不进入运行时） | JSON License |

## 离线 BIN 数据

安装包包含离线静态 BIN 表，仅用于本机显示发卡行、卡种与卡产品名。来源、修改说明、置信度和许可证原文随安装包内的数据文件一同分发，包括：

- `bankcard` 3.1.9：MIT License，Copyright (c) 2019 caijf。
- `card-bin-db` 1.0.2：MIT License，Copyright (c) 2025 checkv4。
- `banks-db` 0.23.0：Creative Commons Attribution 4.0 International（CC BY 4.0）。
- `amosnothing/card_bin`：检索时没有明确许可证；仅使用事实性 BIN 前缀、发卡行、卡种与卡产品名行，并保留来源与可移除声明。公开再分发前应自行确认条件。
- 发卡行公开公告与卡圈公开报道：仅作为低置信度补充，未获银行确认。
- 城市、卡种与站点数据参考读卡识途公开的 `tripreader-data`（CC BY 4.0），应用内保留署名。

数据可能过期、缺行或误标；卡面与银行官方信息优先。本仓库不单独再分发原始 BIN 表。

## Windows 桌面版

- 使用 JDK 17 与 `jpackage` 生成的运行时；JDK 运行时的许可与法律文件随 `runtime/legal/` 一起分发。
- 使用 Java Smart Card I/O（`java.smartcardio`）访问 PC/SC 读卡器。
- 不含 Android 的 BIN 数据、Compose 界面或第三方角色素材。

## iOS

- 当前没有公开的 iOS 安装包或源码；曾评估使用 Apple SwiftUI、CoreNFC 与 Foundation 的可行性，见 [docs/platform-feasibility.md](docs/platform-feasibility.md)。
- 没有捆绑第三方库。

## 站点与构建

- 站点为零外部依赖的静态 HTML/CSS/JavaScript，不加载第三方字体、CDN、统计或追踪脚本。
- GitHub Actions 使用 GitHub 官方 Actions（`actions/checkout`、`setup-node`、`configure-pages`、`upload-pages-artifact`、`deploy-pages` 等），适用各自仓库的许可。
- Node.js 仅用于本地/CI 检查脚本，不进入应用或站点运行时。

## 未包含在仓库中的材料

以下材料因版权、许可或第三方权利原因不纳入公开仓库：

- 第三方 APK、第三方数据目录与逆向分析产物（例如 BusCard-Info、TripReader 相关文件）。
- GB/T、EMV 等规范 PDF；只在本地作为阅读参考，不再分发。
- 含第三方角色形象的宣传图与角色素材。
- 真实卡片数据、证件照片、卡号、密钥、签名文件与任何用户数据。

如果你认为某处署名或授权不完整，请通过仓库 Issue 指出，我们会核对来源并修正或移除相应内容。
