# 数据来源与许可

应用中的离线数据只用于本机显示与参考，不参与扣款、风控、身份认证或任何决策。数据可能过期、缺行或误标；卡面、银行公告与交通运营商信息优先。

## 银行 BIN 与卡产品名

| 数据 | 用途 | 许可 / 来源 |
| --- | --- | --- |
| `bankcard` 3.1.9 | BIN 底表 | MIT，Copyright (c) 2019 caijf；[caijf/bankcard](https://github.com/caijf/bankcard) |
| `card-bin-db` 1.0.2 | 境内外币卡与港澳台号段；全球 6 位 BIN 兜底 | MIT，Copyright (c) 2025 checkv4，数据整理自 BinCheck / PST；[checkv4/card-bin-db](https://github.com/checkv4/card-bin-db) |
| `banks-db` 0.23.0 | 港澳台银行名称与号段 | CC BY 4.0；[ramoona/banks-db](https://github.com/ramoona/banks-db) |
| `amosnothing/card_bin` | 精选 BIN 前缀、发卡行、卡种与卡产品名 | 检索时没有明确许可证；只使用事实性前缀与名称行，保留来源与可移除声明；[amosnothing/card_bin](https://github.com/amosnothing/card_bin) |
| 发卡行公开公告、卡圈公开报道 | 低置信度补充 | 未获银行确认；仅用于显示参考 |

- 正式版：三家银行（中行、建行、工行）的卡产品名。
- 预览版与开发版：163 家银行、1,215 个号段；全球 6 位 BIN 兜底覆盖 131,926 个号段、56,652 条发行方元数据，只在中国内地/港澳台精选表未命中时使用。银行卡结果标题会显示卡产品名与卡等级（数据存在时）；等级缺失时不补造。
- 全球表已排除中国内地/港澳台与非银行处理机构。
- 没有任何 BIN 数据经过真实卡片逐张核对。

完整来源、置信度与许可证原文随安装包内的数据文件一同分发；本仓库不单独再分发原始 BIN 表。

## 城市、卡种与站点

- 读卡识途 Trip Reader 的公开 `tripreader-data`：[domosekai/tripreader-data](https://github.com/domosekai/tripreader-data)，CC BY 4.0。
- 仅使用公开数据，不包含 TripReader 的反编译代码、资源或私有数据库。
- 应用内“隐私与数据”页保留署名。

## 银行卡与证件协议

- PBOC / EMV：公开规范与卡片返回的公开数据；不包含规范 PDF。
- ICAO Doc 9303：电子护照与港澳台通行证公开字段；不做签证、真伪或签发机构认证；不包含规范 PDF。
- 交通卡：交通联合、城市一卡通公开交易记录；六张实验卡依据公开资料与协议帧研究，均未真卡逐张验证。

## 变更规则

- 新增数据必须能说明来源、访问日期、许可与置信度。
- 不允许再分发的数据只能保留链接，不提交内容。
- 不删除现有署名；如权利人要求移除，请通过 Issue 联系，我们会核对并调整。
