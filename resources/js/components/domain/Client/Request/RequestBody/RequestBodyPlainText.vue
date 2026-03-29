<script setup lang="ts">
/**
 * @component RequestBodyPlainText
 * @description Plain text editor for request bodies.
 */
import CodeEditor from '@/components/domain/CodeEditor/CodeEditor.vue';
import { envVariablesCheck } from '@/components/domain/CodeEditor/extensions';
import type { ResolvableString } from '@/interfaces/common/resolvable-string';
import { useEnvironmentVariablesStore } from '@/stores';
import { computed } from 'vue';

/*
 * Types & Interfaces.
 */

export interface AppRequestBodyPlainTextProps {}

/*
 * Component Setup.
 */

defineProps<AppRequestBodyPlainTextProps>();

const model = defineModel<ResolvableString>({
    default: () => ({ raw: '', resolved: '' }),
});

const environmentVariablesStore = useEnvironmentVariablesStore();

const modelProxy = computed({
    get: () => model.value.raw,
    set: raw => {
        model.value = {
            raw,
            resolved: environmentVariablesStore.resolve(raw),
        };
    },
});

const customExtensions = computed(() => {
    return [envVariablesCheck(key => environmentVariablesStore.check(key))];
});
</script>

<template>
    <CodeEditor
        v-model="modelProxy"
        language="plain"
        :readonly="false"
        placeholder="Your Plain Text Content"
        :custom-extensions="customExtensions"
    />
</template>
