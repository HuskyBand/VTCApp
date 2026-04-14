import type { User } from "@api/user/User"

export type LoginPayload = {
    username: string,
    password: string
}

export type LoginWithTokenPayload = {
    token: string
}

export type LoginResponse = {
    token: string,
    user: User
}