import { useConfirmationAction } from '@/composables/ui/useConfirmationAction';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useConfirmationAction', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should have initial state as not confirming', () => {
        const { isConfirming } = useConfirmationAction();
        expect(isConfirming()).toBe(false);
    });

    it('should enter confirmation state on first trigger and NOT execute callback', () => {
        const { isConfirming, trigger } = useConfirmationAction();
        const callback = vi.fn();

        trigger(callback);

        expect(isConfirming()).toBe(true);
        expect(callback).not.toHaveBeenCalled();
    });

    it('should execute callback and reset state on second trigger while confirming', () => {
        const { isConfirming, trigger } = useConfirmationAction();
        const callback = vi.fn();

        // First trigger
        trigger(callback);
        expect(isConfirming()).toBe(true);

        // Second trigger
        trigger(callback);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(isConfirming()).toBe(false);
    });

    it('should allow multiple independent confirmation states by ID', () => {
        const { isConfirming, trigger } = useConfirmationAction();
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        // Trigger first
        trigger(callback1, 'id1');
        expect(isConfirming('id1')).toBe(true);
        expect(isConfirming('id2')).toBe(false);

        // Trigger second
        trigger(callback2, 'id2');
        expect(isConfirming('id2')).toBe(true);

        // Confirm first
        trigger(callback1, 'id1');
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(isConfirming('id1')).toBe(false);
        expect(isConfirming('id2')).toBe(true);
    });

    it('should reset single state automatically after the specified duration', () => {
        const duration = 2000;
        const { isConfirming, trigger } = useConfirmationAction({ duration });
        const callback = vi.fn();

        trigger(callback);
        expect(isConfirming()).toBe(true);

        // Advance almost to the end
        vi.advanceTimersByTime(1999);
        expect(isConfirming()).toBe(true);

        // Cross the duration
        vi.advanceTimersByTime(1);
        expect(isConfirming()).toBe(false);
    });

    it('should reset specific state by ID after the duration', () => {
        const { isConfirming, trigger } = useConfirmationAction({ duration: 1000 });

        trigger(() => {}, 'id-a');
        trigger(() => {}, 'id-b');

        vi.advanceTimersByTime(500);
        expect(isConfirming('id-a')).toBe(true);
        expect(isConfirming('id-b')).toBe(true);

        vi.advanceTimersByTime(501);
        expect(isConfirming('id-a')).toBe(false);
        expect(isConfirming('id-b')).toBe(false);
    });

    it('should cancel confirmation state manually', () => {
        const { isConfirming, trigger, cancel } = useConfirmationAction();
        const callback = vi.fn();

        trigger(callback);
        expect(isConfirming()).toBe(true);

        cancel();
        expect(isConfirming()).toBe(false);
    });
});
