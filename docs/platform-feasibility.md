# 卡阅 iOS / Windows / Web 可行性评估

- 评估日期：2026-10-31
- 评估对象：卡阅 SuperReader Android 1.6.1 正式版、1.7.0-preview2 预览版、1.8.0-dev2 开发版
- 结论口径：只讨论“技术上能否读”，不代表已立项、已排期或承诺发布
- 证据等级：**高** = 官方文档明确；**中** = 官方文档支持、需真机/真卡实测；**低** = 依赖授权、硬件或厂商条款，尚未核实

> **2026-10-31 状态更新**：Windows 已统一正式版视觉并打包为 `1.1.0-preview2` / `1.1.0-dev1`（Java Swing + PC/SC，只读白名单；dev 另有 Android 手机桥接），站点下载区已提供无签名、未真卡验收的 `1.1.0-preview2-r2` 测试包。iOS 第一切片源码仍为 CoreNFC 护照 EF.COM（只读；本机无 macOS/Xcode，**未编译、未签名、未真机验证**）。Web 侧已确认完整读卡器不可行，并交付 NDEF 只读实验页 `site/lab/web-nfc.html`。实际交付状态见 [README](../README.md) 与 [CHANGELOG](../CHANGELOG.md)。

## 0. 先给结论

| 平台 | 结论 | 能覆盖什么 | 主要缺口 |
|---|---|---|---|
| Android | 已可用 | 交通联合、城市一卡通、银联/EMV 银行卡、电子证件；三个 flavor 均含 6 张实验卡 | 实验卡仍待真卡验收 |
| iOS | **部分可行** | 电子护照/通行证（需自实现 BAC + DG2）、澳门通/T-money/EZ-Link（需卡支持可 SELECT 的 AID）、八达通/Suica（需 FeliCa entitlement） | **银行卡不可行**（Apple 不允许选择支付类 AID）；**悠游卡不可行**（CoreNFC 不支持 MIFARE Classic）；只能前台读卡 |
| Windows | **有条件可行** | 银行卡、护照、澳门通、T-money、EZ-Link（PC/SC + ISO 7816）；八达通/Suica（Sony FeliCa SDK）；悠游卡（读卡器厂商 MIFARE 命令） | 桌面通常无 NFC，必须外接读卡器；FeliCa SDK 需授权；WSA 已停止支持 |
| Web（Web NFC） | **仅 NDEF 可行** | NDEF 标签的文本、网址、MIME 与 Smart Poster 记录 | **交通卡 / 银行卡 / 护照不可行**：Web NFC 不暴露 ISO 7816 APDU；不支持 FeliCa / MIFARE Classic；仅 Android Chrome、前台、HTTPS |

一句话选型：

- **iOS 不能完整复刻 Android**：银行卡和悠游卡做不了，产品定位应收缩为“护照 + 部分交通卡”。
- **Windows 能做，但产品形态是“USB 读卡器 + 桌面应用”**，不是手机贴卡；ISO 7816 路线成熟，FeliCa 路线受授权与硬件约束。
- **Web 只能读 NDEF 标签**，读不了交通卡、银行卡与护照芯片；把它当“标签读写演示”，不要当完整产品。
- 所有平台都需要真卡验收，现有 Android 的协议结论不能直接当作 iOS/Windows/Web 的验收结果。

## 1. 现有代码的协议分层

Android 端按传输方式可以分成三类，这决定了跨平台映射：

| 传输 | 现有实现 | 卡片 | iOS 映射 | Windows 映射 |
|---|---|---|---|---|
| ISO-DEP / ISO 7816 APDU | `ApduChannel` | 银联/EMV、澳门通、T-money、EZ-Link、电子护照 | `NFCISO7816Tag` + `sendCommand` | PC/SC `SCardTransmit` 或 WinRT `SmartCardConnection` |
| FeliCa | `FelicaTransport` | 八达通（System Code `8008`）、Suica（`0003`） | `NFCFeliCaTag` + FeliCa system code entitlement | Sony FeliCa SDK / 支持 FeliCa 的 PC/SC 读卡器 |
| MIFARE Classic | `MifareBlockTransport` | 悠游卡（1K，公开默认 Key A） | **无公开 API** | 读卡器厂商伪 APDU（如 ACR122U/ACR1252U） |

工程含义：

- Windows 的 ISO 7816 路线可以最大程度复用现有 APDU 读取器逻辑；只需把 `ApduChannel` 换成 PC/SC 实现。
- iOS 的 ISO 7816 路线也能复用 APDU 读取器逻辑，但银行卡被平台策略挡住，问题不在协议代码。
- FeliCa 两端都要换传输层；Android 的 `FelicaTransport` 不能直接移植。
- 当前协议代码与 Android 传输、`java.security` 等平台能力有耦合，**不能直接把 app 模块编译到 iOS**。若要认真做跨平台，先把纯解析与报告层抽成不依赖 `android.*` 的 Kotlin 模块，再分别实现 Swift/PC-SC 传输。

## 2. iOS（CoreNFC）

### 2.1 平台能力

- `NFCTagReaderSession` 支持 ISO 7816、FeliCa、MIFARE（Ultralight / Plus / DESFire）与 ISO 15693；轮询选项对应 ISO 14443、ISO 18092、ISO 15693。
- 会话只能在前台进行，同一时刻一个会话；退到后台会话结束。官方资料给出的单次会话上限为 60 秒。
- 需要开启 NFC Tag Reading capability，并在 `Info.plist` 写 `NFCReaderUsageDescription`；ISO 7816 在 `com.apple.developer.nfc.readersession.iso7816.select-identifiers` 中声明 AID，FeliCa 在 `com.apple.developer.nfc.readersession.felica.systemcodes` 中声明 system code。
- `NFC & SE Platform` 是 HCE/安全元件计划，不适用于本项目这种只读场景。

### 2.2 逐卡判断

| 卡片 | iOS | 依据与限制 | 证据等级 |
|---|---|---|---|
| 银联 / EMV 银行卡 | **不可行** | Apple 文档明确 `NFCTagReaderSession` 不支持选择支付相关 AID；WWDC19 也说明暂不支持读支付卡。声明 AID 也无效。 | 高 |
| 悠游卡 EasyCard | **不可行** | MIFARE Classic 不在 CoreNFC 支持范围；`NFCMiFareFamily` 没有 Classic。 | 高 |
| 护照 / 港澳台通行证 | 可行，但工作量大 | 可声明护照 AID `A0000002471001` 并发 ISO 7816 APDU；Apple 没有护照专用 API，BAC、安全消息、DG2/JPEG 2000 解码都要自己实现。60 秒内传完 DG2 是主要风险。 | 中 |
| 澳门通（ISO-DEP 版） | 有条件可行 | 需要卡片允许 SELECT 项目 AID `B0C4C3C5CDA8C7AEB0FC`，并在 entitlement 中声明；之后复用现有 APDU 读取逻辑。 | 中 |
| T-money | 有条件可行 | 需要 SELECT `D4100000030001`；余额与 SFI 4 交易均为 APDU。 | 中 |
| EZ-Link / NETS FlashPay | 有条件可行 | CEPAS 文件 4000 读取是 APDU；但 AID 发现流程需实测，部分卡可能不允许直接选择。 | 低 |
| 八达通 Octopus | 有条件可行 | 需要 FeliCa system code `8008` entitlement；余额读取与 Android 相同，但偏移回退仍需真卡确认。 | 低（授权） |
| Suica | 有条件可行 | 需要 FeliCa system code `0003` entitlement；建议作为第一个 FeliCa PoC。 | 低（授权） |

### 2.3 entitlement 与审核

- ISO 7816 的 AID 与 FeliCa 的 system code 都要写进 entitlement，并随 provisioning profile 生效。
- 官方文档要求 FeliCa system code 使用离散值，**不允许 `0xFF` 通配**；是否逐项人工预审，官方文档没有给出明确承诺，需以实际申请为准（**未核实**）。
- 应用只能前台读卡，不能做“贴一下自动后台记录”。这会改变产品交互，不能照搬 Android 的“随时贴卡”。

### 2.4 分发与工作量

- 分发走 TestFlight 或 App Store，均需审核；NFC entitlement 需要匹配的 App ID 与描述文件。
- 粗估：**3–4 人月**（1 名有 iOS/NFC 经验的开发者，不含 Apple 审核等待、真卡采购、法务与本地化）。其中护照 BAC/DG2 占比较大；若只做 Suica/八达通，范围会小一些。
- 这是估算，不是报价；实际取决于团队是否已有 Swift、CoreNFC、ICAO 9303 经验。

> 项目内部当前只完成“护照 EF.COM 公开目录”可行性切片（SwiftUI + CoreNFC，源码未公开），不包含 BAC/PACE/DG1/DG2；上述 3–4 人月对应完整护照读取，不是该切片的工作量。

## 3. Windows 10 / 11

### 3.1 平台能力

- PC/SC 是成熟路线：`SCardTransmit` 可直接发 ISO 7816 APDU；WinRT 的 `Windows.Devices.SmartCards.SmartCardConnection.TransmitAsync` 也可用（Windows 10 10240+）。
- 桌面/笔记本通常没有内置 NFC，必须外接 USB 读卡器。产品体验从“手机贴卡”变成“放卡到读卡器”。
- **WSA 已于 2025-03-05 停止支持并下架**，不能把 Android APK 当作 Windows 方案。

### 3.2 读卡器与卡片

| 卡片 | Windows | 路径与限制 | 证据等级 |
|---|---|---|---|
| 银联 / EMV 银行卡 | 可行 | PC/SC APDU；与 Android 的 ISO 7816 读取器逻辑同构。 | 高 |
| 护照 / 港澳台通行证 | 可行 | PC/SC APDU + BAC/DG2；没有 iOS 的 60 秒会话限制，传输更从容。 | 高 |
| 澳门通（ISO-DEP 版） | 可行 | PC/SC APDU；真卡验证 AID 与文件权限。 | 中 |
| T-money | 可行 | PC/SC APDU；真卡验证 SFI 4。 | 中 |
| EZ-Link / NETS FlashPay | 可行 | PC/SC APDU；CEPAS 文件读取不依赖手机 NFC 限制。 | 中 |
| 八达通 / Suica | 有条件可行 | Windows 没有通用 FeliCa 栈。Sony 的 SDK for NFC/FeliCa 支持 Windows，但评估版有期限且禁止生产使用，量产需付费 runtime license；ACR1252U 等读卡器虽支持 FeliCa，业务命令仍需实测。 | 低 |
| 悠游卡 EasyCard | 有条件可行 | Windows 无 MIFARE Classic 系统 API；ACR122U/ACR1252U 可通过厂商伪 APDU 操作。libnfc 走 WinUSB 驱动，与 PC/SC 互斥，部署复杂。 | 低 |

### 3.3 技术选型

- **最快 PoC**：Compose Desktop + `javax.smartcardio`。可以复用现有 Kotlin 解析层与大部分 UI 思路，先验证 PC/SC 读银行卡/护照。
- **产品化建议**：WinUI 3 / .NET 8 + PC/SC。原生集成、MSIX 打包、厂商 SDK（多为 C#/C++）更顺；但 UI 需要重写。
- **不建议**：Electron + 原生插件也能做，但读卡器驱动、签名、分发链更长；对本项目没有明显收益。
- MSIX 必须签名，证书链要落到受信根；商店代签可降低门槛，非商店新应用会经历 SmartScreen 信誉期。

### 3.4 工作量

- 粗估：**4–6 人月**（1 名桌面开发者，不含 Sony/读卡器授权谈判、硬件采购、MSIX 证书与商店审核）。
- ISO 7816-only 版本可以更小；一旦加入 FeliCa，授权与硬件适配会成为关键路径。
- 这是估算，不是报价。

## 4. 浏览器（Web NFC）

### 4.1 平台能力

- Web NFC 是 W3C 规范，Chromium 系实现；目前只在 **Android Chrome/Chromium** 暴露 `NDEFReader`。桌面 Chrome/Edge、Firefox 与 iOS Safari 均不提供。
- 需要安全上下文（HTTPS 或 localhost）、用户手势、页面处于前台；切后台、锁屏或离开页面即停止扫描。
- API 只处理 **NDEF 消息**：`NDEFReader.scan()` 读取，`write()` 写入；可以拿到记录类型、媒体类型、数据与标签序列号。
- `NDEFReader` 不提供 ISO 7816 APDU、FeliCa 命令、MIFARE Classic 扇区读取，也没有通用 `transceive`。

### 4.2 逐卡判断

| 卡片 | Web NFC | 依据 |
|---|---|---|
| 交通联合 / 城市一卡通 | **不可行** | 非 NDEF；需要 ISO 7816 APDU 选择应用并读取文件，Web NFC 不暴露 APDU。 |
| 银联 / EMV 银行卡 | **不可行** | 支付应用依赖 APDU；浏览器也不允许访问支付类 AID，没有 EMV 交易流程。 |
| 护照 / 港澳台通行证 | **不可行** | 需要 BAC/PACE 与安全消息，Web NFC 不暴露 APDU 或密钥协商。 |
| 八达通 / Suica | **不可行** | FeliCa 专有命令，Web NFC 不提供。 |
| 悠游卡 EasyCard | **不可行** | MIFARE Classic 扇区认证，Web NFC 不提供。 |
| NDEF 标签 | **可行** | 文本、网址、MIME、Smart Poster；只读演示，不写标签。 |

### 4.3 其他浏览器路径为什么不做

- **WebUSB + 读卡器**：桌面 Chromium 可用，但需要厂商协议与驱动，Android/iOS 支持差；本质是“浏览器套桌面读卡器”，不是手机贴卡。
- **WebHID / Web Bluetooth**：没有通用 PC/SC 或 NFC 标签语义，硬件兼容与权限模型复杂。
- **原生桥接 / PWA 原生插件**：最终仍回到 Android 原生，不能算纯网页。
- 结论：完整网页版不成立；NDEF 只读实验成立。

### 4.4 已交付的切片与边界

- `site/lab/web-nfc.html` + `assets/lab.js`：检测安全上下文与 `NDEFReader`；启动/停止扫描；解码 text / url / mime / smart-poster / unknown；单页最多保留 6 条消息；不写标签、不上传。
- 真实硬件验证：需要 Android Chrome + 一张写好内容的 NDEF 标签；本机只有桌面浏览器，已用模拟 NDEF 记录验证渲染路径，**未做真实标签读取**。
- 文案边界：可以说“网页实验能读 NDEF 标签”；不可以说“网页版支持交通卡 / 银行卡 / 护照”。

## 5. 建议的 PoC 顺序

### iOS

1. **Suica 0x0003**：最小 FeliCa 链路，验证 entitlement、轮询、余额服务 `0x008B`。
2. **八达通 0x8008**：验证 system code 与余额偏移；必须用真卡复核 HK$15.00 歧义。
3. **电子护照**：BAC + DG1 + DG2，计时确认 60 秒内能否完成；这是 iOS 上最有差异化的能力。
4. **澳门通 / T-money / EZ-Link**：验证 AID SELECT 与 APDU；EZ-Link 重点验证 AID 发现。
5. **不做**：银行卡、悠游卡。不要在这两项上投入。

### Windows

1. **ACR1252U + PC/SC**：先读银行卡与护照，验证 `SCardTransmit` 链路。
2. **澳门通 / T-money / EZ-Link**：复用 APDU 读取器。
3. **Sony SDK + FeliCa 读卡器**：Suica → 八达通；先确认 license 与硬件供货。
4. **ACR122U / ACR1252U 伪 APDU**：悠游卡；确认驱动与部署方式。
5. **MSIX 打包与签名**：最后做，避免早期被分发问题拖住。

## 6. Go / No-Go 条件

- iOS：
  - 若 FeliCa entitlement 拿不到，iOS 只剩护照 + 部分 ISO-DEP 交通卡；产品价值明显低于 Android，需要重新评估是否值得做。
  - 银行卡不可用是平台硬限制，不应通过“声明 AID”或私有 API 绕过。
- Windows：
  - 若 Sony FeliCa SDK 的授权成本/周期不可接受，先做 ISO 7816-only 版本（银行卡 + 护照 + 部分交通卡）。
  - 若目标用户不愿外接读卡器，Windows 版本的产品假设不成立，应先做用户访谈。
- 三个平台共同前提：真卡采购与验收；模拟卡、演示卡不能替代。

## 7. 风险与未核实项

| 风险 | 影响 | 处理 |
|---|---|---|
| Apple 对 FeliCa system code 的审核口径 | 决定八达通/Suica 能否上线 | 先做 Suica PoC，向 Apple 实际申请验证 |
| iOS 60 秒会话限制 | 护照 DG2 可能传不完 | 先测真实护照；必要时缩小照片分辨率/分次读取不可行时放弃 DG2 |
| 银行卡支付 AID 限制 | iOS 无法覆盖银行卡 | 产品文案明确；不做绕过 |
| Sony FeliCa SDK 授权 | Windows FeliCa 成本与周期 | 向 Sony 询价；先做 ISO 7816-only |
| 读卡器兼容性 | 悠游卡/八达通业务命令可能失败 | 采购 ACR122U/ACR1252U/RC-S380 实测 |
| iOS App Store 审核 | NFC 用途需解释清楚 | 准备演示视频、隐私说明与使用边界 |
| 代码耦合 Android | 复用被高估 | 先抽纯 Kotlin 解析层，再评估复用比例 |
| Web NFC 仅 Android Chrome | 网页版覆盖面极窄 | 定位为实验页；不承诺跨浏览器 |
| 真实 NDEF 标签未验证 | 读取路径可能受标签类型与内容影响 | 用 Android Chrome + NTAG 标签实测 |

## 8. 给产品与文案的口径

- 可以说：“iOS 版在评估，银行卡与悠游卡受平台限制，护照和部分交通卡可行。”
- 可以说：“Windows 版需要外接读卡器，ISO 7816 类卡片可行，FeliCa 取决于授权。”
- 可以说：“网页实验只能读 NDEF 标签，读不了交通卡、银行卡和护照芯片。”
- 不可以说：“iOS/Windows 版即将发布”“全卡种支持”“和 Android 完全一致”。
- 不可以说：“网页版已支持交通卡/银行卡/护照”“浏览器可以直接读芯片 APDU”。
- 当前状态（2026-10-31）：
  - Windows：已有可运行预览包与免安装 ZIP，见 [README](../README.md)；**未接真实 PC/SC 读卡器、未做真实银行卡验收、无代码签名**。
  - iOS：仅完成内部 CoreNFC 护照 EF.COM 可行性切片；源码未公开，**没有 IPA，未编译，未真机验证**。
  - Web：已有 `site/lab/web-nfc.html` NDEF 只读实验页；桌面浏览器支持状态检测与模拟记录渲染已验证，**未用真实 NDEF 标签与 Android Chrome 实测**。
  - “iOS/Windows/Web 已有代码”不等于“已发布”或“已验收”；向用户宣传时必须保留这一区分。

## 9. 来源

访问日期：2026-10-30。优先引用官方文档；厂商页面用于硬件与授权事实。

1. Apple — `NFCTagReaderSession`: https://developer.apple.com/documentation/corenfc/nfctagreadersession
2. Apple — `NFCTagReaderSession.PollingOption`: https://developer.apple.com/documentation/corenfc/nfctagreadersession/pollingoption
3. Apple — `NFCMiFareFamily`: https://developer.apple.com/documentation/corenfc/nfcmifarefamily
4. Apple WWDC19 Session 715 — NFC 能力与限制（MIFARE Classic、支付卡）: https://developer.apple.com/videos/play/wwdc2019/715/
5. Apple — ISO 7816 AID entitlement: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.nfc.readersession.iso7816.select-identifiers
6. Apple — FeliCa system code entitlement: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.nfc.readersession.felica.systemcodes
7. Apple WWDC17 Session 718 — CoreNFC 会话与 60 秒限制: https://developer.apple.com/videos/play/wwdc2017/718/
8. Apple — Background Tag Reading: https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading
9. Apple — NFC & SE Platform: https://developer.apple.com/support/nfc-se-platform/
10. Microsoft — `SCardTransmit`: https://learn.microsoft.com/en-us/windows/win32/api/winscard/nf-winscard-scardtransmit
11. Microsoft — `SmartCardConnection.TransmitAsync`: https://learn.microsoft.com/en-us/uwp/api/windows.devices.smartcards.smartcardconnection
12. Microsoft — Windows Subsystem for Android 支持结束: https://learn.microsoft.com/en-us/windows/android/wsa/
13. Microsoft — MSIX 签名: https://learn.microsoft.com/en-us/windows/msix/package/signing-package-overview
14. Sony — RC-S380 产品页: https://www.sony.co.jp/en/Products/felica/business/products/RC-S380.html
15. Sony — SDK for NFC / FeliCa: https://felica-biz.sony.co.jp/sdk/
16. Sony — SDK 评估版说明: https://felica-biz.sony.co.jp/sdk/trial
17. ACS — ACR122U: https://www.acs.com.hk/en/products/3/acr122u-usb-nfc-reader/
18. ACS — ACR1252U 技术规格: https://www.acs.com.hk/download-manual/13476/TSP-ACR1252U-2.02.pdf
19. ICAO — Doc 9303 机读旅行证件: https://www.icao.int/publications/pages/publication.aspx?docnum=9303
20. W3C — Web NFC: https://w3c.github.io/web-nfc/
21. MDN — `NDEFReader`: https://developer.mozilla.org/en-US/docs/Web/API/NDEFReader
22. Chrome for Developers — Web NFC: https://developer.chrome.com/docs/capabilities/nfc
23. Can I use — Web NFC 浏览器支持: https://caniuse.com/webnfc

> 本报告中的工作量是粗略估算，不构成报价或交付承诺；授权、硬件、审核周期未计入。所有“可行”判断在真卡与目标设备上验证前都应保留不确定性。
