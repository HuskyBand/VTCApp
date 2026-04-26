export const enum PermFlags {
    IsLeadership, // Leadership will have important roles later down the line.
    IsAssistant, // TAs get more privilege.
    IsDirector // Dr. Jahlas himself is able to edit pretty much everything.
}

export type User = {
    username: string,
    firstName: string,
    lastName: string,
    permFlags: PermFlags;
}