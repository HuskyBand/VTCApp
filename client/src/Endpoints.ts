export const Endpoints = {
    /**
     * `POST` - Login with the provided username and password.
     */
    AUTH_LOGIN: '/auth/login',
    /**
     * `POST` - Logout from the current account.
     */
    AUTH_LOGOUT: '/auth/logout',
    /**
     * `POST` - Create a new account with the provided name, username, email, and password.
     */
    AUTH_SIGNUP: '/auth/signup',

    /**
     * `GET` - Returns basic information about a station criteria.
     * 
     * `PATCH` - Updates the summary rubric for a criteria.
     * 
     * `DELETE` - Deletes a criteria.
     */ 
    CRITERIA: (criteriaId: string) => `/criteria/${criteriaId}`,
    /** 
     * `GET` - Returns the full rubric for a criteria.
     * 
     * `PATCH` - Updates the full rubric for a criteria.
     */ 
    CRITERIA_RUBRIC: (criteriaId: string) => `/criteria/${criteriaId}/rubric`,
    /** 
     * `GET` - Returns the status of a user with this criteria. Includes the most recent evaluator notes if any.
     * 
     * `POST` - Sets the status of a user with this criteria.
     */ 
    CRITERIA_STATUS: (criteriaId: string, userId: string) => `/criteria/${criteriaId}/status/${userId}`,
    
    /** 
     * `POST` - Begins an evaluation at the specified station.
     */ 
    EVALUATION_LIST: `/evals/`,
    /** 
     * `POST` - Submits an evaluation.
     */ 
    EVALUTATION_SUBMIT: `/evals/submit`,
    /** 
     * `POST` - Cancels an evaluation.
     */ 
    EVALUTATION_CANCEL: `/evals/cancel`,

    /** 
     * `GET` - Lists all VTC stations.
     * 
     * `POST` - Creates a new station.
     */ 
    STATION_LIST: `/stations`,
    /** 
     * `GET` - Returns basic information about a station.
     * 
     * `DELETE` - Deletes a station.
     */ 
    STATION: (stationId: string) => `/stations/${stationId}`,
    /** 
     * `GET` - Returns a list of criteria IDs.
     */ 
    STATION_CRITERIA_LIST: (stationId: string) => `/stations/${stationId}/criteria`,
    /** 
     * `GET` - Tests for available instructors and returns them.
     */ 
    STATION_INSTRUCTORS: (stationId: string) => `/stations/${stationId}/instructors`,
    /** 
     * `GET` - Tests for available evaluators and returns them.
     */ 
    STATION_EVALUATORS: (stationId: string) => `/stations/${stationId}/evaluators`,


    /** 
     * `GET` - Returns a list of user IDs.
     */ 
    USER_LIST: `/users`,
    /** 
     * `GET` - Returns basic information about a user.
     * 
     * `PATCH` - Updates information about a user.
     */ 
    USER: (userId: string) => `/users/${userId}`,
    /** 
     * `GET` - Returns previous evaluations of a user.
     */ 
    USER_EVALUATION_HISTORY: (userId: string) => `/users/${userId}/history/evals`,
    /** 
     * `GET` - Returns previous evaluations made by a user.
     */ 
    USER_EVALUATOR_HISTORY: (userId: string) => `/users/${userId}/history/evaltor`,

    /** 
     * `GET` - Returns basic information about the current user.
     * 
     * `PATCH` - Updates information about the current user.
     */ 
    USER_ME: `/users/@me`,
    /** 
     * `GET` - Returns a list of station IDs available to the current user.
     */ 
    USER_ME_STATIONS: `/users/@me/stations`,
    /** 
     * `GET` - Returns a list of criteria IDs available to the current user.
     */ 
    USER_ME_CRITERIA: `/users/@me/criteria`,
    /** 
     * `GET` - Returns evaluation status.
     */ 
    USER_ME_STATUS: (criteriaId: string) => `/users/@me/status/${criteriaId}`,
};