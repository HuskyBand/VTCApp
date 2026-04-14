import type { CriterionSummary } from "./Criteria";

export type StationId = string;

export type StationSummary = {
    id: StationId,
    order: number
}

export type StationListResponse = {
    stations: StationSummary[]
}

export type CriteriaListResponse = {
    criteria: CriterionSummary[]
}