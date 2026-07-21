/**
 * functions/v1/audio/speech/[[path]].js
 * 
 * 处理 /v1/audio/speech/{text} 的 GET 请求
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
