/**
 * functions/index.js
 * 路由：GET /
 *
 * 返回精美的 Web UI 调试页面，供浏览器手动测试 TTS 接口。
 */

import { makeCORSHeaders } from './_lib/tts-core.js';

/**
 * 处理 GET 请求，返回 Web UI HTML
 */
export async function onRequestGet(context) {
    return new Response(getWebUI(), {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...makeCORSHeaders(),
        },
    });
}

// ─────────────────────────────────────────────
// Web UI HTML
// ─────────────────────────────────────────────

function getWebUI() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EdgeOne TTS — 文本转语音</title>
    <meta name="description" content="基于 EdgeOne Pages Functions 和微软 Edge TTS 构建的文本转语音服务，支持多种中英文语音、语速和音调调节。" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
        /* ── Reset & Base ─────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg:         #0d0f14;
            --surface:    #161922;
            --surface-2:  #1e222e;
            --border:     rgba(255,255,255,0.07);
            --accent:     #6c63ff;
            --accent-2:   #a78bfa;
            --accent-glow:rgba(108,99,255,0.25);
            --text-1:     #f0f0f8;
            --text-2:     #9ca3af;
            --text-3:     #6b7280;
            --success:    #34d399;
            --error:      #f87171;
            --warning:    #fbbf24;
            --radius-sm:  8px;
            --radius-md:  14px;
            --radius-lg:  20px;
            --shadow:     0 8px 32px rgba(0,0,0,0.4);
        }

        html { scroll-behavior: smooth; }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text-1);
            min-height: 100vh;
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* ── Background glow ─────────────────────── */
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background:
                radial-gradient(ellipse 60% 40% at 20% 0%, rgba(108,99,255,0.12) 0%, transparent 60%),
                radial-gradient(ellipse 50% 30% at 80% 100%, rgba(167,139,250,0.08) 0%, transparent 60%);
            pointer-events: none;
            z-index: 0;
        }

        /* ── Layout ──────────────────────────────── */
        .page {
            position: relative;
            z-index: 1;
            max-width: 720px;
            margin: 0 auto;
            padding: 48px 20px 80px;
        }

        /* ── Header ──────────────────────────────── */
        .header {
            text-align: center;
            margin-bottom: 48px;
        }

        .logo-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--accent), var(--accent-2));
            color: #fff;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 5px 14px;
            border-radius: 999px;
            margin-bottom: 20px;
        }

        .logo-badge svg { width: 14px; height: 14px; }

        h1 {
            font-size: clamp(2rem, 5vw, 2.8rem);
            font-weight: 700;
            background: linear-gradient(135deg, #fff 0%, var(--accent-2) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
        }

        .subtitle {
            color: var(--text-2);
            font-size: 1rem;
            font-weight: 400;
        }

        /* ── Card ────────────────────────────────── */
        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 32px;
            box-shadow: var(--shadow);
        }

        /* ── Form Groups ─────────────────────────── */
        .form-grid {
            display: grid;
            gap: 22px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .form-group { display: flex; flex-direction: column; gap: 8px; }

        label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-2);
            letter-spacing: 0.02em;
        }

        .input-wrap { position: relative; }

        input[type="text"],
        input[type="password"],
        input[type="number"],
        select,
        textarea {
            width: 100%;
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            color: var(--text-1);
            font-family: inherit;
            font-size: 14px;
            padding: 11px 14px;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            appearance: none;
            -webkit-appearance: none;
        }

        input:focus, select:focus, textarea:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }

        textarea {
            resize: vertical;
            min-height: 120px;
            line-height: 1.7;
        }

        select {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 14px center;
            padding-right: 36px;
        }

        /* ── Range slider ────────────────────────── */
        .slider-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .slider-wrap input[type="range"] {
            flex: 1;
            padding: 0;
            height: 4px;
            background: var(--surface-2);
            border: none;
            border-radius: 999px;
            cursor: pointer;
            accent-color: var(--accent);
        }

        .slider-val {
            font-size: 13px;
            font-weight: 600;
            color: var(--accent-2);
            min-width: 36px;
            text-align: right;
        }

        /* ── Divider ─────────────────────────────── */
        .divider {
            height: 1px;
            background: var(--border);
            margin: 4px 0;
        }

        /* ── Voice Group Tags ────────────────────── */
        .optgroup-tag {
            color: var(--text-3);
            font-size: 11px;
        }

        /* ── Submit button ───────────────────────── */
        .btn-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 14px 24px;
            background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
            color: #fff;
            font-family: inherit;
            font-size: 15px;
            font-weight: 600;
            border: none;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
            box-shadow: 0 4px 16px var(--accent-glow);
            position: relative;
            overflow: hidden;
        }

        .btn-primary::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%);
        }

        .btn-primary:hover:not(:disabled) { opacity: 0.9; box-shadow: 0 6px 24px var(--accent-glow); }
        .btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Loading ─────────────────────────────── */
        .loading-bar {
            display: none;
            height: 2px;
            background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent));
            background-size: 200% 100%;
            border-radius: 999px;
            animation: shimmer 1.4s ease-in-out infinite;
        }

        @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        .loading-bar.active { display: block; }

        .status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            min-height: 20px;
        }

        .status-dot {
            width: 7px; height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
            animation: pulse-dot 1.5s ease-in-out infinite;
        }
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.5; transform: scale(0.7); }
        }

        .status-text { color: var(--text-2); }
        .status-text.error  { color: var(--error); }
        .status-text.success { color: var(--success); }

        /* ── Audio player ────────────────────────── */
        .audio-section {
            display: none;
            flex-direction: column;
            gap: 12px;
        }

        .audio-section.visible { display: flex; }

        .audio-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 500;
            color: var(--text-3);
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        audio {
            width: 100%;
            border-radius: var(--radius-sm);
            outline: none;
            accent-color: var(--accent);
        }

        .download-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 500;
            color: var(--accent-2);
            text-decoration: none;
            border: 1px solid rgba(167,139,250,0.25);
            border-radius: var(--radius-sm);
            padding: 8px 16px;
            transition: background 0.2s, border-color 0.2s;
        }
        .download-btn:hover {
            background: rgba(167,139,250,0.08);
            border-color: var(--accent-2);
        }

        /* ── API docs section ────────────────────── */
        .api-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 28px 32px;
            margin-top: 24px;
        }

        .api-card h2 {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-1);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .api-block {
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 14px 16px;
            margin-bottom: 12px;
        }

        .api-method {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .badge {
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 4px;
            letter-spacing: 0.05em;
        }
        .badge.post { background: rgba(52,211,153,0.15); color: var(--success); }
        .badge.get  { background: rgba(108,99,255,0.15); color: var(--accent-2); }

        .api-url {
            font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            color: var(--text-2);
        }

        .api-desc {
            font-size: 13px;
            color: var(--text-3);
            margin-top: 6px;
        }

        code {
            font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
            font-size: 12px;
            background: rgba(255,255,255,0.05);
            border-radius: 4px;
            padding: 2px 6px;
            color: var(--accent-2);
        }

        /* ── Footer ──────────────────────────────── */
        .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: var(--text-3);
        }

        /* ── Responsive ──────────────────────────── */
        @media (max-width: 560px) {
            .page { padding: 28px 16px 60px; }
            .card, .api-card { padding: 22px 18px; }
            .form-row { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
<div class="page">

    <!-- Header -->
    <header class="header">
        <div class="logo-badge">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>
            EdgeOne TTS
        </div>
        <h1>文本转语音</h1>
        <p class="subtitle">由 Microsoft Edge TTS 驱动 · 运行于腾讯 EdgeOne 边缘节点</p>
    </header>

    <!-- Main card -->
    <div class="card">
        <form id="tts-form" class="form-grid" autocomplete="off">

            <!-- API Token -->
            <div class="form-group">
                <label for="api-token">API Token（如已设置环境变量）</label>
                <input id="api-token" type="password" placeholder="Bearer token，留空则无需鉴权" />
            </div>

            <div class="divider"></div>

            <!-- Text -->
            <div class="form-group">
                <label for="text">输入文本 <span style="color:var(--error)">*</span></label>
                <textarea id="text" required placeholder="在此输入要朗读的文本，支持换行分段合成…">你好啊，亲爱的朋友们！欢迎使用 EdgeOne TTS 服务。</textarea>
            </div>

            <!-- Voice -->
            <div class="form-group">
                <label for="voice">语音角色</label>
                <select id="voice">
                    <optgroup label="── 中文普通话 ──">
                        <option value="zh-CN-XiaoxiaoNeural">晓晓 — 温暖活泼（女）</option>
                        <option value="zh-CN-XiaoyiNeural">晓伊 — 温暖亲切（女）</option>
                        <option value="zh-CN-XiaohanNeural">晓涵 — 自然流畅（女）</option>
                        <option value="zh-CN-XiaomengNeural">晓梦 — 甜美活力（女）</option>
                        <option value="zh-CN-XiaochenNeural">晓辰 — 温和从容（女）</option>
                        <option value="zh-CN-XiaoshuangNeural">晓双 — 温柔细腻（女）</option>
                        <option value="zh-CN-XiaoxuanNeural">晓萱 — 知性优雅（女）</option>
                        <option value="zh-CN-XiaomoNeural">晓墨 — 沉稳优雅（女）</option>
                        <option value="zh-CN-XiaozhenNeural">晓甄 — 自信干练（女）</option>
                        <option value="zh-CN-YunxiNeural">云希 — 稳重大方（男）</option>
                        <option value="zh-CN-YunyangNeural">云扬 — 专业播报（男）</option>
                        <option value="zh-CN-XiaoruiNeural">晓睿 — 儒雅随和（男）</option>
                        <option value="zh-CN-YunfengNeural">云枫 — 成熟稳重（男）</option>
                        <option value="zh-CN-YunjianNeural">云健 — 阳光活力（男）</option>
                        <option value="zh-CN-YunxiaNeural">云夏 — 青春朝气（男）</option>
                    </optgroup>
                    <optgroup label="── 英文 ──">
                        <option value="en-US-JennyNeural">Jenny — 英文女声</option>
                        <option value="en-US-GuyNeural">Guy — 英文男声</option>
                        <option value="en-US-AriaNeural">Aria — 英文女声</option>
                        <option value="en-US-DavisNeural">Davis — 英文男声</option>
                    </optgroup>
                    <optgroup label="── 日文 ──">
                        <option value="ja-JP-NanamiNeural">Nanami — 日文女声</option>
                        <option value="ja-JP-KeitaNeural">Keita — 日文男声</option>
                    </optgroup>
                    <optgroup label="── 韩文 ──">
                        <option value="ko-KR-SunHiNeural">Sun-Hi — 韩文女声</option>
                        <option value="ko-KR-InJoonNeural">InJoon — 韩文男声</option>
                    </optgroup>
                </select>
            </div>

            <!-- Speed & Pitch -->
            <div class="form-row">
                <div class="form-group">
                    <label for="speed">语速</label>
                    <div class="slider-wrap">
                        <input id="speed" type="range" min="0.5" max="2.0" step="0.1" value="1.0" />
                        <span class="slider-val" id="speed-val">1.0x</span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="pitch">音调</label>
                    <div class="slider-wrap">
                        <input id="pitch" type="range" min="0.5" max="2.0" step="0.1" value="1.0" />
                        <span class="slider-val" id="pitch-val">1.0x</span>
                    </div>
                </div>
            </div>

            <!-- Volume & Style -->
            <div class="form-row">
                <div class="form-group">
                    <label for="volume">音量</label>
                    <div class="slider-wrap">
                        <input id="volume" type="range" min="0.1" max="2.0" step="0.1" value="1.0" />
                        <span class="slider-val" id="volume-val">1.0x</span>
                    </div>
                </div>
                <div class="form-group">
                    <label for="style">情感风格 (部分角色支持)</label>
                    <select id="style">
                        <option value="general">常规 (General)</option>
                        <option value="cheerful">欢快 (Cheerful)</option>
                        <option value="sad">悲伤 (Sad)</option>
                        <option value="angry">生气 (Angry)</option>
                        <option value="fearful">恐惧 (Fearful)</option>
                        <option value="disgruntled">不满 (Disgruntled)</option>
                        <option value="serious">严肃 (Serious)</option>
                        <option value="affectionate">亲切 (Affectionate)</option>
                        <option value="gentle">温和 (Gentle)</option>
                        <option value="newscast">新闻播报 (Newscast)</option>
                        <option value="poetry-reading">诗歌朗读 (Poetry)</option>
                    </select>
                </div>
            </div>

            <!-- Format -->
            <div class="form-group">
                <label for="format">输出格式</label>
                <select id="format">
                    <option value="audio-24khz-48kbitrate-mono-mp3">MP3 - 24kHz 48kbps (默认, 兼容性好)</option>
                    <option value="audio-24khz-96kbitrate-mono-mp3">MP3 - 24kHz 96kbps</option>
                    <option value="audio-48khz-96kbitrate-mono-mp3">MP3 - 48kHz 96kbps (高音质)</option>
                    <option value="audio-48khz-192kbitrate-mono-mp3">MP3 - 48kHz 192kbps (超高音质)</option>
                    <option value="riff-24khz-16bit-mono-pcm">WAV - 24kHz PCM (无损)</option>
                    <option value="riff-48khz-16bit-mono-pcm">WAV - 48kHz PCM (超高音质无损)</option>
                    <option value="ogg-24khz-16bit-mono-opus">OGG - 24kHz Opus</option>
                    <option value="webm-24khz-16bit-mono-opus">WebM - 24kHz Opus</option>
                </select>
            </div>

            <!-- Submit -->
            <button id="submit-btn" class="btn-primary" type="submit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                生成语音
            </button>

        </form>

        <!-- Loading bar -->
        <div id="loading-bar" class="loading-bar" style="margin-top:16px"></div>

        <!-- Status -->
        <div class="status-row" style="margin-top:12px" id="status-row">
            <div class="status-dot" id="status-dot" style="display:none"></div>
            <span class="status-text" id="status-text"></span>
        </div>

        <!-- Audio output -->
        <div class="audio-section" id="audio-section" style="margin-top:16px">
            <div class="audio-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>
                合成结果
            </div>
            <audio id="audio-player" controls preload="auto"></audio>
            <div>
                <a id="download-link" class="download-btn" download="tts-output.mp3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/></svg>
                    下载 MP3
                </a>
            </div>
        </div>
    </div>

    <div class="api-card">
        <h2>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color:var(--accent-2)"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
            API 接口说明
        </h2>

        <div class="api-block">
            <div class="api-method">
                <span class="badge post">POST</span>
                <span class="api-url">/v1/audio/speech</span>
            </div>
            <div class="api-desc" style="line-height: 1.6;">
                <strong>Headers:</strong> <code>Authorization: Bearer &lt;API_KEY&gt;</code><br/>
                <strong>Body (JSON):</strong>
                <pre style="background:rgba(255,255,255,0.05); padding:12px; border-radius:6px; margin-top:8px; overflow-x:auto; font-family: 'Menlo', 'Monaco', 'Consolas', monospace; font-size:12px; color:var(--text-2);">{
  "input": "要合成的文本 (必填)",
  "voice": "zh-CN-XiaoxiaoNeural (可选)",
  "speed": 1.0,           // 语速 0.5 ~ 2.0
  "pitch": 1.0,           // 音调 0.5 ~ 2.0
  "volume": 1.0,          // 音量 0.1 ~ 2.0
  "style": "general",     // 情感风格 (如 cheerful, sad)
  "format": "audio-24khz-48kbitrate-mono-mp3" // 音频格式
}</pre>
            </div>
        </div>

        <div class="api-block">
            <div class="api-method">
                <span class="badge get">GET</span>
                <span class="api-url">/v1/audio/speech/{文本}</span>
            </div>
            <div class="api-desc">
                适合阅读 APP (如 Legado) 直接调用，文本参数位于 URL 路径中（需 URL 编码）。<br/>
                <strong>Query 参数支持:</strong>
                <ul style="margin-top:8px; margin-bottom:12px; padding-left:20px; color:var(--text-2);">
                    <li><code>voice</code>: 发音人角色</li>
                    <li><code>speed</code>: 语速，0.5 ~ 2.0 (默认 1.0)</li>
                    <li><code>pitch</code>: 音调，0.5 ~ 2.0 (默认 1.0)</li>
                    <li><code>volume</code>: 音量，0.1 ~ 2.0 (默认 1.0)</li>
                    <li><code>style</code>: 情感风格 (如 general, cheerful, angry 等)</li>
                    <li><code>format</code>: 输出音频格式 (默认 24kHz MP3)</li>
                    <li><code>token</code>: API 密钥 (可选，支持直接在 URL 中鉴权)</li>
                </ul>
                <strong>示例：</strong><br/>
                <code style="word-break:break-all; display:inline-block; margin-top:4px;">/v1/audio/speech/你好世界?voice=zh-CN-YunxiNeural&speed=1.2&volume=1.5&style=cheerful&token=API_KEY</code>
            </div>
        </div>
    </div>

    <footer class="footer">
        Powered by Microsoft Edge TTS · EdgeOne Pages Functions · © 2024
    </footer>
</div>

<script>
(function () {
    const form       = document.getElementById('tts-form');
    const submitBtn  = document.getElementById('submit-btn');
    const loadingBar = document.getElementById('loading-bar');
    const statusDot  = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const audioSec   = document.getElementById('audio-section');
    const audioEl    = document.getElementById('audio-player');
    const dlLink     = document.getElementById('download-link');
    const speedSlider = document.getElementById('speed');
    const pitchSlider = document.getElementById('pitch');
    const volumeSlider = document.getElementById('volume');
    const speedVal   = document.getElementById('speed-val');
    const pitchVal   = document.getElementById('pitch-val');
    const volumeVal  = document.getElementById('volume-val');

    // ── Slider labels ──────────────────────────
    speedSlider.addEventListener('input', () => {
        speedVal.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
    });
    pitchSlider.addEventListener('input', () => {
        pitchVal.textContent = parseFloat(pitchSlider.value).toFixed(1) + 'x';
    });
    volumeSlider.addEventListener('input', () => {
        volumeVal.textContent = parseFloat(volumeSlider.value).toFixed(1) + 'x';
    });

    // ── Helper: set status ────────────────────
    function setStatus(msg, type) {
        statusText.textContent = msg;
        statusText.className   = 'status-text' + (type ? ' ' + type : '');
        statusDot.style.display = msg ? 'block' : 'none';
        statusDot.style.background =
            type === 'error'   ? 'var(--error)'   :
            type === 'success' ? 'var(--success)'  :
            'var(--warning)';
    }

    // ── Form submit ───────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const text     = document.getElementById('text').value.trim();
        const voice    = document.getElementById('voice').value;
        const speed    = parseFloat(speedSlider.value);
        const pitch    = parseFloat(pitchSlider.value);
        const volume   = parseFloat(volumeSlider.value);
        const style    = document.getElementById('style').value;
        const format   = document.getElementById('format').value;
        const apiToken = document.getElementById('api-token').value.trim();

        if (!text) { setStatus('请输入要转换的文本', 'error'); return; }

        // Reset UI
        submitBtn.disabled = true;
        loadingBar.classList.add('active');
        audioSec.classList.remove('visible');
        setStatus('正在合成语音，请稍候…');

        const headers = { 'Content-Type': 'application/json' };
        if (apiToken) {
            headers['Authorization'] = apiToken.startsWith('Bearer ')
                ? apiToken : 'Bearer ' + apiToken;
        }

        try {
            const res = await fetch('/v1/audio/speech', {
                method: 'POST',
                headers,
                body: JSON.stringify({ model: 'tts-1', input: text, voice, speed, pitch, volume, style, format }),
            });

            if (res.ok) {
                const blob    = await res.blob();
                const url     = URL.createObjectURL(blob);
                
                let ext = 'mp3';
                if (format.includes('pcm')) ext = 'wav';
                else if (format.includes('ogg')) ext = 'ogg';
                else if (format.includes('webm')) ext = 'webm';

                audioEl.src   = url;
                dlLink.href   = url;
                dlLink.download = `tts-output.${ext}`;
                audioSec.classList.add('visible');
                setStatus('合成完成 ✓', 'success');
                // Auto play
                audioEl.play().catch(() => {});
            } else {
                let errMsg = \`HTTP \${res.status}\`;
                try {
                    const text = await res.text();
                    try {
                        const j = JSON.parse(text);
                        errMsg = j?.error?.message || j?.message || text;
                    } catch {
                        errMsg = text || errMsg;
                    }
                } catch (e) {
                    errMsg += ' (读取响应失败: ' + e.message + ')';
                }
                setStatus('错误：' + errMsg, 'error');
            }
        } catch (err) {
            setStatus('网络错误：' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            loadingBar.classList.remove('active');
        }
    });
})();
</script>
</body>
</html>`;
}
