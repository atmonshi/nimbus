<script setup lang="ts">
/**
 * @component EnvironmentCollectionHeader
 * @description Header for the active environment collection, featuring inline renaming and management actions.
 */
import { AppButton } from '@/components/base/button';
import { AppTooltipWrapper } from '@/components/base/tooltip';
import { useConfirmationAction } from '@/composables/ui/useConfirmationAction';
import { useEnvironmentVariablesStore } from '@/stores';
import { templateRef } from '@vueuse/core';
import { LucideFolderPen, Trash2Icon } from 'lucide-vue-next';
import { EditableInput, EditablePreview, EditableRoot } from 'reka-ui';
import { type ComponentPublicInstance, nextTick, ref, watch } from 'vue';

/*
 * Stores & Dependencies.
 */

const environmentVariablesStore = useEnvironmentVariablesStore();

/*
 * State.
 */

const isEditingCollectionName = ref(false);
const editingCollectionName = ref('');

const collectionNamePreviewInput = templateRef<ComponentPublicInstance>(
    'collection-name-preview',
);

/*
 * Composables.
 */

const {
    isConfirming: isConfirmingRemoval,
    trigger: triggerRemovalConfirmation,
    cancel: cancelRemovalConfirmation,
} = useConfirmationAction({
    duration: 3000,
});

/*
 * Computed & Methods.
 */

const triggerCollectionNameEdit = async () => {
    if (!environmentVariablesStore.activeCollection) {
        return;
    }

    editingCollectionName.value = environmentVariablesStore.isRenamingActiveCollection
        ? ''
        : environmentVariablesStore.activeCollection.name;

    isEditingCollectionName.value = true;

    nextTick(() => {
        if (collectionNamePreviewInput.value?.$el instanceof HTMLElement) {
            collectionNamePreviewInput.value.$el.focus();
        }
    });
};

const submitCollectionName = () => {
    if (editingCollectionName.value.trim()) {
        environmentVariablesStore.renameActive(editingCollectionName.value);
    }

    isEditingCollectionName.value = false;
    environmentVariablesStore.completeRenaming();
};

const handleCollectionRemoval = () => {
    if (!environmentVariablesStore.activeCollectionId) {
        return;
    }

    triggerRemovalConfirmation(() => {
        environmentVariablesStore.removeCollection(
            environmentVariablesStore.activeCollectionId!,
        );
    });
};

/*
 * Watchers.
 */

watch(
    [
        () => environmentVariablesStore.activeCollectionId,
        () => environmentVariablesStore.isRenamingActiveCollection,
    ],
    ([newId, picking], [oldId]) => {
        if (newId !== oldId) {
            isEditingCollectionName.value = false;
            editingCollectionName.value =
                environmentVariablesStore.activeCollection?.name ?? '';
            cancelRemovalConfirmation();
        }

        if (picking) {
            nextTick(() => triggerCollectionNameEdit());
        }
    },
    { immediate: true },
);
</script>

<template>
    <div
        class="h-toolbar bg-subtle px-panel relative flex w-full items-center justify-between gap-1"
    >
        <div class="flex min-w-0 flex-1 items-center">
            <EditableRoot
                v-if="environmentVariablesStore.activeCollection"
                v-model:edit-mode="isEditingCollectionName"
                v-model="editingCollectionName"
                placeholder="Collection name..."
                class="flex w-full min-w-0 items-center"
                data-testid="collection-name-editor"
                @submit="submitCollectionName"
            >
                <EditablePreview
                    v-if="environmentVariablesStore.activeCollection"
                    ref="collection-name-preview"
                    class="-ml-1 cursor-text rounded px-1 text-sm font-medium transition-colors hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                >
                    {{ environmentVariablesStore.activeCollection.name }}
                </EditablePreview>
                <EditableInput
                    class="bg-info/5 w-full border-none p-0 text-sm font-medium focus:ring-0 focus:outline-none"
                />
            </EditableRoot>
            <span v-else class="text-subtle-foreground text-xs">[Collection name]</span>
        </div>

        <!-- Management Actions -->
        <div class="flex items-center gap-1">
            <AppTooltipWrapper value="Rename" :on-click="triggerCollectionNameEdit">
                <AppButton
                    size="xs"
                    class="size-7 shadow-none [&_svg]:size-3.5"
                    variant="outline"
                    :disabled="!environmentVariablesStore.activeCollection"
                >
                    <LucideFolderPen />
                </AppButton>
            </AppTooltipWrapper>

            <AppTooltipWrapper value="Delete" :on-click="handleCollectionRemoval">
                <AppButton
                    size="xs"
                    class="group relative size-7 overflow-hidden shadow-none [&_svg]:size-3.5"
                    variant="outline"
                    :class="{
                        'text-destructive hover:text-destructive': isConfirmingRemoval(),
                    }"
                    :disabled="!environmentVariablesStore.activeCollection"
                >
                    <Trash2Icon class="relative z-10" />
                </AppButton>
            </AppTooltipWrapper>
        </div>
    </div>
</template>
