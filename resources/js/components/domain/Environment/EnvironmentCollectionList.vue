<script setup lang="ts">
/**
 * @component EnvironmentCollectionList
 * @description Renders the sidemenu list of environment collections with active state management.
 */
import { AppBadge } from '@/components/base/badge';
import AppRoundIndicator from '@/components/base/round-indicator/AppRoundIndicator.vue';
import { useEnvironmentVariablesStore } from '@/stores';
import { PlusIcon } from 'lucide-vue-next';

/*
 * Stores & Dependencies.
 */

const environmentVariablesStore = useEnvironmentVariablesStore();

/*
 * Computed & Methods.
 */

const handleCollectionSelect = (collectionId: string) => {
    environmentVariablesStore.select(collectionId);
};
</script>

<template>
    <div class="flex w-full max-w-xs flex-col space-y-2">
        <div
            v-if="!environmentVariablesStore.hasCollections"
            type="button"
            class="hover:bg-subtle w-full cursor-pointer rounded border text-left text-sm"
            @click="environmentVariablesStore.addCollection"
        >
            <div
                class="p-panel h-toolbar flex items-center gap-1.5"
                data-testid="empty-collection-placeholder"
            >
                <PlusIcon class="size-3" />
                Add your first Collection
            </div>
        </div>

        <div
            v-for="collection in environmentVariablesStore.collections"
            :key="collection.id"
            type="button"
            class="p-panel hover:bg-subtle w-full cursor-pointer rounded border text-left text-sm"
            data-testid="collection-item"
            :class="{
                'bg-subtle':
                    environmentVariablesStore.activeCollectionId === collection.id,
            }"
            @click="handleCollectionSelect(collection.id)"
        >
            <div class="flex items-center gap-1.5">
                <div class="flex-1 gap-1 leading-tight">
                    <div class="mb-0 font-medium">{{ collection.name }}</div>
                    <span class="text-xs">
                        {{ collection.variables.length }} variables
                    </span>
                </div>
                <div class="flex items-center gap-2.5">
                    <AppBadge
                        v-if="
                            environmentVariablesStore.activeCollectionId === collection.id
                        "
                        variant="outline"
                        class="text-emerald-600"
                        data-testid="collection-active-badge"
                    >
                        Active
                    </AppBadge>
                    <AppRoundIndicator
                        v-if="
                            environmentVariablesStore.activeCollectionId === collection.id
                        "
                        class="text-emerald-600"
                    />
                    <AppRoundIndicator v-else class="text-subtle-foreground" />
                </div>
            </div>
        </div>
    </div>
</template>
