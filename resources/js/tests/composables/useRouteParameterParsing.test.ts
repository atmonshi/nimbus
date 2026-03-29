import { useRouteParameterParsing } from '@/composables/request/useRouteParameterParsing';
import { describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';

describe('useRouteParameterParsing', () => {
    it('parses route parameters correctly', () => {
        const endpoint = ref({ raw: '/api/users/{id}/posts/{postId}', resolved: '' });
        const { parameters } = useRouteParameterParsing(endpoint);

        expect(parameters.value).toEqual(['id', 'postId']);
    });

    it('ignores environment variables with double braces', () => {
        const endpoint = ref({ raw: '/api/{{collection}}/users/{id}', resolved: '' });
        const { parameters } = useRouteParameterParsing(endpoint);

        expect(parameters.value).toEqual(['id']);
    });

    it('returns empty array when no parameters are present', () => {
        const endpoint = ref({ raw: '/api/users/123', resolved: '' });
        const { parameters } = useRouteParameterParsing(endpoint);

        expect(parameters.value).toEqual([]);
    });

    it('works with computed endpoint', () => {
        const raw = ref({ raw: '/api/{resource}', resolved: '' });
        const endpoint = computed(() => raw.value);
        const { parameters } = useRouteParameterParsing(endpoint);

        expect(parameters.value).toEqual(['resource']);
    });

    it('updates when endpoint changes', async () => {
        const endpoint = ref({ raw: '/api/{old}', resolved: '' });
        const { parameters } = useRouteParameterParsing(endpoint);

        expect(parameters.value).toEqual(['old']);

        endpoint.value = { raw: '/api/{new}', resolved: '' };
        expect(parameters.value).toEqual(['new']);
    });
});
