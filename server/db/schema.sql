
-- USERS TABLE
CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL CHECK (role IN ('student', 'evaluator', 'admin')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EVALUATIONS TABLE
CREATE TABLE evaluations (
    evaluation_id   SERIAL PRIMARY KEY,
    student_id      INT NOT NULL,
    evaluator_id    INT NOT NULL,
    title           VARCHAR(255),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student
        FOREIGN KEY (student_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluator
        FOREIGN KEY (evaluator_id) REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- EVALUATION CATEGORIES / CRITERIA
CREATE TABLE evaluation_criteria (
    criteria_id     SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    max_score       INT DEFAULT 5,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EVALUATION SCORES
CREATE TABLE evaluation_scores (
    score_id        SERIAL PRIMARY KEY,
    evaluation_id   INT NOT NULL,
    criteria_id     INT NOT NULL,
    score           INT NOT NULL CHECK (score >= 0),
    comment         TEXT,

    CONSTRAINT fk_evaluation
        FOREIGN KEY (evaluation_id) REFERENCES evaluations(evaluation_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_criteria
        FOREIGN KEY (criteria_id) REFERENCES evaluation_criteria(criteria_id)
        ON DELETE RESTRICT
);