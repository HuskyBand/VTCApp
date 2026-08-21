
import type { StationListResponse, CriteriaListResponse, StationId } from '@api/station/Station';
import type { CriterionSummary } from '@api/station/Criteria';
import { summarizeEvaluation, type EvaluationLevel, type EvaluationResponse } from '@api/station/Evaluation';
import { Endpoints } from '@client/Endpoints';
import http from '@client/http/HttpClient';
import UserManager from './UserManager';

type UserStationData = {
    /** Station ID. */
    id: StationId,
    /** Station criteria. */
    criteria: CriterionSummary[],
    /** Latest evaluation. */
    evaluation: EvaluationResponse | null,
    /** Overall station status. */
    status: EvaluationLevel
}

class StationManager {
    private _stations: UserStationData[] | null;

    constructor() {
        if (!UserManager.isLoggedIn) {
            this._stations = null;
            return;
        }

        this._stations = [];
    }

    private async loadStation(id: StationId): Promise<UserStationData | null> {
        const criteriaListResponse = await http.get<CriteriaListResponse>(Endpoints.STATION_CRITERIA_LIST(id));

        if (!criteriaListResponse.ok) {
            return null;
        }

        const evaluationResponse = await http.get<EvaluationResponse>(Endpoints.STATION_EVALUATION_LATEST(id));

        const evaluation = evaluationResponse.ok ? evaluationResponse.body : null;

        return {
            id,
            evaluation,
            status: summarizeEvaluation(evaluation),
            criteria: criteriaListResponse.body.criteria
        };
    }

    async loadStatus(): Promise<boolean> {
        if (!this._stations) {
            return false;
        }

        const stationListResponse = await http.get<StationListResponse>(Endpoints.STATION_LIST);

        if (!stationListResponse.ok) {
            return false;
        }

        // Stations are automatically storted by order; no need to sort.
        const stationData: UserStationData[] = [];
        stationData.length = stationListResponse.body.stations.length;

        for (let i = 0; i < stationData.length; ++i) {
            const station = await this.loadStation(stationListResponse.body.stations[i].id);

            if (!station) {
                return false;
            }

            stationData[i] = station;
        }

        // In case this gets called multiple times...
        await navigator.locks.request("station_manager_lock",
            { mode: "exclusive" },
            () => {
                this._stations = stationData;
        });

        return true;
    }
}

export default new StationManager();