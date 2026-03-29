import { AuthorizationType } from '@/interfaces/generated';
import type { PendingRequest, Response } from '@/interfaces/http';
import { RequestBodyTypeEnum, STATUS } from '@/interfaces/http';
import type { ShareableLinkPayload } from '@/interfaces/share';
import { ParameterType } from '@/interfaces/ui';
import {
    buildShareableUrl,
    encodeShareablePayload,
    reconstructInternalBodyFromSharableLinkBody,
    reconstructionInternalAuthorizationFromSharableLinkAuthorization,
} from '@/utils/shareableLinks';
import { beforeEach, describe, expect, it } from 'vitest';

describe('shareableLinks', () => {
    describe('encodeShareablePayload', () => {
        it('encodes a pending request into a URL-safe string', () => {
            // Arrange

            const pendingRequest: PendingRequest = {
                method: 'POST',
                endpoint: { raw: '/api/users', resolved: '/api/users' },
                headers: [
                    {
                        key: 'Content-Type',
                        value: { raw: 'application/json', resolved: 'application/json' },
                        type: ParameterType.Text,
                        enabled: true,
                    },
                ],
                queryParameters: [
                    {
                        key: 'page',
                        value: { raw: '1', resolved: '1' },
                        type: ParameterType.Text,
                        enabled: true,
                    },
                ],
                body: {},
                payloadType: RequestBodyTypeEnum.JSON,
                schema: { shape: {}, extractionErrors: null },
                authorization: { type: AuthorizationType.None },
                supportedRoutes: [],
                routeDefinition: {
                    endpoint: '/api/users',
                    method: 'POST',
                    schema: { shape: {}, extractionErrors: null },
                    shortEndpoint: '/users',
                },
            };

            // Act

            const encoded = encodeShareablePayload(pendingRequest);

            // Assert

            expect(encoded).toBeDefined();
            expect(typeof encoded).toBe('string');
            expect(encoded.length).toBeGreaterThan(0);
            // Should be URL-safe (no +, /, or = characters)
            expect(encoded).not.toMatch(/[+/=]/);
        });

        it('encodes request with response data', () => {
            // Arrange

            const pendingRequest: PendingRequest = {
                method: 'GET',
                endpoint: { raw: '/api/health', resolved: '/api/health' },
                headers: [],
                queryParameters: [],
                body: {},
                payloadType: RequestBodyTypeEnum.EMPTY,
                schema: { shape: {}, extractionErrors: null },
                authorization: { type: AuthorizationType.None },
                supportedRoutes: [],
                routeDefinition: {
                    endpoint: '/api/health',
                    method: 'GET',
                    schema: { shape: {}, extractionErrors: null },
                    shortEndpoint: '/health',
                    metadata: {
                        isMissingImplementation: false,
                        isUndocumented: false,
                    },
                },
            };

            const response: Response = {
                status: STATUS.SUCCESS,
                statusCode: 200,
                statusText: 'OK',
                body: '{"status": "healthy"}',
                sizeInBytes: 21,
                headers: [{ key: 'Content-Type', value: 'application/json' }],
                cookies: [],
                timestamp: 1234567890,
            };

            // Act

            const encoded = encodeShareablePayload(pendingRequest, response);

            // Assert

            expect(encoded).toBeDefined();
            expect(encoded.length).toBeGreaterThan(0);
        });
    });

    describe('buildShareableUrl', () => {
        beforeEach(() => {
            // Mock window.location for tests
            Object.defineProperty(globalThis, 'window', {
                value: {
                    location: {
                        origin: 'http://localhost:3000',
                    },
                },
                writable: true,
                configurable: true,
            });
        });

        it('builds a complete URL with share parameter', () => {
            // Arrange

            const basePath = '/nimbus';
            const encodedPayload = 'encodedPayloadString';

            // Act

            const url = buildShareableUrl(basePath, encodedPayload);

            // Assert

            expect(url).toBe('http://localhost:3000/nimbus?share=encodedPayloadString');
        });

        it('handles base path without leading slash', () => {
            // Arrange

            const basePath = 'nimbus';
            const encodedPayload = 'test123';

            // Act

            const url = buildShareableUrl(basePath, encodedPayload);

            // Assert

            expect(url).toBe('http://localhost:3000/nimbus?share=test123');
        });
    });

    describe('reconstructInternalBodyFromSharableLinkBody', () => {
        it('reconstructs a body with string primitives into ResolvableString objects', () => {
            // Arrange

            const inboundPayload: ShareableLinkPayload['body'] = {
                POST: {
                    [RequestBodyTypeEnum.JSON]: '{"test": true}',
                },
                PUT: undefined,
            };

            // Act

            const result = reconstructInternalBodyFromSharableLinkBody(inboundPayload);

            // Assert

            expect(result.POST).toBeDefined();
            expect(result.POST![RequestBodyTypeEnum.JSON]).toEqual({
                raw: '{"test": true}',
                resolved: '{"test": true}',
            });
            expect(result.PUT).toBeUndefined();
        });

        it('maintains null assignments when reconstructing body state', () => {
            // Arrange

            const inboundPayload: ShareableLinkPayload['body'] = {
                POST: {
                    [RequestBodyTypeEnum.JSON]: null,
                },
            };

            // Act

            const result = reconstructInternalBodyFromSharableLinkBody(inboundPayload);

            // Assert

            expect(result.POST).toBeDefined();
            expect(result.POST![RequestBodyTypeEnum.JSON]).toBeNull();
        });

        it('handles completely empty payload without throwing errors', () => {
            // Arrange

            const inboundPayload: ShareableLinkPayload['body'] = {};

            // Act

            const result = reconstructInternalBodyFromSharableLinkBody(inboundPayload);

            // Assert

            expect(result).toEqual({});
        });
    });

    describe('reconstructionInternalAuthorizationFromSharableLinkAuthorization', () => {
        it('reconstructs Basic authorization to use ResolvableStrings', () => {
            // Arrange

            const inboundAuth: ShareableLinkPayload['authorization'] = {
                type: AuthorizationType.Basic,
                value: {
                    username: 'admin',
                    password: 'password123',
                },
            };

            // Act

            const result =
                reconstructionInternalAuthorizationFromSharableLinkAuthorization(
                    inboundAuth,
                );

            // Assert

            expect(result.type).toBe(AuthorizationType.Basic);
            expect(result.value).toEqual({
                username: { raw: 'admin', resolved: 'admin' },
                password: { raw: 'password123', resolved: 'password123' },
            });
        });

        it('reconstructs Bearer authorization to use a ResolvableString', () => {
            // Arrange

            const inboundAuth: ShareableLinkPayload['authorization'] = {
                type: AuthorizationType.Bearer,
                value: 'token123',
            };

            // Act

            const result =
                reconstructionInternalAuthorizationFromSharableLinkAuthorization(
                    inboundAuth,
                );

            // Assert

            expect(result.type).toBe(AuthorizationType.Bearer);
            expect(result.value).toEqual({
                raw: 'token123',
                resolved: 'token123',
            });
        });

        it('faithfully returns standard types without modification', () => {
            // Arrange

            const inboundAuth: ShareableLinkPayload['authorization'] = {
                type: AuthorizationType.None,
            };

            // Act

            const result =
                reconstructionInternalAuthorizationFromSharableLinkAuthorization(
                    inboundAuth,
                );

            // Assert

            expect(result.type).toBe(AuthorizationType.None);
            expect(result.value).toBeUndefined();
        });
    });
});
