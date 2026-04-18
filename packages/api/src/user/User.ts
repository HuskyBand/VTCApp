export const PermFlags = {
    IsLeadership: 1, // Leadership will have important roles later down the line.
    IsAssistant: 2, // TAs get more privilege.
    IsDirector: 3, // Dr. Thunder himself is able to edit pretty much everything.
    LevelMask: 3 // When more flags are added, this will be the base "level" mask.
} as const;

export type PermFlags = number;

export type User = {
    username: string,
    firstName: string,
    lastName: string,
    permFlags: PermFlags
}