import {
    type ResolvableString,
    type StringSegment,
} from '@/interfaces/common/resolvable-string';
import { useEnvironmentVariablesStore } from '@/stores/core/useEnvironmentVariablesStore';
import { computed, type Ref, ref, watch } from 'vue';

export interface EnvVariablesAwareStringResult {
    raw: Ref<string>;
    resolved: Ref<string>;
    segments: Ref<StringSegment[]>;
}

/**
 * Composable that manages the resolution of environment variables within a string.
 *
 * @param source - The reactive source (string or { raw: string, resolved: string }) to resolve.
 * @returns Reactive resolution state and utilities.
 */
export function useEnvVariablesAwareString(
    source: Ref<ResolvableString>,
): EnvVariablesAwareStringResult {
    const environmentVariablesStore = useEnvironmentVariablesStore();

    /*
     * State.
     */

    const rawValue: Ref<string> = ref('');

    /*
     * Computed.
     */

    const fullyResolvedString = computed(() => {
        return environmentVariablesStore.resolve(rawValue.value);
    });

    const segments = computed(() => {
        return environmentVariablesStore.getSegments(rawValue.value);
    });

    /*
     * Watchers.
     */

    /**
     * Sync the local raw state with the source.
     */
    watch(
        source,
        (newSource: ResolvableString) => {
            if (newSource.raw !== rawValue.value) {
                rawValue.value = newSource.raw;
            }
        },
        { immediate: true },
    );

    /**
     * Update the source when the local raw state or resolved state changes.
     */
    watch([rawValue, fullyResolvedString], ([newRaw, newResolved]) => {
        const currentSource = source.value;

        if (newRaw !== currentSource.raw || newResolved !== currentSource.resolved) {
            source.value = { raw: newRaw, resolved: newResolved } as ResolvableString;
        }
    });

    return {
        raw: rawValue,
        resolved: fullyResolvedString,
        segments,
    };
}
