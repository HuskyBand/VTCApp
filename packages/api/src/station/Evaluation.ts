import type { User } from "@api/user/User"
import type { CriterionId } from "./Criteria";

export const EvaluationLevel = {
    /** Has not been evaluated yet. */
    None: 0,
    /** Highest level. */
    Exemplary: 1,
    /** Passing level. */
    Satisfactory: 2,
    /** Non-passing level. */
    Developing: 3
} as const;

export type EvaluationLevel = typeof EvaluationLevel[keyof typeof EvaluationLevel];

export type CriterionEvaluation = {
    id: CriterionId,
    status: EvaluationLevel,
    issues: string[]
}

export type EvaluationResponse = {
    evaluator: User,
    evaluatee: User,
    timestamp: number,
    criteria: CriterionEvaluation[]
}

export function summarizeEvaluation(response: EvaluationResponse | null): EvaluationLevel {
    let level: EvaluationLevel = EvaluationLevel.None;

    response?.criteria.forEach(e => {
        if (e.status > level) {
            // In case anything gets out of bounds...
            if (e.status > EvaluationLevel.Developing) {
                e.status = EvaluationLevel.Developing;
            }

            level = e.status;
        }
    });

    return level;
}