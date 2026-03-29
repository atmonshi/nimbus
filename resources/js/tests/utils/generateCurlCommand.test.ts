import { AuthorizationType } from '@/interfaces/generated';
import type { PendingRequest } from '@/interfaces/http';
import { RequestBodyTypeEnum } from '@/interfaces/http';
import { ParameterType } from '@/interfaces/ui';
import { generateCurlCommand } from '@/utils/request';
import { describe, expect, it } from 'vitest';

const requestBase: PendingRequest = {
    method: 'POST',
    endpoint: { raw: 'users', resolved: 'users' },
    headers: [
        {
            key: 'Authorization',
            value: { raw: 'Bearer token', resolved: 'Bearer token' },
            enabled: true,
            type: ParameterType.Text,
        },
        {
            key: 'Accept',
            value: { raw: 'application/json', resolved: 'application/json' },
            enabled: true,
            type: ParameterType.Text,
        },
    ],
    body: {
        POST: {
            [RequestBodyTypeEnum.JSON]: {
                raw: JSON.stringify({ name: 'Jane' }),
                resolved: JSON.stringify({ name: 'Jane' }),
            },
        },
    },
    payloadType: RequestBodyTypeEnum.JSON,
    schema: {
        shape: {},
        extractionErrors: null,
    },
    queryParameters: [
        {
            key: 'page',
            value: { raw: '1', resolved: '1' },
            enabled: true,
            type: ParameterType.Text,
        },
    ],
    authorization: {
        type: AuthorizationType.Bearer,
        value: { raw: 'token', resolved: 'token' },
    },
    supportedRoutes: [],
    routeDefinition: {
        method: 'POST',
        endpoint: 'users',
        shortEndpoint: 'users',
        schema: {
            shape: {},
            extractionErrors: null,
        },
    },
    isProcessing: false,
    wasExecuted: false,
    durationInMs: 0,
};

describe('generateCurlCommand', () => {
    it('builds curl command with method, headers, and body [POST]', () => {
        // Act

        const { command, hasSpecialAuth } = generateCurlCommand(
            requestBase,
            'https://api.example.com',
        );

        // Assert

        expect(command).toContain('curl');
        expect(command).toContain('-X POST');
        expect(command).toContain('"https://api.example.com/users?page=1"');
        expect(command).toContain('-H "Authorization: Bearer token"');
        expect(command).toContain('-H "Accept: application/json"');
        expect(command).toContain('\'{"name":"Jane"}\'');
        expect(hasSpecialAuth).toBe(false);
    });

    it('builds curl command with method, headers, and body [GET]', () => {
        // Arrange

        const getRequestBase = Object.assign({}, requestBase);

        getRequestBase.method = 'GET';

        getRequestBase.body.GET = getRequestBase.body.POST;

        // Act

        const { command, hasSpecialAuth } = generateCurlCommand(
            getRequestBase,
            'https://api.example.com',
        );

        // Assert

        expect(command).toContain('curl');
        expect(command).toContain('"https://api.example.com/users?page=1&name=Jane"');
        expect(command).toContain('-H "Authorization: Bearer token"');
        expect(command).toContain('-H "Accept: application/json"');
        expect(hasSpecialAuth).toBe(false);
    });

    it('builds curl command with method, headers, and nested body [POST]', () => {
        // Arrange

        const getRequestBase = Object.assign({}, requestBase);

        getRequestBase.body.POST = {
            [RequestBodyTypeEnum.JSON]: {
                raw: JSON.stringify({
                    user: { firstName: 'Jane', lastName: 'Doe' },
                    username: 'foobar',
                }),
                resolved: JSON.stringify({
                    user: { firstName: 'Jane', lastName: 'Doe' },
                    username: 'foobar',
                }),
            },
        };

        // Act

        const { command, hasSpecialAuth } = generateCurlCommand(
            getRequestBase,
            'https://api.example.com',
        );

        // Assert

        expect(command).toContain('curl');
        expect(command).toContain('"https://api.example.com/users?page=1');
        expect(command).toContain('-H "Authorization: Bearer token"');
        expect(command).toContain('-H "Accept: application/json"');
        expect(command).toContain(
            '\'{"user":{"firstName":"Jane","lastName":"Doe"},"username":"foobar"}\'',
        );
        expect(hasSpecialAuth).toBe(false);
    });

    it('builds curl command with method, headers, and nested body [GET]', () => {
        // Arrange

        const getRequestBase = Object.assign({}, requestBase);

        getRequestBase.method = 'GET';

        getRequestBase.body.GET = {
            [RequestBodyTypeEnum.JSON]: {
                raw: JSON.stringify({
                    user: { firstName: 'Jane', lastName: 'Doe' },
                    username: 'foobar',
                }),
                resolved: JSON.stringify({
                    user: { firstName: 'Jane', lastName: 'Doe' },
                    username: 'foobar',
                }),
            },
        };

        // Act

        const { command, hasSpecialAuth } = generateCurlCommand(
            getRequestBase,
            'https://api.example.com',
        );

        // Assert

        expect(command).toContain('curl');
        expect(command).toContain(
            '"https://api.example.com/users?page=1&user%5BfirstName%5D=Jane&user%5BlastName%5D=Doe&username=foobar"',
        );
        expect(command).toContain('-H "Authorization: Bearer token"');
        expect(command).toContain('-H "Accept: application/json"');
        expect(hasSpecialAuth).toBe(false);
    });

    it('handles arrays and nested objects in query parameters [GET]', () => {
        // Arrange

        const getRequestBase = JSON.parse(JSON.stringify(requestBase));

        getRequestBase.method = 'GET';
        getRequestBase.endpoint = { raw: 'search', resolved: 'search' };

        getRequestBase.body.GET = {
            [RequestBodyTypeEnum.JSON]: {
                raw: JSON.stringify({
                    tags: ['vitest', 'nimbus'],
                    filters: { status: 'active', types: ['admin', 'user'] },
                }),
                resolved: JSON.stringify({
                    tags: ['vitest', 'nimbus'],
                    filters: { status: 'active', types: ['admin', 'user'] },
                }),
            },
        };

        // Act

        const { command } = generateCurlCommand(
            getRequestBase,
            'https://api.example.com',
        );

        // Assert

        expect(command).toContain('curl');
        expect(command).toContain(
            '"https://api.example.com/search?page=1&tags%5B%5D=vitest&tags%5B%5D=nimbus&filters%5Bstatus%5D=active&filters%5Btypes%5D%5B%5D=admin&filters%5Btypes%5D%5B%5D=user"',
        );
    });

    it('flags special authorization types', () => {
        // Arrange

        const request: PendingRequest = {
            ...requestBase,
            authorization: { type: AuthorizationType.Impersonate, value: 1 },
        } as PendingRequest;

        // Act

        const { hasSpecialAuth } = generateCurlCommand(
            request,
            'https://api.example.com',
        );

        // Assert

        expect(hasSpecialAuth).toBe(true);
    });
});
