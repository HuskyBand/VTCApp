export enum PermFlags {
    IsLeadership, // Leadership will have important roles later down the line.
    IsAssistant, // TAs get more privilege.
    IsDirector // Dr. Thunder himself is able to edit pretty much everything.
}

export type User = {
    username: string,
    firstName: string,
    lastName: string,
    permFlags: PermFlags;
}