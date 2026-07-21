/**
 * functions/v1/audio/speech/_middleware.js
 * 
 * 替代 [[params]].js 的中间件，用于避开上传时文件名包含括号的限制。
 * 拦截 /v1/audio/speech/ 下的所有请求。
 */

import {
    DEFAULT_VOICE,
    DEFAULT_SPEED,
    DEFAULT_PITCH,
    checkApiKey,
    createErrorResponse,
    handleOptions,
    makeCORSHeaders,
    validateParameterRange,
    speedToRate,
    pitchToString,
    getVoice,
} from '../../../_lib/tts-core.js';

const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

async function handleGet(context, rawText) {
    const { request, env } = context;
    const url = new URL(request.url);

    const { ok, response: authErr } = checkApiKey(request, env.API_KEY);
    if (!ok) return authErr;

    let input = '';
    try {
        input = decodeURIComponent(rawText);
    } catch {
        input = rawText;
    }

    if (!input || !input.trim()) {
        return createErrorResponse(
            'Text is required in path: /v1/audio/speech/{your text}',
            'missing_input',
            400
        );
    }

    const voice = url.searchParams.get('voice') || DEFAULT_VOICE;
    const speed = parseFloat(url.searchParams.get('speed') || String(DEFAULT_SPEED));
    const pitch = parseFloat(url.searchParams.get('pitch') || String(DEFAULT_PITCH));

    try {
        validateParameterRange('speed', speed, 0.5, 2.0);
        validateParameterRange('pitch', pitch, 0.5, 2.0);
    } catch (err) {
        return createErrorResponse(err.message, 'invalid_parameter', 400);
    }

    try {
        return await getVoice(
            input,
            voice,
            speedToRate(speed),
            pitchToString(pitch),
            '+0%',
            'general',
            OUTPUT_FORMAT
        );
    } catch (err) {
        console.error('[speech/_middleware] TTS error:', err);
        return createErrorResponse(err.message, 'edge_tts_error', 500);
    }
}

export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // 预检请求放行或直接处理
    if (method === 'OPTIONS') {
        return handleOptions(request);
    }

    const basePath = '/v1/audio/speech';
    
    // 如果请求路径刚好是 /v1/audio/speech 或 /v1/audio/speech/
    // 则放行给该目录下的 index.js 处理（比如 POST 接口）
    if (url.pathname === basePath || url.pathname === basePath + '/') {
        return next();
    }

    // 否则说明是动态路由 GET /v1/audio/speech/{text}
    if (method === 'GET' || method === 'HEAD') {
        // 提取前缀之后的部分作为文本
        const prefix = basePath + '/';
        if (url.pathname.startsWith(prefix)) {
            const rawText = url.pathname.slice(prefix.length);
            return handleGet(context, rawText);
        }
    }

    // 如果不是 GET，又不是根路径，则返回 405
    return new Response(
        JSON.stringify({ error: { message: 'Method Not Allowed', code: 'method_not_allowed' } }),
        {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                Allow: 'GET, HEAD, POST, OPTIONS',
                ...makeCORSHeaders(),
            },
        }
    );
}
