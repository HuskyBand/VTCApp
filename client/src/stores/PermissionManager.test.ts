import { describe, expect, it } from 'vitest';

import PermissionManager, { UserPermission } from './PermissionManager';

describe('PermissionManager', () => {
    it('checks admin and evaluator permissions correctly', () => {
        PermissionManager.permission = UserPermission.BandMember;
        expect(PermissionManager.canViewAdmin()).toBe(false);
        expect(PermissionManager.canEvaluate()).toBe(false);

        PermissionManager.permission = UserPermission.Evaluator;
        expect(PermissionManager.canViewAdmin()).toBe(false);
        expect(PermissionManager.canEvaluate()).toBe(true);

        PermissionManager.permission = UserPermission.DrJahlas;
        expect(PermissionManager.canViewAdmin()).toBe(true);
        expect(PermissionManager.canEvaluate()).toBe(true);
    });

    it('returns friendly permission labels', () => {
        expect(PermissionManager.getPermissionLabel(UserPermission.BandMember)).toBe('Band Member');
        expect(PermissionManager.getPermissionLabel(UserPermission.DrJahlas)).toBe('Dr. Jahlas');
    });
});
