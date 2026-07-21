/**
 * functions/v1/audio/speech/index.js
 * 路由：POST /v1/audio/speech
 *
 * 接收 JSON body，兼容 OpenAI TTS API 格式：
 *   { model, input, voice, speed, pitch }
 */

import {
    DEFAULT_VOICE,
    DEFAULT_SPEED,
    DEFAULT_PITCH,
    DEFAULT_VOLUME,
    DEFAULT_STYLE,
    DEFAULT_FORMAT,
    checkApiKey,
    createErrorResponse,
    handleOptions,
    makeCORSHeaders,
    validateParameterRange,
    speedToRate,
    pitchToString,
    volumeToString,
    getVoice,
} from '../../../_lib/tts-core.js';

async function handlePost(context) {
    const { request, env } = context;

    // 鉴权
    const { ok, response: authErr } = checkApiKey(request, env.API_KEY);
    if (!ok) return authErr;

    // 解析 JSON body
    let body;
    try {
        body = await request.json();
    } catch (err) {
        return createErrorResponse('Invalid JSON payload', 'invalid_request_error', 400);
    }

    const { 
        input, 
        voice = DEFAULT_VOICE, 
        speed = DEFAULT_SPEED, 
        pitch = DEFAULT_PITCH,
        volume = DEFAULT_VOLUME,
        style = DEFAULT_STYLE,
        format = DEFAULT_FORMAT
    } = body;

    if (!input || typeof input !== 'string' || !input.trim()) {
        return createErrorResponse('Missing required parameter: input', 'missing_input', 400);
    }

    // 参数校验
    try {
        validateParameterRange('speed', speed, 0.5, 2.0);
        validateParameterRange('pitch', pitch, 0.5, 2.0);
        validateParameterRange('volume', volume, 0.1, 2.0);
    } catch (err) {
        return createErrorResponse(err.message, 'invalid_parameter', 400);
    }

    try {
        // 调用核心函数生成语音
        return await getVoice(
            input,
            voice,
            speedToRate(speed),
            pitchToString(pitch),
            volumeToString(volume),
            style,
            format
        );
    } catch (err) {
        console.error('[speech/index] TTS error:', err);
        return createErrorResponse(
            err.message + '\n' + (err.stack || ''),
            'edge_tts_error',
            500
        );
    }
}

async function handleGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // 鉴权
    const { ok, response: authErr } = checkApiKey(request, env.API_KEY);
    if (!ok) return authErr;

    // 从 Query 参数获取 text
    const input = url.searchParams.get('text');
    if (!input || !input.trim()) {
        return createErrorResponse('Missing required parameter: text (e.g. ?text=hello)', 'missing_input', 400);
    }

    const voice = url.searchParams.get('voice') || DEFAULT_VOICE;
    const speed = parseFloat(url.searchParams.get('speed') || String(DEFAULT_SPEED));
    const pitch = parseFloat(url.searchParams.get('pitch') || String(DEFAULT_PITCH));
    const volume = parseFloat(url.searchParams.get('volume') || String(DEFAULT_VOLUME));
    const style = url.searchParams.get('style') || DEFAULT_STYLE;
    const format = url.searchParams.get('format') || DEFAULT_FORMAT;

    // 参数校验
    try {
        validateParameterRange('speed', speed, 0.5, 2.0);
        validateParameterRange('pitch', pitch, 0.5, 2.0);
        validateParameterRange('volume', volume, 0.1, 2.0);
    } catch (err) {
        return createErrorResponse(err.message, 'invalid_parameter', 400);
    }

    try {
        // 调用核心函数生成语音
        return await getVoice(
            input,
            voice,
            speedToRate(speed),
            pitchToString(pitch),
            volumeToString(volume),
            style,
            format
        );
    } catch (err) {
        console.error('[speech/index GET] TTS error:', err);
        return createErrorResponse(
            err.message + '\n' + (err.stack || ''),
            'edge_tts_error',
            500
        );
    }
}

export async function onRequest(context) {
    if (context.request.method.toUpperCase() === 'OPTIONS') {
        return handleOptions(context.request);
    }
    if (context.request.method.toUpperCase() === 'POST') {
        return handlePost(context);
    }
    if (context.request.method.toUpperCase() === 'GET' || context.request.method.toUpperCase() === 'HEAD') {
        return handleGet(context);
    }
    
    return new Response(
        JSON.stringify({ error: { message: 'Method Not Allowed', code: 'method_not_allowed' } }),
        {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                Allow: 'GET, POST, OPTIONS',
                ...makeCORSHeaders(),
            },
        }
    );
}
