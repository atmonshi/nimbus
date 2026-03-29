import { useRequestBody } from '@/composables/request/useRequestBody';
import type { ResolvableString } from '@/interfaces/common/resolvable-string';
import { AuthorizationType } from '@/interfaces/generated';
import type { PendingRequest } from '@/interfaces/http';
import { RequestBodyTypeEnum } from '@/interfaces/http';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, reactive } from 'vue';

/*
 * Fixtures.
 */

const requestStore = reactive({
    pendingRequestData: null as unknown as PendingRequest | null,
});

vi.mock('@/stores', async importOriginal => {
    const actual = await importOriginal<object>();

    return {
        ...actual,
        useRequestStore: () => requestStore,
    };
});

const payloadMocks = vi.hoisted(() => ({
    generatePlaceholderPayload: vi.fn(() => ({ placeholder: true })),
    generateRandomPayload: vi.fn(() => ({ random: true })),
    serializeSchemaPayload: vi.fn(() => ({
        raw: '{"serialized":true}',
        resolved: '{"serialized":true}',
    })),
}));

vi.mock('@/utils/payload', () => payloadMocks);

const createPendingRequest = (): PendingRequest => ({
    method: 'POST',
    endpoint: { raw: 'api/users', resolved: 'api/users' },
    headers: [],
    body: {},
    payloadType: RequestBodyTypeEnum.JSON,
    schema: {
        shape: { properties: { name: { type: 'string' } } },
        extractionErrors: null,
    },
    queryParameters: [],
    authorization: { type: AuthorizationType.None },
    supportedRoutes: [],
    routeDefinition: {
        method: 'POST',
        endpoint: 'api/users',
        shortEndpoint: 'api/users',
        schema: {
            shape: { properties: { name: { type: 'string' } } },
            extractionErrors: null,
        },
    },
    isProcessing: false,
    wasExecuted: false,
    durationInMs: 0,
});

describe('useRequestBody', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        requestStore.pendingRequestData = createPendingRequest();
        vi.clearAllMocks();
    });

    const runComposable = (): ReturnType<typeof useRequestBody> => {
        let composable: ReturnType<typeof useRequestBody>;
        effectScope().run(() => {
            composable = useRequestBody();
        });

        return composable!;
    };

    /*
     * Generation tests.
     */

    describe('Generation', () => {
        it('generates placeholder payload when none memoized', () => {
            // Arrange

            const composable = runComposable();
            composable.payloadType.value = RequestBodyTypeEnum.JSON;

            // Act

            const payload = composable.generateCurrentPayload() as ResolvableString;

            // Assert

            expect(payloadMocks.generatePlaceholderPayload).toHaveBeenCalled();
            expect(payload.raw).toBe('{"serialized":true}');
        });

        it('hydrates payload from memoized body when available', () => {
            // Arrange

            const pending = requestStore.pendingRequestData!;
            pending.body = {
                POST: {
                    [RequestBodyTypeEnum.JSON]: {
                        raw: '{"cached":true}',
                        resolved: '{"cached":true}',
                    },
                },
            };
            const composable = runComposable();
            composable.payloadType.value = RequestBodyTypeEnum.JSON;

            // Act

            const payload = composable.generateCurrentPayload() as ResolvableString;

            // Assert

            expect(payload.raw).toBe('{"cached":true}');
        });
    });

    /*
     * Behavior tests.
     */

    describe('Behavior', () => {
        it('autofills payload using random generator', () => {
            // Arrange

            const composable = runComposable();
            composable.payloadType.value = RequestBodyTypeEnum.JSON;

            // Act

            composable.autofill();

            // Assert

            expect(payloadMocks.generateRandomPayload).toHaveBeenCalled();
            expect((composable.payload.value as ResolvableString).raw).toBe(
                '{"serialized":true}',
            );
        });
    });

    it('initializes immediately from store during setup', () => {
        requestStore.pendingRequestData = createPendingRequest();
        requestStore.pendingRequestData.payloadType = RequestBodyTypeEnum.JSON;
        requestStore.pendingRequestData.body = {
            POST: {
                [RequestBodyTypeEnum.JSON]: {
                    raw: '{"immediate":true}',
                    resolved: '{"immediate":true}',
                },
            },
        };

        const composable = runComposable();

        expect(composable.payloadType.value).toBe(RequestBodyTypeEnum.JSON);
        expect((composable.payload.value as ResolvableString).raw).toBe(
            '{"immediate":true}',
        );
    });
});
