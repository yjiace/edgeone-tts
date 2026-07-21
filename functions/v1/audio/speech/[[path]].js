/**
 * functions/v1/audio/speech/[[path]].js
 * 
 * 处理 /v1/audio/speech/{text} 的 GET 请求
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
    const volume = parseFloat(url.searchParams.get('volume') || String(DEFAULT_VOLUME));
    const style = url.searchParams.get('style') || DEFAULT_STYLE;
    const format = url.searchParams.get('format') || DEFAULT_FORMAT;

    try {
        validateParameterRange('speed', speed, 0.5, 2.0);
        validateParameterRange('pitch', pitch, 0.5, 2.0);
        validateParameterRange('volume', volume, 0.1, 2.0);
    } catch (err) {
        return createErrorResponse(err.message, 'invalid_parameter', 400);
    }

    try {
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
        console.error('[speech/[[path]]] TTS error:', err);
        return createErrorResponse(err.message, 'edge_tts_error', 500);
    }
}

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
        return handleOptions(request);
    }

    if (method === 'GET' || method === 'HEAD') {
        const basePath = '/v1/audio/speech/';
        let rawText = '';
        if (url.pathname.startsWith(basePath)) {
            rawText = url.pathname.slice(basePath.length);
        } else if (context.params.path) {
            rawText = (Array.isArray(context.params.path) ? context.params.path.join('/') : context.params.path);
        }

        return handleGet(context, rawText);
    }

    return new Response(
        JSON.stringify({ error: { message: 'Method Not Allowed', code: 'method_not_allowed' } }),
        {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                Allow: 'GET, HEAD, OPTIONS',
                ...makeCORSHeaders(),
            },
        }
    );
}
