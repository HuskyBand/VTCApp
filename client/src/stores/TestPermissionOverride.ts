export enum GlobalTier {
    BandMember = 'band_member',
    Elevated = 'elevated',
    Director = 'dr_jahlas'
}

const tierLabels: Record<GlobalTier, string> = {
    [GlobalTier.BandMember]: 'Band Member',
    [GlobalTier.Elevated]: 'Elevated (SL/DM/Leadership)',
    [GlobalTier.Director]: 'Dr. Jahlas'
};

let currentTier = GlobalTier.BandMember;

const TestPermissionOverride = {
    get tier(): GlobalTier {
        return currentTier;
    },

    set tier(tier: GlobalTier) {
        currentTier = tier;
    },

    getLabel(tier: GlobalTier): string {
        return tierLabels[tier];
    },

    getAllTiers(): GlobalTier[] {
        return Object.values(GlobalTier);
    }
};

export default TestPermissionOverride;
