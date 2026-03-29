/**
 * Utilities for encoding and decoding shareable link payloads.
 *
 * Uses pako (gzip/deflate) for compression to keep URLs within browser limits.
 */

import type { AuthorizationContract } from '@/interfaces';
import type { ResolvableString } from '@/interfaces/common/resolvable-string';
import { AuthorizationType } from '@/interfaces/generated';
import type { RequestLog } from '@/interfaces/history/logs';
import type { PendingRequest, RequestBodyTypeEnum, Response } from '@/interfaces/http';
import type { ShareableLinkPayload } from '@/interfaces/share';
import pako from 'pako';

/**
 * Encodes a pending request and optional response into a URL-safe shareable string.
 *
 * The process:
 * 1. Create a minimal payload with essential request/response data
 * 2. Serialize to JSON
 * 3. Compress using pako (deflate)
 * 4. Base64 encode with URL-safe characters
 */
export function encodeShareablePayload(
    pendingRequest: PendingRequest,
    response?: Response,
    requestLog?: RequestLog,
    applicationKey?: string,
): string {
    const payload: ShareableLinkPayload = {
        method: pendingRequest.method,
        endpoint: pendingRequest.endpoint.resolved,
        headers: pendingRequest.headers.map(header => ({
            key: header.key,
            value: header.value.resolved,
        })),
        queryParameters: pendingRequest.queryParameters.map(param => ({
            key: param.key,
            value: param.value.resolved,
            type: param.type,
        })),
        body: resolveBody(pendingRequest.body),
        payloadType: pendingRequest.payloadType,
        authorization: {
            type: pendingRequest.authorization.type,
            value: buildAuthorizationValue(pendingRequest.authorization.value),
        },
        applicationKey,
    };

    if (response) {
        payload.response = {
            status: response.status,
            statusCode: response.statusCode,
            statusText: response.statusText,
            body: response.body,
            sizeInBytes: response.sizeInBytes,
            headers: response.headers.map(header => ({
                key: header.key,
                value: header.value,
            })),
            cookies: response.cookies.map(cookie => ({
                key: cookie.key,
                value: cookie.value,
            })),
            timestamp: response.timestamp,
            durationInMs: requestLog?.durationInMs ?? 0,
        };
    }

    if (requestLog) {
        payload.requestLog = requestLog;
    }

    // Serialize to JSON
    const jsonString = JSON.stringify(payload);

    // Compress using pako (deflate)
    const compressed = pako.deflate(jsonString);

    // Convert to base64 with URL-safe characters
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(compressed)));

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds the complete shareable URL for the current request.
 */
export function buildShareableUrl(basePath: string, encodedPayload: string): string {
    const baseUrl = window.location.origin;
    const cleanBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`;

    return `${baseUrl}${cleanBasePath}?share=${encodedPayload}`;
}

export function reconstructInternalBodyFromSharableLinkBody(
    inbound: ShareableLinkPayload['body'],
): PendingRequest['body'] {
    const reconstructedBody: PendingRequest['body'] = {};

    for (const [method, contents] of Object.entries(inbound)) {
        if (!contents) {
            reconstructedBody[method] = undefined;
            continue;
        }

        const methodBody: Record<string, FormData | ResolvableString | null> = {};
        for (const [type, value] of Object.entries(contents)) {
            if (typeof value === 'string') {
                methodBody[type] = { raw: value, resolved: value };
            } else {
                methodBody[type] = value as FormData | null;
            }
        }
        reconstructedBody[method] = methodBody;
    }

    return reconstructedBody;
}

export function reconstructionInternalAuthorizationFromSharableLinkAuthorization(
    inbound: ShareableLinkPayload['authorization'],
): PendingRequest['authorization'] {
    const inboundType = inbound.type as AuthorizationContract['type'];

    const inboundValue = inbound.value as unknown;

    switch (inboundType) {
        case AuthorizationType.Basic:
            return {
                type: AuthorizationType.Basic,
                value: {
                    username: {
                        // @ts-expect-error safe restoration logic.
                        raw: inboundValue?.username ?? '',
                        // @ts-expect-error safe restoration logic.
                        resolved: inboundValue?.username ?? '',
                    },
                    password: {
                        // @ts-expect-error safe restoration logic.
                        raw: inboundValue?.password ?? '',
                        // @ts-expect-error safe restoration logic.
                        resolved: inboundValue?.password ?? '',
                    },
                },
            };

        case AuthorizationType.Bearer:
            return {
                type: AuthorizationType.Bearer,
                value: {
                    // @ts-expect-error safe restoration logic.
                    raw: inboundValue,
                    // @ts-expect-error safe restoration logic.
                    resolved: inboundValue,
                },
            };

        default:
            return {
                type: inboundType,
                value: inboundValue as AuthorizationContract['value'],
            } as PendingRequest['authorization'];
    }
}

function buildAuthorizationValue(value: AuthorizationContract['value']) {
    if (typeof value === 'object' && 'username' in value) {
        return {
            username: value.username.resolved,
            password: value.password.resolved,
        };
    }

    if (typeof value !== 'object') {
        return value;
    }

    return value.resolved;
}

function resolveBody(body: {
    [method: string]:
        | { [_key in RequestBodyTypeEnum]?: FormData | ResolvableString | null }
        | undefined;
}) {
    const resolvedBody: Record<
        string,
        Record<string, FormData | string | null | undefined> | undefined
    > = {};

    for (const [method, contents] of Object.entries(body)) {
        if (!contents) {
            resolvedBody[method] = undefined;

            continue;
        }

        const methodBody: Record<string, FormData | string | null | undefined> = {};

        for (const [type, value] of Object.entries(contents)) {
            if (value instanceof FormData) {
                methodBody[type] = value;

                continue;
            }

            methodBody[type] =
                value !== null && value !== undefined ? value.resolved : value;
        }

        resolvedBody[method] = methodBody;
    }

    return resolvedBody;
}
