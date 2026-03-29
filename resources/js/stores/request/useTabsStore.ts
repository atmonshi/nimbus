import type { AuthorizationContract } from '@/interfaces/auth/authorization';
import type { ResolvableString } from '@/interfaces/common/resolvable-string';
import { AuthorizationType } from '@/interfaces/generated';
import type { RequestLog } from '@/interfaces/history/logs';
import {
    RequestBodyTypeEnum,
    type GeneratorType,
    type PendingRequest,
    type SourceGlobalHeaders,
} from '@/interfaces/http';
import type { RouteDefinition } from '@/interfaces/routes/routes';
import type { ShareableLinkPayload } from '@/interfaces/share';
import type { ParameterContract } from '@/interfaces/ui';
import { ParameterType } from '@/interfaces/ui';
import type { Tab } from '@/interfaces/ui/tabs';
import { useConfigStore, useSettingsStore, useValueGeneratorStore } from '@/stores';
import { buildRequestUrl, getDefaultPayloadTypeForRoute } from '@/utils/request';
import {
    reconstructInternalBodyFromSharableLinkBody,
    reconstructionInternalAuthorizationFromSharableLinkAuthorization,
} from '@/utils/shareableLinks';
import { generateValueFromType } from '@/utils/value-generator/generateValueFromType';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Store for managing application tabs and their associated request states.
 */
export const useTabsStore = defineStore(
    'tabs',
    () => {
        /*
         * Stores.
         */

        const settingsStore = useSettingsStore();
        const configStore = useConfigStore();
        const valueGeneratorStore = useValueGeneratorStore();

        /*
         * State.
         */

        const tabs = ref<Tab[]>([]);
        const activeTabId = ref<string | null>(null);

        const activeApplication = ref<string | null>(null);
        const lastSyncedGlobalHeaders = ref<ParameterContract[]>([]);

        /*
         * Computed.
         */

        const activeTab = computed(
            () => tabs.value.find(tab => tab.id === activeTabId.value) ?? null,
        );

        const activeRequest = computed(() => activeTab.value?.request ?? null);
        const activeResponse = computed(() => activeTab.value?.response ?? null);

        /**
         * Alias for activeRequest (backward compatibility during migration).
         */
        const pendingRequestData = computed(() => activeRequest.value);

        const hasActiveRequest = computed(() => activeRequest.value !== null);

        /*
         * Internal Helpers.
         */

        const generateGlobalHeaders = (): ParameterContract[] => {
            return configStore.headers.map(
                (globalHeader: SourceGlobalHeaders): ParameterContract => {
                    const value =
                        globalHeader.type === 'generator'
                            ? generateValueFromType(
                                  globalHeader.value as GeneratorType,
                                  valueGeneratorStore,
                              )
                            : String(globalHeader.value);

                    return {
                        type: ParameterType.Text,
                        key: globalHeader.header,
                        value: { raw: value, resolved: value },
                        enabled: true,
                    };
                },
            );
        };

        function useCurrentApplicationGlobalHeaders() {
            if (!activeRequest.value) {
                return;
            }

            const previousGlobalHeaderKeys = lastSyncedGlobalHeaders.value.map(
                header => header.key,
            );

            const filteredHeaders = activeRequest.value.headers.filter(
                header => !previousGlobalHeaderKeys.includes(header.key),
            );

            const newGlobalHeaders = generateGlobalHeaders();

            activeRequest.value.headers = [...newGlobalHeaders, ...filteredHeaders];
            lastSyncedGlobalHeaders.value = newGlobalHeaders;
        }

        const getAuthorizationForNewRequest = (): AuthorizationContract => {
            if (activeRequest.value !== null) {
                return activeRequest.value.authorization;
            }

            if (
                settingsStore.preferences.defaultAuthorizationType ===
                AuthorizationType.CurrentUser
            ) {
                return { type: AuthorizationType.CurrentUser };
            }

            if (
                settingsStore.preferences.defaultAuthorizationType ===
                AuthorizationType.Impersonate
            ) {
                return { type: AuthorizationType.Impersonate, value: 1 };
            }

            if (
                settingsStore.preferences.defaultAuthorizationType ===
                AuthorizationType.Bearer
            ) {
                return {
                    type: AuthorizationType.Bearer,
                    value: { raw: '', resolved: '' },
                };
            }

            if (
                settingsStore.preferences.defaultAuthorizationType ===
                AuthorizationType.Basic
            ) {
                return {
                    type: AuthorizationType.Basic,
                    value: {
                        username: { raw: '', resolved: '' },
                        password: { raw: '', resolved: '' },
                    },
                };
            }

            return { type: AuthorizationType.None };
        };

        const getDefaultPayload = (route: RouteDefinition): RequestBodyTypeEnum => {
            if (settingsStore.preferences.defaultRequestBodyType === -1) {
                return getDefaultPayloadTypeForRoute(route);
            }

            return settingsStore.preferences.defaultRequestBodyType;
        };

        function syncGlobalHeadersForRequest(request: PendingRequest) {
            const newGlobalHeaders = generateGlobalHeaders();

            const newGlobalHeaderKeys = newGlobalHeaders.map(header => header.key);
            const filteredHeaders = request.headers.filter(
                header => !newGlobalHeaderKeys.includes(header.key),
            );

            request.headers = [...newGlobalHeaders, ...filteredHeaders];
            lastSyncedGlobalHeaders.value = newGlobalHeaders;
        }

        function createPendingRequest(
            route: RouteDefinition,
            availableRoutesForEndpoint: RouteDefinition[],
        ): PendingRequest {
            const request: PendingRequest = {
                method: route.method,
                endpoint: { raw: route.endpoint, resolved: route.endpoint },
                headers: activeRequest.value?.headers
                    ? cloneParameters(activeRequest.value.headers)
                    : [],
                body: {},
                payloadType: getDefaultPayload(route),
                schema: route.schema,
                queryParameters: [],
                authorization:
                    activeRequest.value?.authorization ?? getAuthorizationForNewRequest(),
                supportedRoutes: availableRoutesForEndpoint,
                routeDefinition: route,
                isProcessing: false,
                wasExecuted: false,
                durationInMs: 0,
                transactionMode: activeRequest.value?.transactionMode ?? false,
            };

            syncGlobalHeadersForRequest(request);

            return request;
        }

        /*
         * Actions.
         */

        /**
         * Opens a tab for the specified route.
         * If the tab already exists, it is activated.
         */
        function openTab(
            route: RouteDefinition,
            availableRoutesForEndpoint: RouteDefinition[],
        ) {
            const existingTab = tabs.value.find(
                tab =>
                    tab.method.toUpperCase() === route.method.toUpperCase() &&
                    tab.request.endpoint.raw === route.endpoint,
            );

            if (existingTab) {
                activeTabId.value = existingTab.id;

                return;
            }

            const id = crypto.randomUUID();
            const newTab: Tab = {
                id,
                title: route.shortEndpoint || route.endpoint,
                method: route.method,
                request: createPendingRequest(route, availableRoutesForEndpoint),
                response: null,
            };

            tabs.value.push(newTab);
            activeTabId.value = id;
        }

        /**
         * Closes a tab by its ID.
         */
        function closeTab(id: string) {
            const index = tabs.value.findIndex(tab => tab.id === id);

            if (index === -1) {
                return;
            }

            tabs.value.splice(index, 1);

            if (activeTabId.value === id) {
                if (tabs.value.length > 0) {
                    const nextIndex = Math.min(index, tabs.value.length - 1);
                    activeTabId.value = tabs.value[nextIndex].id;
                } else {
                    activeTabId.value = null;
                }
            }
        }

        /**
         * Activates a tab by its ID.
         */
        function setActiveTab(id: string) {
            if (tabs.value.some(tab => tab.id === id)) {
                activeTabId.value = id;
            }
        }

        /**
         * Reorders tabs by moving a tab from one index to another.
         */
        function moveTab(fromIndex: number, toIndex: number) {
            if (
                fromIndex < 0 ||
                fromIndex >= tabs.value.length ||
                toIndex < 0 ||
                toIndex >= tabs.value.length
            ) {
                return;
            }

            const element = tabs.value.splice(fromIndex, 1)[0];
            tabs.value.splice(toIndex, 0, element);
        }

        /**
         * Updates the response log for the active tab.
         */
        function updateActiveTabResponse(log: RequestLog) {
            if (activeTab.value) {
                activeTab.value.response = log;
            }
        }

        /*
         * Request Building Actions (work on active tab).
         */

        function updateRequestMethod(method: string) {
            if (!activeRequest.value) {
                return;
            }

            const normalizedMethod = method.toUpperCase();

            if (normalizedMethod === activeRequest.value.method) {
                return;
            }

            activeRequest.value.method = normalizedMethod;

            // Switch to the route definition for this method if applicable.
            const targetRoute = activeRequest.value.supportedRoutes.find(
                (route: RouteDefinition) =>
                    route.method.toUpperCase() === normalizedMethod,
            );

            if (!targetRoute) {
                activeRequest.value.payloadType = RequestBodyTypeEnum.EMPTY;
                activeRequest.value.schema = {
                    shape: {},
                    extractionErrors: null,
                };

                return;
            }

            activeRequest.value.payloadType = getDefaultPayloadTypeForRoute(targetRoute);
            activeRequest.value.schema = targetRoute.schema;
        }

        function updateRequestEndpoint(endpoint: ResolvableString) {
            if (activeRequest.value) {
                activeRequest.value.endpoint = endpoint;
            }
        }

        function updateRequestHeaders(headers: ParameterContract[]) {
            if (activeRequest.value) {
                activeRequest.value.headers = headers;
            }
        }

        function updateRequestBody(body: PendingRequest['body']) {
            if (activeRequest.value) {
                activeRequest.value.body = body;
            }
        }

        function updateQueryParameters(parameters: ParameterContract[]) {
            if (activeRequest.value) {
                activeRequest.value.queryParameters = parameters;
            }
        }

        function updateAuthorization(authorization: AuthorizationContract) {
            if (activeRequest.value) {
                activeRequest.value.authorization = authorization;
            }
        }

        function updateTransactionMode(transactionMode: boolean) {
            if (activeRequest.value) {
                activeRequest.value.transactionMode = transactionMode;
            }
        }

        const resetRequest = () => {
            if (activeTabId.value) {
                closeTab(activeTabId.value);
            }
        };

        /**
         * Restores the request builder state from a historical request.
         */
        const cloneParameters = (
            parameters: ParameterContract[],
        ): ParameterContract[] => {
            return parameters.map(p => ({ ...p }));
        };

        const restoreResponseBody = (
            currentBody: PendingRequest['body'],
            method: string,
            payloadType: RequestBodyTypeEnum,
            newBodyContent: FormData | ResolvableString | null,
        ): PendingRequest['body'] => {
            const body = { ...currentBody };
            const methodBody = body[method] ?? {};

            body[method] = {
                ...methodBody,
                [payloadType]: newBodyContent,
            };

            return body;
        };

        const createRequestFromShearableLinkPayload = (
            payload: ShareableLinkPayload,
        ): PendingRequest => {
            const wasExecuted =
                payload.response !== undefined &&
                payload.response.durationInMs !== undefined;

            return {
                method: payload.method.toUpperCase(),
                endpoint: {
                    raw: payload.endpoint,
                    resolved: payload.endpoint,
                },
                headers: payload.headers.map(
                    (header: {
                        key: string;
                        value: string | number | boolean | null;
                    }) => ({
                        key: header.key,
                        value: {
                            raw: String(header.value ?? ''),
                            resolved: String(header.value ?? ''),
                        },
                        type: ParameterType.Text,
                        enabled: true,
                    }),
                ),
                body: reconstructInternalBodyFromSharableLinkBody(payload.body),
                payloadType: payload.payloadType as RequestBodyTypeEnum,
                schema: {
                    shape: {},
                    extractionErrors: null,
                },
                queryParameters: payload.queryParameters.map(
                    (param: { key: string; value: string; type?: 'text' | 'file' }) => ({
                        key: param.key,
                        value: {
                            raw: param.value,
                            resolved: param.value,
                        },
                        type:
                            param.type === 'file'
                                ? ParameterType.File
                                : ParameterType.Text,
                        enabled: true,
                    }),
                ),
                authorization:
                    reconstructionInternalAuthorizationFromSharableLinkAuthorization(
                        payload.authorization,
                    ),
                supportedRoutes: [],
                routeDefinition: {
                    endpoint: payload.endpoint as string,
                    method: payload.method.toUpperCase(),
                    schema: {
                        shape: {},
                        extractionErrors: null,
                    },
                    shortEndpoint: payload.endpoint as string,
                },

                isProcessing: false,
                wasExecuted,
                durationInMs: payload.response?.durationInMs ?? 0,
                transactionMode: false,
            };
        };

        const restoreFromHistory = (historicalRequest: RequestLog) => {
            if (!activeRequest.value) {
                return;
            }

            const method = historicalRequest.request.method.toUpperCase();
            const payloadType = historicalRequest.request.payloadType;

            // Try to find and sync the route definition
            const matchingRoute = activeRequest.value.supportedRoutes.find(
                (route: RouteDefinition) =>
                    route.method.toUpperCase() === method &&
                    route.endpoint === historicalRequest.request.endpoint.raw,
            );

            activeTab.value!.request = {
                ...activeRequest.value,
                method,
                endpoint: historicalRequest.request.endpoint,
                headers: cloneParameters(historicalRequest.request.headers),
                queryParameters: cloneParameters(
                    historicalRequest.request.queryParameters,
                ),
                payloadType,
                // Restore body into the correct slot with reactivity in mind
                body: restoreResponseBody(
                    activeRequest.value.body,
                    method,
                    payloadType,
                    historicalRequest.request.body,
                ),
                // Restore authorization
                authorization: {
                    ...historicalRequest.request.authorization,
                },
                // Sync route definition and schema if matching route found
                ...(matchingRoute
                    ? {
                          routeDefinition: matchingRoute,
                          schema: matchingRoute.schema,
                      }
                    : {}),
                wasExecuted: true,
                transactionMode: activeRequest.value.transactionMode ?? false,
            };

            activeTab.value!.response = historicalRequest;
        };

        const restoreFromSharedPayload = (payload: ShareableLinkPayload) => {
            const newRequest = createRequestFromShearableLinkPayload(payload);

            const id = crypto.randomUUID();
            const newTab: Tab = {
                id,
                title: payload.endpoint,
                method: payload.method,
                request: newRequest,
                response:
                    newRequest.wasExecuted && payload.response
                        ? {
                              durationInMs: payload.response.durationInMs,
                              isProcessing: false,
                              request: {
                                  ...newRequest,
                                  headers: cloneParameters(newRequest.headers),
                                  queryParameters: cloneParameters(
                                      newRequest.queryParameters,
                                  ),
                                  body: newRequest.body
                                      ? (newRequest.body[newRequest.method]?.[
                                            newRequest.payloadType
                                        ] ?? null)
                                      : null,
                              },
                              response: payload.response,
                              importedFromShare: true,
                          }
                        : null,
            };

            tabs.value.push(newTab);
            activeTabId.value = id;
        };

        const syncGlobalHeadersWhenApplicable = () => {
            if (activeApplication.value === configStore.activeApplication) {
                return;
            }

            useCurrentApplicationGlobalHeaders();

            // Update the active application for the next time.
            // It will be preserved because we persist the store state.
            activeApplication.value = configStore.activeApplication;
        };

        /**
         * Builds complete request URL with query parameters.
         */
        const getRequestUrl = (request: PendingRequest): string => {
            return buildRequestUrl(
                configStore.apiUrl,
                request.endpoint.resolved,
                request.queryParameters.filter(
                    (parameter: ParameterContract) => parameter.enabled,
                ),
            );
        };

        /**
         * Migrates primitive strings to rich ResolvableString objects (backward compatibility).
         */
        const migrateResolvableStrings = () => {
            tabs.value.forEach(tab => {
                // Migrate endpoint
                if (typeof tab.request.endpoint === 'string') {
                    tab.request.endpoint = {
                        raw: tab.request.endpoint,
                        resolved: tab.request.endpoint,
                    };
                }

                // Migrate headers
                tab.request.headers.forEach(header => {
                    if (typeof header.value === 'string') {
                        header.value = {
                            raw: header.value,
                            resolved: header.value,
                        };
                    }
                });

                // Migrate query parameters
                tab.request.queryParameters.forEach(param => {
                    if (typeof param.value === 'string') {
                        param.value = {
                            raw: param.value,
                            resolved: param.value,
                        };
                    }
                });
            });
        };

        return {
            // State
            tabs,
            activeTabId,
            activeApplication,
            lastSyncedGlobalHeaders,

            pendingRequestData,

            // Computed
            activeTab,
            activeRequest,
            activeResponse,
            hasActiveRequest,

            // Actions
            openTab,
            closeTab,
            setActiveTab,
            moveTab,
            updateActiveTabResponse,
            updateRequestMethod,
            updateRequestEndpoint,
            updateRequestHeaders,
            updateRequestBody,
            updateQueryParameters,
            updateAuthorization,
            updateTransactionMode,
            resetRequest,
            restoreFromHistory,
            restoreFromSharedPayload,
            syncGlobalHeadersWhenApplicable,
            getRequestUrl,
            migrateResolvableStrings,
        };
    },
    {
        persist: {
            pick: ['tabs', 'activeTabId', 'activeApplication', 'lastSyncedGlobalHeaders'],
            afterHydrate: context => {
                context.store.migrateResolvableStrings();
                context.store.syncGlobalHeadersWhenApplicable();
            },
        },
    },
);
