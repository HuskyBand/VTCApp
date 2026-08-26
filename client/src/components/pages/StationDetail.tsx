import { NavLink, useParams } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import { useState, useEffect } from "react";
import { isMasteryLocked, scoreToStatus, type EvaluationStatus } from "@client/utils/evaluationHelpers";
import type { StationRole } from "@api/station/StationRole";

type StationCriterionState = {
    name: string,
    status: string
};

type StationEvaluation = {
    id?: number;
    stationId: number;
    evaluator?: string;
    score?: number;
    comments?: string;
    criteria?: StationCriterionState[];
    createdAt?: string;
};

const getStatusLabel = (status: string | null) => {
    switch (status) {
        case 'mastery': return 'Mastered';
        case 'proficient': return 'Proficient';
        case 'developing': return 'Developing';
        case 'novice': return 'Novice';
        case 'not_started': return 'Not Started';
        default: return 'Loading...';
    }
};

const getStatusValue = (status: string | null) => {
    switch (status) {
        case 'mastery': return 1;
        case 'proficient': return 1;
        case 'developing': return 2/3;
        case 'novice': return 1/3;
        case 'not_started': return 0;
        default: return 0;
    }
}

export default function StationDetail() {
    const { id } = useParams();
    const [evaluations, setEvaluations] = useState<StationEvaluation[] | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [queue, setQueue] = useState<Array<{ id: number; userId: number; name: string; position: number; requestedAt: string }>>([]);
    const [queueError, setQueueError] = useState('');
    const [queueMessage, setQueueMessage] = useState('');
    const [station, setStation] = useState<{ id: number; name: string; criteria: string[]; role: StationRole; instructorNotes?: string[] }>({ id: Number(id), name: `Loading...`, criteria: [], role: 'participant' });

    useEffect(() => {
        if (!id) return;

        const stationId = parseInt(id);

        UserManager.getStation(stationId).then((data) => {
            if (data) setStation(data);
        });

        if (UserManager.isLoggedIn) {
            UserManager.getEvaluationsForUser(UserManager.currentUser.id!).then((userEvaluations) => {
                const stationEvaluations = userEvaluations.filter((evaluation) => evaluation.stationId === stationId);
                setEvaluations(stationEvaluations);
            });

            UserManager.getStationQueue(stationId)
                .then((queueItems) => {
                    setQueue(queueItems);
                    setQueueError('');
                    if (!queueItems.some((entry) => entry.userId === UserManager.currentUser.id)) {
                        setQueueMessage('');
                    }
                })
                .catch(() => {
                    setQueueError('Failed to load queue status.');
                });
        }
    }, [id]);

    // Refresh evaluations periodically
    useEffect(() => {
        if (!id || !UserManager.isLoggedIn) return;

        const stationId = parseInt(id);
        const interval = setInterval(() => {
            UserManager.getEvaluationsForUser(UserManager.currentUser.id!).then((userEvaluations) => {
                const stationEvaluations = userEvaluations.filter((evaluation) => evaluation.stationId === stationId);
                setEvaluations(stationEvaluations);
            });

            UserManager.getStationQueue(stationId)
                .then((queueItems) => {
                    setQueue(queueItems);
                    setQueueError('');
                    if (!queueItems.some((entry) => entry.userId === UserManager.currentUser.id)) {
                        setQueueMessage('');
                    }
                })
                .catch(() => {
                    setQueueError('Failed to load queue status.');
                });
        }, 5000);

        return () => clearInterval(interval);
    }, [id]);

    const loadEvaluations = async () => {
        if (UserManager.isLoggedIn) {
            const userEvaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
            const stationEvaluations = userEvaluations.filter((evaluation) => evaluation.stationId === parseInt(id!));
            setEvaluations(stationEvaluations);
        }
    };

    const loadQueue = async () => {
        if (!id || !UserManager.isLoggedIn) {
            return;
        }

        try {
            const stationId = parseInt(id);
            const queueItems = await UserManager.getStationQueue(stationId);
            setQueue(queueItems);
            setQueueError('');
            if (!queueItems.some((entry) => entry.userId === UserManager.currentUser.id)) {
                setQueueMessage('');
            }
        } catch {
            setQueueError('Failed to load queue status.');
        }
    };

    const atMastery = evaluations && isMasteryLocked(evaluations, Number(id));

    const isInQueue = () => queue.some((entry) => entry.userId === UserManager.currentUser.id);
    const queuePosition = () => {
        const entry = queue.find((entry) => entry.userId === UserManager.currentUser.id);
        return entry?.position ?? null;
    };

    const joinQueue = async () => {
        if (!id) return;
        try {
            const stationId = parseInt(id);
            const result = await UserManager.joinStationQueue(stationId);
            if (result.success) {
                setQueueMessage(result.message ?? 'You have been added to the station queue.');
                setQueueError('');
                await loadQueue();
            } else {
                setQueueError(result.message ?? 'Could not join the queue.');
                setQueueMessage('');
            }
        } catch (err) {
            setQueueError(err instanceof Error ? err.message : 'Could not join the queue.');
            setQueueMessage('');
        }
    };

    const leaveQueue = async () => {
        if (!id) return;
        try {
            const stationId = parseInt(id);
            const result = await UserManager.leaveStationQueue(stationId);
            if (result.success) {
                setQueueMessage(result.message ?? 'You have been removed from the queue.');
                setQueueError('');
                await loadQueue();
            } else {
                setQueueError(result.message ?? 'Could not leave the queue.');
                setQueueMessage('');
            }
        } catch (err) {
            setQueueError(err instanceof Error ? err.message : 'Could not leave the queue.');
            setQueueMessage('');
        }
    };

    const getLatestScore = (): number => {
        if (!evaluations || evaluations.length === 0) return 0;
        return Math.min((evaluations[0].score ?? 0) / 75, 1); // evaluations[0] is the latest, sorted by date descending
    };

    const getLatestStatus = (): EvaluationStatus | null => {
        if (!evaluations) return null;
        if (evaluations.length === 0) return 'not_started';
        return scoreToStatus(evaluations[0].score); // evaluations[0] is the latest, sorted by date descending
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1 className="station-title">{station.name}</h1>
                    <div
                        key={station.id}
                        className={`station-row ${getLatestStatus()}`}
                    >
                        <progress className={`station-progress ${getLatestStatus() ?? 'not_started'}`} value={getLatestScore()}></progress>
                        <div className="station-info">
                            <div className={`station-status ${getLatestStatus() ?? 'not_started'}`}>
                                {getLatestStatus() === 'mastery' ?
                                    <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--mastery-color)">
                                        <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" fill="var(--mastery-color)" stroke="var(--mastery-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </svg> : (getLatestStatus() === 'proficient' ?
                                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--proficient-color)">
                                    <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="var(--proficient-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg> : <></>)}
                                {getStatusLabel(getLatestStatus())}
                            </div>
                            {evaluations && evaluations.length > 0 && evaluations[0].createdAt ? 
                            <div className="evaluation-date">
                                Last tested {new Date(evaluations[0].createdAt).toLocaleDateString()}
                            </div> : <></>}
                        </div>
                    </div>

                    {evaluations ? (<div className="queue-panel">
                        <div className="queue-actions">
                            {isInQueue() ? (
                                <div className="queue-participant-actions">
                                    <button className="button secondary" onClick={leaveQueue}>Leave Queue</button>
                                    <NavLink className="button primary icon get-evaluated-button" to="/get-evaluated">
                                        <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 12L15 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 3V6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M18 12L18 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 18L21 18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M18 21H21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M6 12H9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M6 6.01111L6.01 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 12.0111L12.01 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M3 12.0111L3.01 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 9.01111L12.01 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 15.0111L12.01 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M15 21.0111L15.01 21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 21.0111L12.01 21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M21 12.0111L21.01 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M21 15.0111L21.01 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M18 6.01111L18.01 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M9 3.6V8.4C9 8.73137 8.73137 9 8.4 9H3.6C3.26863 9 3 8.73137 3 8.4V3.6C3 3.26863 3.26863 3 3.6 3H8.4C8.73137 3 9 3.26863 9 3.6Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M21 3.6V8.4C21 8.73137 20.7314 9 20.4 9H15.6C15.2686 9 15 8.73137 15 8.4V3.6C15 3.26863 15.2686 3 15.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M6 18.0111L6.01 18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M9 15.6V20.4C9 20.7314 8.73137 21 8.4 21H3.6C3.26863 21 3 20.7314 3 20.4V15.6C3 15.2686 3.26863 15 3.6 15H8.4C8.73137 15 9 15.2686 9 15.6Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                        </svg>
                                    </NavLink>
                                </div>
                            ) : (station.role === 'evaluator' ? (
                                <NavLink className="button secondary" to={`/evaluate/station/${station.id}`}>Begin Evaluating</NavLink>
                            ) : (atMastery ? (
                                <p className="mastery-note">You've already reached mastery for this station.</p>
                            ) : (
                                <div className="queue-participant-actions">
                                    <button className="button primary" onClick={joinQueue}>Get Evaluated</button>
                                    <NavLink className="button primary icon get-evaluated-button" to="/get-evaluated">
                                        <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 12L15 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 3V6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M18 12L18 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 18L21 18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M18 21H21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M6 12H9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M6 6.01111L6.01 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 12.0111L12.01 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M3 12.0111L3.01 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 9.01111L12.01 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 15.0111L12.01 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M15 21.0111L15.01 21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M12 21.0111L12.01 21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M21 12.0111L21.01 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M21 15.0111L21.01 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M18 6.01111L18.01 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M9 3.6V8.4C9 8.73137 8.73137 9 8.4 9H3.6C3.26863 9 3 8.73137 3 8.4V3.6C3 3.26863 3.26863 3 3.6 3H8.4C8.73137 3 9 3.26863 9 3.6Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M21 3.6V8.4C21 8.73137 20.7314 9 20.4 9H15.6C15.2686 9 15 8.73137 15 8.4V3.6C15 3.26863 15.2686 3 15.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M6 18.0111L6.01 18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M9 15.6V20.4C9 20.7314 8.73137 21 8.4 21H3.6C3.26863 21 3 20.7314 3 20.4V15.6C3 15.2686 3.26863 15 3.6 15H8.4C8.73137 15 9 15.2686 9 15.6Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                        </svg>
                                    </NavLink>
                                </div>
                            )))}
                        </div>
                        <div className="queue-status">
                            {isInQueue() && (
                                <p>{
                                    queuePosition() != 2 ? (
                                        queuePosition() != 1 ? 
                                            `There are ${(queuePosition() ?? 1) - 1} people ahead of you for evaluation.` :
                                            'You are first in line for evaluation.'
                                    ) : 'There is 1 person ahead of you for evaluation.'
                                    
                                }</p>
                            )}
                        </div>
                        {queueError && <div className="error-message">{queueError}</div>}
                        {queueMessage && <div className="success-message">{queueMessage}</div>}
                    </div>) : (
                        <></>
                    )}

                    {station.criteria.length > 0 ? (
                        <div className="criteria-summary">
                            <div className="evaluation-criteria-list">

                                {evaluations && evaluations.length > 0 && evaluations[0].criteria ? (
                                    evaluations[0].criteria.length > 0 ? (
                                    <ul>
                                        {evaluations[0].criteria.map((state: StationCriterionState, index: number) => (
                                            <li key={index}>
                                                <div
                                                    key={state.name}
                                                    className={`station-row ${state.status}`}
                                                >
                                                    <div className="station-info">
                                                        <div className="station-name">
                                                            {state.name}
                                                        </div>
                                                        <div className={`station-status ${state.status}`}>
                                                            {state.status === 'mastery' ?
                                                                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--mastery-color)">
                                                                    <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" fill="var(--mastery-color)" stroke="var(--mastery-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                </svg> : (state.status === 'proficient' ?
                                                            <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--proficient-color)"><path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="var(--proficient-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                                            </svg> : <></>)}
                                                            {getStatusLabel(state.status)}
                                                        </div>
                                                    </div>
                                                    <progress className={`station-progress ${state.status}`} value={getStatusValue(state.status)}></progress>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                            ) : (
                                <span className="evaluation-score">Score: {evaluations[0].score}%</span>
                            )) : (
                                <ul>
                                    {station.criteria.map((name: string, index: number) => (
                                        <li key={index}>
                                            <div
                                                key={station.id}
                                                className="station-row not_started"
                                            >
                                                <div className="station-info">
                                                    <div className="station-name">
                                                        {evaluations ? name : 'Loading...'}
                                                    </div>
                                                    <div className={`station-status not_started`}>
                                                        {getStatusLabel(evaluations ? 'not_started' : null)}
                                                    </div>
                                                </div>
                                                <progress className={`station-progress ${evaluations ? 'not_started' : null}`}
                                                    value={getStatusValue(evaluations ? 'not_started' : null)}></progress>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            </div>
                        </div>
                    ) : <></>}

                    {/*station.role !== 'participant' && station.instructorNotes && station.instructorNotes.length > 0 && (
                        <div className="instructor-notes-summary">
                            <h3>Instructor Notes</h3>
                            <ul>
                                {station.instructorNotes.map((note) => (
                                    <li key={note}>{note}</li>
                                ))}
                            </ul>
                        </div>
                    )*/}

                    {!showHistory ? (
                        <div className="evaluated-view">
                            {evaluations ? (evaluations.length > 0 ? (
                                <div className="latest-evaluation">
                                    <div className="evaluation-header-section">
                                        <h3>Latest Evaluation</h3>
                                        <button
                                            className="refresh-btn"
                                            onClick={loadEvaluations}
                                            title="Refresh evaluations"
                                        >
                                            ↻ Refresh
                                        </button>
                                    </div>
                                    <div className="evaluation-item latest">
                                        <div className="evaluation-header">
                                        </div>
                                        {evaluations[0].criteria && evaluations[0].criteria.length > 0 ? (
                                            <div className="evaluation-criteria-list">
                                                <ul>
                                                    {evaluations[0].criteria.map((state: StationCriterionState, index: number) => (
                                                        <li key={index}>
                                                            <div
                                                                key={station.id}
                                                                className={`station-row ${getLatestStatus()}`}
                                                            >
                                                                <div className="station-info">
                                                                    <div className="station-name">
                                                                        {state.name}
                                                                    </div>
                                                                    <div className={`station-status ${state.status}`}>
                                                                        {state.status === 'mastery' ?
                                                                            <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--mastery-color)">
                                                                                <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" fill="var(--mastery-color)" stroke="var(--mastery-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                            </svg> : (state.status === 'proficient' ?
                                                                        <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--proficient-color)"><path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="var(--proficient-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                        </svg> : <></>)}
                                                                        {getStatusLabel(state.status)}
                                                                    </div>
                                                                </div>
                                                                <progress className={`station-progress ${state.status}`} value={getStatusValue(state.status)}></progress>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <span className="evaluation-score">Score: {evaluations[0].score}%</span>
                                        )}
                                        {evaluations[0].comments && (
                                            <div className="evaluation-comments">
                                                <h4>Evaluator Comments</h4>
                                                {evaluations[0].comments}
                                            </div>
                                        )}
                                    </div>
                                    {evaluations.length > 1 && (
                                        <button
                                            className="history-btn"
                                            onClick={() => setShowHistory(true)}
                                        >
                                            View Full History ({evaluations.length} evaluations)
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="no-evaluations">
                                    <p>No evaluation history yet for this station.</p>
                                </div>
                            )) : 
                                <div className="no-evaluations">
                                    <p>Loading...</p>
                                </div>}
                        </div>
                    ) : (
                        evaluations && evaluations.length > 0 && (
                            <div className="evaluation-history">
                                <div className="history-header">
                                    <h3>Evaluation History</h3>
                                    <button
                                        className="back-btn"
                                        onClick={() => setShowHistory(false)}
                                    >
                                        ← Back to Latest
                                    </button>
                                </div>
                                {evaluations.map((evaluation) => (
                                    <div key={evaluation.id} className="evaluation-item">
                                        <div className="evaluation-header">
                                            <span className="evaluation-date">
                                                {evaluation.createdAt ? new Date(evaluation.createdAt).toLocaleDateString() : 'Unknown date'}
                                            </span>
                                        </div>
                                        {evaluation.criteria && evaluation.criteria.length > 0 ? (
                                            <div className="evaluation-criteria-list">
                                                <ul>
                                                    {evaluation.criteria.map((state: StationCriterionState, index: number) => (
                                                        <li key={index}>
                                                            <div
                                                                key={station.id}
                                                                className={`station-row ${getLatestStatus()}`}
                                                            >
                                                                <div className="station-info">
                                                                    <div className="station-name">
                                                                        {state.name}
                                                                    </div>
                                                                    <div className={`station-status ${state.status}`}>
                                                                        {state.status === 'mastery' ?
                                                                            <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--mastery-color)">
                                                                                <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" fill="var(--mastery-color)" stroke="var(--mastery-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                            </svg> : (state.status === 'proficient' ?
                                                                        <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--proficient-color)"><path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="var(--proficient-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                                                        </svg> : <></>)}
                                                                        {getStatusLabel(state.status)}
                                                                    </div>
                                                                </div>
                                                                <progress className={`station-progress ${state.status}`} value={getStatusValue(state.status)}></progress>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <span className="evaluation-score">Score: {evaluation.score}%</span>
                                        )}
                                        {evaluation.comments && (
                                            <div className="evaluation-comments">
                                                {evaluation.comments}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                </div>
            </section>
            <BottomNav />
        </>
    );
}