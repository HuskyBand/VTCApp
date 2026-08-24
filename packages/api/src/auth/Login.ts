import type { User } from "@api/user/User"

export type LoginPayload = {
    username: string,
    password: string
}

export type RegisterPayload = {
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string,
    instrument: string,
    registerCode: string
}

export type LoginWithTokenPayload = {
    token: string
}

export type LoginResponse = {
    token: string,
    user: User
}