# 公开参考资料与开源项目索引

这里只保留**链接、用途与许可说明**，不包含第三方源代码、APK、数据库或规范 PDF。使用前请阅读各项目自己的许可证；本仓库不改变第三方条款。

## 协议与读卡实现

| 项目 | 许可 | 与本项目的关系 |
| --- | --- | --- |
| [Metrodroid](https://github.com/metrodroid/metrodroid) | GPL-3.0 | 公共交通卡与 FeliCa 字段、帧格式的开源参考；仅用于研究与互操作对照，未包含其代码 |
| [读卡识途 Trip Reader 数据](https://github.com/domosekai/tripreader-data) | CC BY 4.0 | 城市、卡种与站点解析辅助数据；应用内保留署名，不包含其 APK、反编译代码或私有数据库 |
| [Android NFC 官方文档](https://developer.android.com/develop/connectivity/nfc) | Android 文档许可 | Reader Mode、`IsoDep`、`NfcF`、`MifareClassic` 的平台行为 |
| [Java Smart Card I/O](https://docs.oracle.com/en/java/javase/17/docs/api/java.smartcardio/module-summary.html) | JDK 文档许可 | Windows 版 PC/SC 访问与 `SCardTransmit` 语义 |
| [PC/SC Workgroup](https://pcscworkgroup.com/) | 规范站点 | 读卡器与智能卡接口背景资料 |

## 数据与 BIN

| 项目 | 许可 | 用途 |
| --- | --- | --- |
| [bankcard](https://github.com/caijf/bankcard) | MIT | BIN 底表 |
| [card-bin-db](https://github.com/checkv4/card-bin-db) | MIT | 境内外币卡、港澳台号段与全球 6 位 BIN 兜底 |
| [banks-db](https://github.com/ramoona/banks-db) | CC BY 4.0 | 港澳台银行名称与号段 |
| [amosnothing/card_bin](https://github.com/amosnothing/card_bin) | 未明确 | 仅使用事实性 BIN 前缀、发卡行、卡种与卡产品名行，保留来源与可移除声明 |

## 证件与编码

| 资料 | 说明 |
| --- | --- |
| [ICAO Doc 9303](https://www.icao.int/publications/pages/publication.aspx?docnum=9303) | 机读旅行证件与电子护照；仅引用公开字段，不随仓库分发 |
| [jp2-android / OpenJPEG](https://github.com/ThalesGroup/jp2-android) | Apache-2.0；证件照 JPEG 2000 解码依赖 |
| AndroidX / Jetpack Compose | Apache-2.0；Android 界面与基础组件 |

## Web NFC

| 资料 | 说明 |
| --- | --- |
| [W3C Web NFC](https://w3c.github.io/web-nfc/) | NDEF 只读实验页的规范依据 |
| [MDN `NDEFReader`](https://developer.mozilla.org/en-US/docs/Web/API/NDEFReader) | 浏览器 API 与支持范围 |
| [Chrome for Developers — Web NFC](https://developer.chrome.com/docs/capabilities/nfc) | Android Chrome 的实现与限制 |

Web NFC 不暴露 ISO 7816 APDU，也不支持 FeliCa 与 MIFARE Classic；它只能读取 NDEF 标签，不能读取交通卡、银行卡或护照芯片。

## 不包含的材料

- 第三方 APK、反编译产物、私有数据库与原始抓包。
- GB/T、EMV、PBOC、ICAO 等规范 PDF。
- 真实卡片数据、证件照片、卡号、密钥与签名文件。
- 含第三方角色形象的宣传素材。

如果你认为某处署名或授权不完整，请通过 [Issue](https://github.com/ZSOF-Rui/SuperReader/issues) 指出；我们会核对来源并修正或移除相应内容。
