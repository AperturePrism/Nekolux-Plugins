# Nekolux-Plugins —— 插件远程源

Nekolux 的插件市场从这里读取索引与安装包。

**索引地址：<https://plugins.aprism.top/index.json>**

> 本仓库已通过 `robots.txt` 退出搜索引擎索引（客户端直接 HTTP 拉取，
> 不经过搜索引擎，因此不受影响）。

> 为什么用 GitHub Pages 而不是 raw.githubusercontent.com：
> 部分自建网络环境（含国内部分机房）无法访问 `raw.githubusercontent.com`，
> 但能正常访问 GitHub Pages。走 Pages 可以保证客户端拉得到索引。


## 目录结构

```
Nekolux-Plugins/
├── index.json                      # 市场索引（客户端拉这个）
├── packages/
│   ├── keyword-reply-1.0.0.tar.gz
│   └── packet-observer-1.0.0.tar.gz
└── sources/                        # 各插件的源码（便于审阅）
    ├── keyword-reply/
    └── packet-observer/
```

## index.json 格式

```json
{
  "version": 1,
  "updatedAt": "2026-11-15T00:00:00.000Z",
  "plugins": [
    {
      "id": "keyword-reply",
      "name": "关键词自动回复",
      "version": "1.0.0",
      "description": "群消息命中关键词时自动回一句",
      "author": "Nekolux",
      "downloadUrl": "https://plugins.aprism.top/packages/keyword-reply-1.0.0.tar.gz",
      "sha256": "（tar.gz 的 sha256，必填）",
      "homepage": "https://github.com/AperturePrism/Nekolux-Plugins/tree/main/sources/keyword-reply",
      "tags": ["reply"]
    }
  ]
}
```

字段说明：

| 字段 | 必需 | 说明 |
|---|---|---|
| `version` | ✅ | 索引格式版本，固定 `1` |
| `plugins[].id` | ✅ | 插件 ID，必须与包内 `package.json` 的 `plugin` 字段一致 |
| `plugins[].name` | ✅ | 展示名（建议中文） |
| `plugins[].version` | ✅ | 语义化版本 |
| `plugins[].description` | ✅ | 一句话说明 |
| `plugins[].author` | ✅ | 作者 |
| `plugins[].downloadUrl` | ✅ | 安装包直链（**只支持 tar.gz**） |
| `plugins[].sha256` | 强烈建议 | 包体校验；不填则跳过校验 |
| `plugins[].homepage` | — | 源码/文档地址 |
| `plugins[].tags` | — | 分类标签 |

## 打包插件

包内必须是「插件目录的直接内容」，解压后得到 `package.json` + `index.js`：

```bash
# 从插件目录打包（注意 -C 到插件目录，不要在包里多一层目录）
tar czf packages/keyword-reply-1.0.0.tar.gz -C examples/plugins/keyword-reply .

# 算 sha256 填进 index.json
sha256sum packages/keyword-reply-1.0.0.tar.gz
```

## 客户端配置

**官方源已内置**，开箱即用 —— 不需要任何配置。

如需添加第三方源，在 WebUI →「插件市场」→「市场源」里追加：

```
https://plugins.aprism.top/index.json          ← 官方源（内置，不可删）
https://example.com/my-plugins/index.json      ← 第三方源
```

或用环境变量覆盖（优先级最高）：

```bash
UNIFIED_MARKET_INDEX=https://plugins.aprism.top/index.json
```

## 安全约束（客户端侧）

市场**不绕过**插件加载器的任何检查：

- 下载的插件仍要过白名单（`UNIFIED_PLUGIN_ALLOW`）
- 仍要做敏感词扫描与目录逃逸检查
- 安装只是把文件放进 `plugins/<id>/`，**启用仍是运维显式操作**

所以源里的插件不会被自动执行 —— 需要用户在配置里加入白名单并重启。
