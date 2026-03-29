import type { RequestLog } from '@/interfaces/history/logs';
import { useSettingsStore } from '@/stores';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useRequestsHistoryStore = defineStore(
    'requestHistory',
    () => {
        /*
         * Stores & dependencies.
         */
        const settingsStore = useSettingsStore();

        // State
        const logs = ref<RequestLog[]>([]);
        const activeLogIndex = ref<number | null>(null);

        // Computed
        const maxLogs = computed(() => settingsStore.preferences.maxHistoryLogs);
        const allLogs = computed(() => logs.value);
        const lastLog = computed(() => {
            if (activeLogIndex.value !== null && logs.value[activeLogIndex.value]) {
                return logs.value[activeLogIndex.value];
            }

            return logs.value[logs.value.length - 1] ?? null;
        });

        // Actions
        const addLog = (log: RequestLog) => {
            logs.value.push(log);

            // Maintain max logs limit
            if (logs.value.length > maxLogs.value) {
                logs.value = logs.value.slice(-maxLogs.value);
            }

            activeLogIndex.value = null;
        };

        const setActiveLog = (index: number | null) => {
            activeLogIndex.value = index;
        };

        const clearLogs = () => {
            logs.value = [];
        };

        /**
         * Migrates primitive strings to rich ResolvableString objects (backward compatibility).
         */
        const migrateResolvableStrings = () => {
            logs.value.forEach(log => {
                if (!log.request) {
                    return;
                }

                // Migrate endpoint
                if (typeof log.request.endpoint === 'string') {
                    log.request.endpoint = {
                        raw: log.request.endpoint,
                        resolved: log.request.endpoint,
                    };
                }

                // Migrate headers
                log.request.headers?.forEach(header => {
                    if (typeof header.value === 'string') {
                        header.value = {
                            raw: header.value,
                            resolved: header.value,
                        };
                    }
                });

                // Migrate query parameters
                log.request.queryParameters?.forEach(param => {
                    if (typeof param.value === 'string') {
                        param.value = {
                            raw: param.value,
                            resolved: param.value,
                        };
                    }
                });

                // Migrate body
                if (typeof log.request.body === 'string') {
                    log.request.body = {
                        raw: log.request.body,
                        resolved: log.request.body,
                    };
                }
            });
        };

        return {
            // State
            logs,
            maxLogs,
            activeLogIndex,

            // Getters
            allLogs,
            lastLog,

            // Actions
            addLog,
            clearLogs,
            setActiveLog,
            migrateResolvableStrings,
        };
    },
    {
        persist: {
            afterHydrate: context => {
                context.store.migrateResolvableStrings();
            },
        },
    },
);
