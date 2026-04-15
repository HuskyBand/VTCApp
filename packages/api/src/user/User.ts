export const PermLevel = {
    IsLeadership: 1, // Leadership will have important roles later down the line.
    IsAssistant: 2, // TAs get more privilege.
    IsDirector: 3 // Dr. Thunder himself is able to edit pretty much everything.
} as const;

type PermLevel = typeof PermLevel[keyof typeof PermLevel];

export type User = {
    username: string,
    firstName: string,
    lastName: string,
    permFlags: PermLevel
}