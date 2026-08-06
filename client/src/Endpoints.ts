export const Endpoints = {
    /**
     * `POST` - Check if the server is alive.
     */
    HEALTH_CHECK: '/_health',

    auth: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        me: '/auth/me',
        profile: '/auth/profile'
    },

    users: {
        list: '/users',
        permissions: (userId: number) => `/users/${userId}/permissions`,
        stationRole: (userId: number, stationId: number) => `/users/${userId}/stations/${stationId}/role`,
        stationRoles: (userId: number) => `/users/${userId}/stations/roles`
    },

    evaluations: {
        submit: '/evaluations',
        list: (userId: number) => `/evaluations/${userId}`
    },

    notifications: {
        list: '/notifications',
        create: '/notifications'
    },

    admin: {
        overview: '/admin/overview'
    },

    AUTH_LOGOUT: '/auth/logout',

    STATION_LIST: `/stations`,
    STATION: (stationId: string) => `/stations/${stationId}`,
    STATION_CRITERIA_LIST: (stationId: string) => `/stations/${stationId}/criteria`,
    STATION_EVALUATION_LATEST: (stationId: string, userId: string = '@me') => `/stations/${stationId}/evaluations/${userId}`,
    STATION_QUEUE: (stationId: number | string) => `/stations/${stationId}/queue`,
    STATION_QUEUE_NEXT: (stationId: number | string) => `/stations/${stationId}/queue/next`
};
