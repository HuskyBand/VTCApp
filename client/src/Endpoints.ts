export const Endpoints = {
    /**
     * `POST` - Check if the server is alive.
     */
    HEALTH_CHECK: '/_health',

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
     * `POST` - Begins an evaluation at a station.
     */ 
    EVALUATION_LIST: `/evals`,
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
     * `GET` - Returns a list of criteria summaries.
     * 
     * `POST` - Creates a new criteria.
     */ 
    STATION_CRITERIA_LIST: (stationId: string) => `/stations/${stationId}/criteria`,
    /**
     * `GET` - Returns basic information about a station criteria.
     * 
     * `PATCH` - Updates the summary rubric for a criteria.
     * 
     * `DELETE` - Deletes a criteria.
     */ 
    STATION_CRITERION_SUMMARY: (stationId: string, criterionId: string) => `/stations/${stationId}/criteria/${criterionId}`,
    /** 
     * `GET` - Returns the full rubric for a criteria.
     * 
     * `PATCH` - Updates the full rubric for a criteria.
     */ 
    STATION_CRITERION_RUBRIC: (stationId: string, criterionId: string) => `/stations/${stationId}/criteria/${criterionId}/rubric`,
    /**
     * `GET` - Returns a list of evaluations.
     * 
     * `POST` - Creates a new evaluation.
     */ 
    STATION_EVALUATION_LIST: (stationId: string) => `/stations/${stationId}/evaluations`,
    /**
     * `GET` - Returns the most recent evaluation for a user.
     */ 
    STATION_EVALUATION_LATEST: (stationId: string, userId: string = "@me") => `/stations/${stationId}/evaluations/${userId}`,

    /** 
     * `GET` - Tests for available instructors and returns them.
     */ 
    STATION_INSTRUCTOR_LIST: (stationId: string) => `/stations/${stationId}/instructors`,
    /** 
     * `GET` - Tests for available evaluators and returns them.
     */ 
    STATION_EVALUATOR_LIST: (stationId: string) => `/stations/${stationId}/evaluators`,


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
     * `GET` - Returns evaluation status for a station.
     */ 
    USER_ME_STATION: (stationId: string) => `/users/@me/station/${stationId}`,
};