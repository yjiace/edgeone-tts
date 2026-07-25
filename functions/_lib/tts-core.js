/**
 * tts-core.js — 共享核心逻辑
 * EdgeOne Pages Functions 版（从 Cloudflare Worker 迁移）
 *
 * 包含：Token 获取与缓存、HMAC-SHA256 签名、SSML 生成、音频合成
 * 使用标准 Web API（fetch、crypto.subtle、Blob），兼容 EdgeOne Edge Functions 运行时
 */

// ─────────────────────────────────────────────
// 常量配置
// ─────────────────────────────────────────────

/** Token 过期前提前刷新的秒数 */
const TOKEN_REFRESH_BEFORE_EXPIRY = 3 * 60;

/** 默认语音 */
export const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural';

/** 默认语速（1.0 = 原速） */
export const DEFAULT_SPEED = 1.0;

/** 默认音调（1.0 = 原调） */
export const DEFAULT_PITCH = 1.0;

/** 默认音量（1.0 = 原音量） */
export const DEFAULT_VOLUME = 1.0;

/** 默认风格 */
export const DEFAULT_STYLE = 'general';

/** 默认输出音频格式 */
export const DEFAULT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

// ─────────────────────────────────────────────
// 模块级 Token 缓存（Isolate 温热时有效）
// ─────────────────────────────────────────────

let tokenInfo = {
    endpoint: null,
    token: null,
    expiredAt: null,
};

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────

/**
 * 生成标准 CORS 响应头
 * @returns {Object}
 */
export function makeCORSHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
        'Access-Control-Max-Age': '86400',
    };
}

/**
 * 处理 OPTIONS 预检请求
 * @param {Request} request
 * @returns {Response}
 */
export function handleOptions(request) {
    return new Response(null, {
        status: 204,
        headers: {
            ...makeCORSHeaders(),
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
            'Access-Control-Allow-Headers':
                request.headers.get('Access-Control-Request-Headers') ||
                'Content-Type, Authorization, x-api-key',
        },
    });
}

// ─────────────────────────────────────────────
// 错误响应
// ─────────────────────────────────────────────

/**
 * 创建标准错误响应（JSON 格式，含 CORS 头）
 * @param {string} message
 * @param {string} code
 * @param {number} status  HTTP 状态码
 * @returns {Response}
 */
export function createErrorResponse(message, code, status) {
    return new Response(
        JSON.stringify({ error: { message, code } }),
        {
            status,
            headers: { 'Content-Type': 'application/json', ...makeCORSHeaders() },
        }
    );
}

// ─────────────────────────────────────────────
// 参数校验与转换
// ─────────────────────────────────────────────

/**
 * 验证数值参数是否在指定范围内，超出则抛错
 * @param {string} name
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function validateParameterRange(name, value, min, max) {
    if (value < min || value > max) {
        throw new Error(`${name} must be between ${min} and ${max}`);
    }
}

/**
 * 将语速参数（0.5~2.0）转换为 Edge TTS 的百分比偏移字符串
 * 例：1.0 → "+0%"，0.5 → "-50%"，1.5 → "+50%"
 * @param {number} speed
 * @returns {string}
 */
export function speedToRate(speed) {
    const rate = parseInt(String((parseFloat(speed) - 1.0) * 100));
    return rate >= 0 ? `+${rate}%` : `${rate}%`;
}

/**
 * 将音调参数（0.5~2.0）转换为 Edge TTS 的百分比偏移字符串
 * @param {number} pitch
 * @returns {string}
 */
export function pitchToString(pitch) {
    const p = parseInt(String((parseFloat(pitch) - 1.0) * 100));
    return p >= 0 ? `+${p}%` : `${p}%`;
}

/**
 * 将音量参数（0.1~2.0）转换为 Edge TTS 的百分比偏移字符串
 * @param {number} volume
 * @returns {string}
 */
export function volumeToString(volume) {
    const v = parseInt(String((parseFloat(volume) - 1.0) * 100));
    return v >= 0 ? `+${v}%` : `${v}%`;
}

// ─────────────────────────────────────────────
// API Key 鉴权
// ─────────────────────────────────────────────

/**
 * 从请求头或 URL 参数提取并校验 API Key
 * @param {Request} request
 * @param {string|undefined} expectedKey  若为空则跳过校验
 * @returns {{ ok: boolean, response?: Response }}
 */
export function checkApiKey(request, expectedKey) {
    if (!expectedKey) return { ok: true };

    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');

    const authHeader =
        request.headers.get('authorization') || request.headers.get('x-api-key');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    const apiKey = queryToken || headerToken;

    if (apiKey !== expectedKey) {
        return {
            ok: false,
            response: createErrorResponse(
                "Invalid API key. Use 'Authorization: Bearer your-api-key' header or '?token=your-api-key' in URL",
                'invalid_api_key',
                401
            ),
        };
    }
    return { ok: true };
}

// ─────────────────────────────────────────────
// SSML 构造
// ─────────────────────────────────────────────

/**
 * 从文本尾部提取静音时长标记（如 "[500]"）
 * @param {string} text
 * @returns {number} 毫秒，无标记时为 0
 */
function extractSilenceDuration(text) {
    const match = text.match(/\[(\d+)\]\s*?$/);
    return match && match.length === 2 ? parseInt(match[1]) : 0;
}

/**
 * 构建 SSML 字符串
 * @param {string} text         朗读文本
 * @param {string} voiceName    如 "zh-CN-XiaoxiaoNeural"
 * @param {string} rate         如 "+0%"
 * @param {string} pitch        如 "+0%"
 * @param {string} volume       如 "+0%"
 * @param {string} style        风格，如 "general"
 * @param {number} silence      末尾静音毫秒
 * @param {number|undefined} styleDegree  风格强度 0.01~2.0，undefined 时使用默认值
 * @returns {string}
 */
function getSsml(text, voiceName, rate, pitch, volume, style, silence, styleDegree) {
    const cleanText = text.replace(/\[(\d+)\]\s*?$/, '');
    const langParts = voiceName.split('-');
    const lang = `${langParts[0]}-${langParts[1]}`;

    // 构建 mstts:express-as 开标签（可携带 styledegree 属性）
    let expressAsOpen = '';
    let expressAsClose = '';
    if (style && style !== 'general') {
        const degreeAttr = (styleDegree !== undefined && styleDegree !== null)
            ? ` styledegree="${Number(styleDegree).toFixed(2)}"`
            : '';
        expressAsOpen = `<mstts:express-as style="${style}"${degreeAttr}>`;
        expressAsClose = '</mstts:express-as>';
    }

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">
        <voice name="${voiceName}">
            <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
                ${expressAsOpen}
                ${cleanText}
                ${expressAsClose}
                ${silence > 0 ? `<break time="${silence}ms"/>` : ''}
            </prosody>
        </voice>
    </speak>`;
}

// ─────────────────────────────────────────────
// 签名 & Token
// ─────────────────────────────────────────────

/**
 * 格式化当前 UTC 时间为 Edge TTS 签名所需格式
 * @returns {string}
 */
function dateFormat() {
    return new Date().toUTCString().replace(/GMT/, '').trim() + ' GMT';
}

/**
 * HMAC-SHA256 签名
 * @param {Uint8Array} key
 * @param {string}     data
 * @returns {Promise<Uint8Array>}
 */
async function hmacSha256(key, data) {
    // 强制转换为 ArrayBuffer，某些边缘环境对 TypedArray 支持有 Bug，可能报 Param Invalid
    const keyBuffer = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength);
    const dataBuffer = new TextEncoder().encode(data).buffer;

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    return new Uint8Array(signature);
}

/**
 * Base64 字符串 → Uint8Array
 * @param {string} base64
 * @returns {Promise<Uint8Array>}
 */
async function base64ToBytes(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Uint8Array → Base64 字符串
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
    return btoa(String.fromCharCode.apply(null, bytes));
}

/**
 * 对 Microsoft Translator endpoint URL 签名
 * @param {string} urlStr
 * @returns {Promise<string>}
 */
async function sign(urlStr) {
    const url = urlStr.split('://')[1];
    const encodedUrl = encodeURIComponent(url);
    const uuidStr = crypto.randomUUID().replace(/-/g, '');
    const formattedDate = dateFormat();
    const bytesToSign = `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase();
    const key = await base64ToBytes(
        'oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw=='
    );
    const signData = await hmacSha256(key, bytesToSign);
    const signBase64 = bytesToBase64(signData);
    return `MSTranslatorAndroidApp::${signBase64}::${formattedDate}::${uuidStr}`;
}

/**
 * 获取（或刷新）Edge TTS Endpoint 和 Token
 * 使用模块级变量缓存，避免每次请求都重新获取
 * @returns {Promise<Object>} endpoint 数据对象（含 .r 和 .t 字段）
 */
export async function getEndpoint() {
    const now = Date.now() / 1000;
    if (
        tokenInfo.token &&
        tokenInfo.expiredAt &&
        now < tokenInfo.expiredAt - TOKEN_REFRESH_BEFORE_EXPIRY
    ) {
        return tokenInfo.endpoint;
    }

    const endpointUrl = 'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';
    const clientId = crypto.randomUUID().replace(/-/g, '');

    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Accept-Language': 'zh-Hans',
                'X-ClientVersion': '4.0.530a 5fe1dc6c',
                'X-UserId': '0f04d16a175c411e',
                'X-HomeGeographicRegion': 'zh-Hans-CN',
                'X-ClientTraceId': clientId,
                'X-MT-Signature': await sign(endpointUrl),
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: '', // 明确给一个空字符串，避免部分 fetch 实现对无 body 的 POST 报错
        });

        if (!response.ok) {
            throw new Error(`获取 Endpoint 失败: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        const jwt = data.t.split('.')[1];
        const decodedJwt = JSON.parse(atob(jwt));

        tokenInfo = {
            endpoint: data,
            token: data.t,
            expiredAt: decodedJwt.exp,
        };

        return data;
    } catch (error) {
        console.error('[tts-core] 获取 Endpoint 失败:', error);
        // 降级：若有过期缓存也返回，避免完全不可用
        if (tokenInfo.endpoint) {
            console.warn('[tts-core] 使用过期缓存 Endpoint，可能影响稳定性');
            return tokenInfo.endpoint;
        }
        throw error;
    }
}

// ─────────────────────────────────────────────
// 音频合成
// ─────────────────────────────────────────────

/**
 * 合成单个文本片段的音频，返回 Blob
 * @param {string} text
 * @param {string} voiceName
 * @param {string} rate
 * @param {string} pitch
 * @param {string} volume
 * @param {string} style
 * @param {string} outputFormat      如 "audio-24khz-48kbitrate-mono-mp3"
 * @param {number|undefined} styleDegree  风格强度 0.01~2.0
 * @returns {Promise<Blob>}
 */
async function getAudioChunk(text, voiceName, rate, pitch, volume, style, outputFormat, styleDegree) {
    const endpoint = await getEndpoint();
    const url = `https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const silence = extractSilenceDuration(text);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: endpoint.t,
            'Content-Type': 'application/ssml+xml',
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
            'X-Microsoft-OutputFormat': outputFormat,
        },
        body: getSsml(text, voiceName, rate, pitch, volume, style, silence, styleDegree),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge TTS API error: ${response.status} ${errorText}`);
    }

    return response.blob();
}

/**
 * 合成完整语音（自动按换行分段并行请求，最后拼接）
 * @param {string} text              要合成的全文本
 * @param {string} voiceName         语音名称
 * @param {string} rate              语速偏移，如 "+0%"
 * @param {string} pitch             音调偏移，如 "+0%"
 * @param {string} volume            音量偏移，如 "+0%"
 * @param {string} style             风格，如 "general"
 * @param {string} outputFormat      音频格式
 * @param {number|undefined} styleDegree  风格强度 0.01~2.0，可选
 * @returns {Promise<Response>} 包含音频数据的 Response
 */
export async function getVoice(text, voiceName, rate, pitch, volume, style, outputFormat, styleDegree) {
    const chunks = text.trim().split('\n').filter(Boolean);
    const audioChunks = await Promise.all(
        chunks.map(chunk => getAudioChunk(chunk, voiceName, rate, pitch, volume, style, outputFormat, styleDegree))
    );

    // 拼接所有音频片段
    const mimeType = `audio/${outputFormat.split('-').pop()}`;
    const concatenated = new Blob(audioChunks, { type: mimeType });
    const arrayBuffer = await concatenated.arrayBuffer();

    return new Response(arrayBuffer, {
        headers: {
            'Content-Type': mimeType,
            'Content-Length': String(arrayBuffer.byteLength),
            ...makeCORSHeaders(),
        },
    });
}
