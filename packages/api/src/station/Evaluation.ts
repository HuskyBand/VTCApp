import type { User } from "@api/user/User"
import type { CriterionId } from "./Criteria";

export enum EvaluationLevel {
    None = 0,
    Exemplary = 1,
    Satisfactory = 2,
    Developing = 3
}

export type CriterionEvaluation = {
    id: CriterionId,
    status: EvaluationLevel,
    issues: string[]
}

export type EvaluationResponse = {
    evaluator: User,
    evaluatee: User,
    timestamp: EpochTimeStamp,
    criteria: CriterionEvaluation[]
}

export function summarizeEvaluation(response: EvaluationResponse | null): EvaluationLevel {
    let level = EvaluationLevel.None;

    response?.criteria.forEach(e => {
        if (e.status > level) {
            level = e.status;
        }
    });

    return level;
}