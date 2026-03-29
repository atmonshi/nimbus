<script setup lang="ts">
/**
 * @component RequestBodyJson
 * @description JSON content editor for request bodies, with schema validation support.
 */
import CodeEditor from '@/components/domain/CodeEditor/CodeEditor.vue';
import { envVariablesCheck } from '@/components/domain/CodeEditor/extensions';
import type { ResolvableString } from '@/interfaces/common/resolvable-string';
import { useEnvironmentVariablesStore } from '@/stores';
import type { JSONSchema7 } from 'json-schema';
import { computed } from 'vue';

/*
 * Types & Interfaces.
 */

export interface AppRequestBodyJsonProps {
    schema: JSONSchema7 | undefined;
}

/*
 * Component Setup.
 */

defineProps<AppRequestBodyJsonProps>();

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
        language="json"
        :readonly="false"
        placeholder="Your JSON Payload"
        :validation-schema="schema"
        :custom-extensions="customExtensions"
    />
</template>
