import type { ResolvableString } from '@/interfaces/common/resolvable-string';
import { ParameterType } from '@/interfaces/ui';
import { useEnvironmentVariablesStore } from '@/stores/core/useEnvironmentVariablesStore';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { useEnvVariablesAwareString } from './useEnvVariablesAwareString';

describe('useEnvVariablesAwareString', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('updates parent source when environment variables update (reactivity)', async () => {
        // Arrange

        const envStore = useEnvironmentVariablesStore();
        envStore.addCollection();
        envStore.updateVariables([
            {
                id: 1,
                type: ParameterType.Text,
                key: 'host',
                value: { raw: 'localhost', resolved: 'localhost' },
                enabled: true,
            },
        ]);

        const source = ref<ResolvableString>({
            raw: '{{host}}',
            resolved: 'localhost',
        });

        const { raw, resolved } = useEnvVariablesAwareString(source);

        // Assert (pre-condition)
        expect(raw.value).toBe('{{host}}');
        expect(resolved.value).toBe('localhost');

        // Act

        // Update environment variable
        envStore.updateVariables([
            {
                id: 1,
                type: ParameterType.Text,
                key: 'host',
                value: { raw: 'production.nimbus', resolved: 'production.nimbus' },
                enabled: true,
            },
        ]);

        // Wait for watchers
        await nextTick();

        // Assert

        // Assert: Both the internal resolved value AND the parent source should be updated
        expect(resolved.value).toBe('production.nimbus');

        // This validates the specific bug fix
        expect(source.value.resolved).toBe('production.nimbus');
        expect(source.value.raw).toBe('{{host}}');
    });

    it('syncs internal raw state when parent source changes externally', async () => {
        // Arrange

        const envStore = useEnvironmentVariablesStore();
        envStore.addCollection();
        envStore.updateVariables([
            {
                id: 1,
                type: ParameterType.Text,
                key: 'host',
                value: { raw: 'localhost', resolved: 'localhost' },
                enabled: true,
            },
        ]);

        const source = ref<ResolvableString>({
            raw: '',
            resolved: '',
        });

        const { raw, resolved } = useEnvVariablesAwareString(source);

        // Assert (pre-condition)

        expect(raw.value).toBe('');
        expect(resolved.value).toBe('');

        // Act

        // Simulate a component directly updating the bound object
        source.value = {
            raw: '{{host}}/api',
            resolved: 'localhost/api',
        };

        await nextTick();

        // Assert

        expect(raw.value).toBe('{{host}}/api');
        expect(resolved.value).toBe('localhost/api');
    });
});
