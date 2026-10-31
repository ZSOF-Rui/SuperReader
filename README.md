# 卡阅 SuperReader

只读的 NFC 卡片信息工具。Android 版读取交通卡、PBOC / EMV 银行卡与 ICAO 电子证件；Windows 版通过 PC/SC 读卡器读取银行卡公开数据。读卡与解析都在本机完成，只有用户手动点击“检查更新”时，才通过 HTTPS 读取官网或 GitHub 的版本清单。

- 官网：[superreader.828696.xyz](https://superreader.828696.xyz/)（需在 Cloudflare 配置 `CNAME superreader → zsof-rui.github.io` 后生效；在此之前请使用下面的 Pages 地址）
- GitHub Pages 原始地址：[zsof-rui.github.io/SuperReader](https://zsof-rui.github.io/SuperReader/)（仓库已设置自定义域名，当前会 301 到尚未解析的官网域名）
- 问题反馈：[Issues](https://github.com/ZSOF-Rui/SuperReader/issues)
- 版本历史：[CHANGELOG.md](CHANGELOG.md)

> 当前安装包均为**测试签名**，未上架应用商店，也不是银行或交通运营商的官方工具。六张实验卡、Windows 桌面版、卡产品名与全球 BIN 推断都还没有完成真实卡片验收。

## 下载

| 渠道 | 版本 | 包名 | 下载 |
| --- | --- | --- | --- |
| Android 正式版 | 1.6.0 (13) | `com.superreader.app` | [SuperReader-1.6.0.apk](site/downloads/SuperReader-1.6.0.apk) |
| Android 预览版 | 1.7.0-preview1 (22) | `com.superreader.app.preview` | [SuperReader-1.7.0-preview1.apk](site/downloads/SuperReader-1.7.0-preview1.apk) |
| Windows 测试版 | 1.1.0-preview2 | 免安装 zip | [SuperReader-Windows-1.1.0-preview2-r2.zip](site/downloads/SuperReader-Windows-1.1.0-preview2-r2.zip) |

安装前请核对 SHA-256；方法见 [docs/VERIFY-RELEASES.md](docs/VERIFY-RELEASES.md)。正式版与预览版包名不同，可以同时安装；开发版 1.8.0-dev1 不对外发布。

### Android 版本差异

| 版本 | 内容 |
| --- | --- |
| 正式版 1.6.0 | 交通联合、城市一卡通、PBOC / EMV 银行卡、电子护照与港澳台通行证；三家银行的卡产品名；六张实验卡 |
| 预览版 1.7.0-preview1 | 在正式版基础上增加完整卡产品名（162 家银行、1,163 个号段）与全球 6 位 BIN 离线兜底 |
| 开发版 1.8.0-dev1 | 四套配色、手机读卡桥接；不对外发布 |

## 能做什么

- **交通卡**：交通联合、城市一卡通余额与交易记录；正式版与预览版另提供八达通、澳门通、悠游卡、T-money、Suica、EZ-Link 六张实验卡读取，开发版同样包含。
- **银行卡**：PBOC / EMV 公开数据，卡号默认脱敏；离线 BIN 表只用于参考发卡行、卡种与卡产品名。
- **电子证件**：电子护照与港澳台通行证公开字段、证件照；读取公开数据，不做签证、真伪或签发机构认证。
- **本机保存**：历史、卡包、诊断导出都在应用私有目录，可随时清空。

## 不能做什么

- 不写卡、不克隆、不模拟、不圈存、不破解密钥。
- 不上传卡号、BIN、证件信息或读卡结果；没有账号、统计、广告或崩溃上报。
- 不自动检查更新；只有用户点击“检查更新”时才访问下面两个 HTTPS 地址。
- 不保证实验卡、BIN 推断或余额解析的准确性；以卡面、银行与交通运营商官方信息为准。

## 更新检查

“设置 → 检查更新”会并发查询两条路径，按版本号选择较新的正式版或预览版清单：

1. 官网：`https://superreader.828696.xyz/data/releases.json`
2. GitHub：`https://raw.githubusercontent.com/ZSOF-Rui/SuperReader/main/site/data/releases.json`

两条路径使用同一份 `site/data/releases.json`，只读取版本号、下载地址、大小与 SHA-256，不上传任何设备或卡片数据。应用只接受 `https`，会校验包名、APK 相对路径、版本号与哈希格式；下载仍在浏览器中完成。清单格式和失败回退规则见 [docs/UPDATE-CHECK.md](docs/UPDATE-CHECK.md)。

## 仓库内容

这个仓库只发布**站点、文档、参考资料索引和安装包**，不包含 Android / Windows / iOS 的核心源码。

```
site/                 官网、下载页、版本清单、Web NFC 实验页
docs/                 平台可行性、更新检查、安装包校验
references/           公开协议与开源项目索引（仅链接与说明）
scripts/check-site.mjs 站点链接、清单与安装包完整性检查
.github/workflows/    GitHub Pages 与站点检查
```

核心源码、签名密钥、真实卡片数据、第三方 APK、规范 PDF 与含第三方角色的宣传素材**不在本仓库**。完整边界见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 本地预览

需要 Node.js 20+ 与 Python 3：

```bash
python -m http.server 8765 --directory site
# 打开 http://127.0.0.1:8765/
node scripts/check-site.mjs
```

不要直接双击 `site/index.html`：页面用 `fetch()` 读取 `site/data/releases.json`，`file://` 下会被浏览器拦截。

`site/lab/web-nfc.html` 是只读 NDEF 演示，只在 Android Chrome 且 HTTPS / localhost 下可用；Web NFC 不能读取交通卡、银行卡或护照芯片。

## 发布流程

1. 更新 `site/downloads/` 中的安装包，文件名带版本号。
2. 更新 `site/data/releases.json` 对应渠道的 `versionCode`、大小、SHA-256 与说明；同一渠道的 `versionCode` 必须递增。
3. 同步更新 `site/index.html` 中展示的版本、大小与 SHA-256。
4. 运行 `node scripts/check-site.mjs`。
5. 提交并推送；GitHub Actions 检查通过后部署 `site/` 到 Pages。

详细步骤见 [site/README.md](site/README.md)。

## 数据与许可

- 站点源码、文档、参考资料索引与脚本：MIT，见 [LICENSE](LICENSE)。
- `site/downloads/` 下的 APK / ZIP 与未公开的应用源码：专有，见 [APP-LICENSE.md](APP-LICENSE.md)。
- 第三方库、公开数据与协议来源：见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md)。
- 城市、卡种与站点数据参考读卡识途公开的 `tripreader-data`（CC BY 4.0）；BIN 数据来自 `bankcard`、`card-bin-db`、`banks-db` 等公开整理。数据可能过期、缺行或误标，不构成权威结论。

## 安全与隐私

- 只读取你本人持有或已获授权的卡片。
- 不要在 Issue 中粘贴完整卡号、证件号、证件照、密钥、签名文件或原始 APDU。
- 安全问题请按 [SECURITY.md](SECURITY.md) 私下报告，不要先开公开 Issue。
- 本项目按“现状”提供，不提供任何担保；详见 [LICENSE](LICENSE) 与 [APP-LICENSE.md](APP-LICENSE.md)。

## 参与

欢迎提交站点、文档、数据来源更正与 Bug 报告。核心源码不接受外部代码贡献；请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 致谢

感谢 [读卡识途 Trip Reader](https://github.com/domosekai/tripreader-data)、[Metrodroid](https://github.com/metrodroid/metrodroid)、[bankcard](https://github.com/caijf/bankcard)、[card-bin-db](https://github.com/checkv4/card-bin-db)、[banks-db](https://github.com/ramoona/banks-db) 等公开项目与数据整理者。完整清单见 [references/README.md](references/README.md)。
