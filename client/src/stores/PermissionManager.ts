export enum UserPermission {
    BandMember = 'band_member',
    Elevated = 'elevated', // SL/DM/Leadership
    Evaluator = 'evaluator',
    Instructor = 'instructor',
    DrJahlas = 'dr_jahlas'
}

export type PermissionLevel = 'band_member' | 'elevated' | 'evaluator' | 'instructor' | 'dr_jahlas';

const permissionLabels: Record<UserPermission, string> = {
    [UserPermission.BandMember]: 'Band Member',
    [UserPermission.Elevated]: 'Elevated (SL/DM/Leadership)',
    [UserPermission.Evaluator]: 'Evaluator',
    [UserPermission.Instructor]: 'Instructor',
    [UserPermission.DrJahlas]: 'Dr. Jahlas'
};

let currentPermission = UserPermission.BandMember;

const PermissionManager = {
    get permission(): UserPermission {
        return currentPermission;
    },
    
    set permission(perm: UserPermission) {
        currentPermission = perm;
    },
    
    canViewAdmin(): boolean {
        return currentPermission === UserPermission.DrJahlas;
    },
    
    canEvaluate(): boolean {
        return [
            UserPermission.Evaluator,
            UserPermission.DrJahlas,
            UserPermission.Elevated,
            UserPermission.Instructor
        ].includes(currentPermission);
    },
    
    canEditRubric(): boolean {
        return currentPermission === UserPermission.DrJahlas;
    },
    
    getPermissionLabel(perm: UserPermission): string {
        return permissionLabels[perm];
    },
    
    getAllPermissions(): UserPermission[] {
        return Object.values(UserPermission);
    }
};

export default PermissionManager;
