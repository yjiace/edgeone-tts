# Edge TTS 服务 - EdgeOne Pages 版

从 Cloudflare Worker 迁移而来，利用腾讯 EdgeOne 边缘节点为「阅读」类小说 APP 提供低延迟 TTS 朗读接口。

---

## 目录结构

```
edgeone-tts/
├── functions/                              # EdgeOne Pages Functions 根目录
│   ├── index.js                            # GET  /                         → Web 调试 UI
│   ├── _lib/
│   │   └── tts-core.js                     # 共享核心逻辑（Token、签名、SSML、合成）
│   └── v1/
│       └── audio/
│           └── speech/
│               ├── index.js               # POST /v1/audio/speech           → JSON body 方式
│               └── _middleware.js         # GET  /v1/audio/speech/{text}    → 拦截处理路径参数方式
├── cloud flare worker.js                   # 原始 Cloudflare Worker 版（参考用）
└── README.md
```

EdgeOne Pages 采用"文件路径 = URL 路径"约定。每个路由导出 `onRequest` / `onRequestGet` / `onRequestPost` 函数，由平台自动路由，无需手动判断 `pathname`。

---

## 接口说明

### POST `/v1/audio/speech` — JSON Body 方式

```bash
curl -X POST https://<your-project>.edgeone.app/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_KEY>" \
  -d '{"input":"你好世界","voice":"zh-CN-XiaoxiaoNeural","speed":1.0,"pitch":1.0}' \
  --output output.mp3
```

| 参数    | 类型   | 必填 | 说明                          |
|---------|--------|------|-------------------------------|
| input   | string | ✅   | 要合成的文本（支持 `\n` 分段） |
| voice   | string | ❌   | 语音角色，默认 `zh-CN-XiaoxiaoNeural` |
| speed   | number | ❌   | 语速 0.5~2.0，默认 1.0        |
| pitch   | number | ❌   | 音调 0.5~2.0，默认 1.0        |
| model   | string | ❌   | 兼容字段，忽略                 |

### GET `/v1/audio/speech/{text}` — 路径参数方式

适合阅读 APP 直接嵌入 URL 调用，无需构造请求体：

```
GET /v1/audio/speech/你好世界?voice=zh-CN-YunxiNeural&speed=1.2
```

| Query 参数 | 类型   | 说明                |
|------------|--------|---------------------|
| voice      | string | 语音角色            |
| speed      | number | 语速 0.5~2.0        |
| pitch      | number | 音调 0.5~2.0        |

---

## 部署步骤（网页上传，无需 Git）

1. 打开 [EdgeOne Pages 控制台](https://pages.edgeone.ai/)，登录后创建新项目。
2. 选择**本地上传**方式。
3. 将整个 `edgeone-tts` 目录上传，确保控制台中显示 `functions/` 为其子目录（切勿直接上传 functions 文件夹本身）。
4. 在项目的**环境变量**里添加：
   - 名称：`API_KEY`
   - 值：你自己的密钥（不要用示例中的值）
5. 部署完成后，在阅读 APP 中配置：
   - **网页调试**：`https://<your-project>.edgeone.app/`
   - **JSON 接口**：`POST https://<your-project>.edgeone.app/v1/audio/speech`
   - **路径接口**：`GET https://<your-project>.edgeone.app/v1/audio/speech/你好世界`

---

## EdgeOne vs Cloudflare Worker 主要差异

| 特性 | Cloudflare Worker | EdgeOne Pages Functions |
|------|-------------------|-------------------------|
| 入口 | `addEventListener('fetch', ...)` | `export async function onRequest(context)` |
| 路由 | 手动判断 `url.pathname` | 文件路径即路由 |
| 环境变量 | 模块顶层全局变量 | `context.env.API_KEY` |
| 动态路由 | 手动 `split('/')` | `_middleware.js` 拦截处理 (规避括号限制) |
| 共享模块 | 同文件内函数 | `_lib/tts-core.js` + ES Module import |

---

## 已知注意事项

> **动态路由文件名**：官方推荐动态路由使用 `[[params]].js`，但由于网页版控制台上传时会拦截带有非法字符 `[` `]` 的文件名，因此本项目改用 `_middleware.js` 中间件来统一拦截并解析 `/v1/audio/speech/` 后面的路径文本，避免上传失败。

> **HTTP/2 兼容性**：EdgeOne Edge Functions 的 `fetch()` 可能不支持 HTTP/2。若微软 TTS API 端点要求 HTTP/2 导致请求失败，可将 `functions/` 目录迁移为 `node-functions/`（Node.js 运行时，兼容性更好）。核心逻辑（`_lib/tts-core.js`）无需修改。

> **Token 缓存**：通过模块级变量缓存 Edge TTS Token，Isolate 温热状态下有效，冷启动后自动重新获取。

---