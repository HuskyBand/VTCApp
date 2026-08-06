import { useNavigate, useSearchParams } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import PermissionManager from "@client/stores/PermissionManager";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    canEvaluateStation,
    canTeachStation,
    type EvaluationRecord,
} from "@client/utils/evaluationHelpers";
import jsQR from "jsqr";

type Station = {
    id: number;
    name: string;
};

export default function EvaluateSelectStation() {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const [selectedStation, setSelectedStation] = useState<number | null>(null);
    const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [queue, setQueue] = useState<Array<{ id: number; name: string; userId: number; position: number; requestedAt: string }>>([]);
    const [queueError, setQueueError] = useState('');
    const [queueMessage, setQueueMessage] = useState('');
    const [error, setError] = useState('');

    // QR scanner state
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scannedUser, setScannedUser] = useState<{ id: number; name: string } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!UserManager.isLoggedIn) return;
            try {
                const result = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
                setEvaluations(result);
                const stationList = await UserManager.getStations();
                if (stationList === null) {
                    setError('Unable to load stations. Check your connection and try again.');
                    return;
                }
                setStations(stationList);
            } catch {
                setError('Unable to load your station progress.');
            }
        };
        load();
    }, []);

    // Auto-select the station we were just redirected from after submitting an evaluation.
    useEffect(() => {
        if (selectedStation || stations.length === 0) return;
        const redirectStationId = Number(searchParams.get('stationId'));
        if (!redirectStationId) return;
        const allIds = sortedStationIds();
        const canEvaluate = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canEvaluateStation(evaluations, redirectStationId, allIds);
        const canTeach = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canTeachStation(evaluations, redirectStationId, allIds);
        if ((canEvaluate || canTeach) && stations.some((s) => s.id === redirectStationId)) {
            setSelectedStation(redirectStationId);
        }
    }, [stations, evaluations, searchParams]);

    useEffect(() => {
        const loadQueue = async () => {
            if (!selectedStation || !UserManager.isLoggedIn) {
                setQueue([]);
                return;
            }
            try {
                const queueItems = await UserManager.getStationQueue(selectedStation);
                setQueue(queueItems);
                setQueueError('');
            } catch {
                setQueue([]);
                setQueueError('Unable to load the station queue.');
            }
        };
        loadQueue();
        const interval = setInterval(loadQueue, 5000);
        return () => clearInterval(interval);
    }, [selectedStation]);

    // Clean up camera on unmount
    useEffect(() => {
        return () => stopScanner();
    }, []);

    const stopScanner = () => {
        if (scanIntervalRef.current !== null) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    };

    const startScanner = useCallback(async () => {
        setScanError('');
        setScannedUser(null);
        setScannerOpen(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            scanIntervalRef.current = window.setInterval(() => {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    const userId = parseInt(code.data);
                    if (!isNaN(userId) && userId > 0) {
                        stopScanner();
                        setScannerOpen(false);
                        handleScannedUserId(userId);
                    }
                }
            }, 200);
        } catch {
            setScanError('Camera access denied or unavailable.');
            setScannerOpen(false);
        }
    }, []);

    const handleScannedUserId = async (userId: number) => {
        try {
            const users = await UserManager.getAllUsers();
            const found = users.find((u) => u.id === userId);
            if (found) {
                setScannedUser({ id: found.id!, name: `${found.firstName} ${found.lastName}` });
            } else {
                setScanError(`No student found with ID ${userId}.`);
            }
        } catch {
            setScanError('Failed to look up scanned student.');
        }
    };

    const sortedStationIds = () => [...stations].sort((a, b) => a.id - b.id).map((s) => s.id);

    const handleSelect = () => {
        if (!selectedStation) return;
        const allIds = sortedStationIds();
        const canEvaluate = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canEvaluateStation(evaluations, selectedStation, allIds);
        const canTeach = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canTeachStation(evaluations, selectedStation, allIds);
        if (!canEvaluate && !canTeach) {
            setError('You are not yet eligible to evaluate this station. Reach mastery and pass the next station first.');
            return;
        }
        nav(`/evaluate/station/${selectedStation}`);
    };

    const handleTakeNext = async () => {
        if (!selectedStation) return;
        try {
            const result = await UserManager.takeNextStationQueue(selectedStation);
            if (result.success && result.removedEntry) {
                nav(`/evaluate/station/${selectedStation}?studentId=${result.removedEntry.userId}`);
                return;
            }
            setQueueError(result.message ?? 'Unable to pull next student from the queue.');
            setQueueMessage('');
        } catch (err) {
            setQueueError(err instanceof Error ? err.message : 'Unable to pull next student from the queue.');
            setQueueMessage('');
        }
    };

    const handleEvaluateScanned = () => {
        if (!scannedUser || !selectedStation) return;
        const allIds = sortedStationIds();
        const canEvaluate = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canEvaluateStation(evaluations, selectedStation, allIds);
        const canTeach = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canTeachStation(evaluations, selectedStation, allIds);
        if (!canEvaluate && !canTeach) {
            setScanError('You are not eligible to evaluate this station. Reach mastery and pass the next station first.');
            return;
        }
        nav(`/evaluate/station/${selectedStation}?studentId=${scannedUser.id}`);
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Select Station</h1>
                    <h2>Choose the station you want to evaluate</h2>
                    {error && <div className="error-message">{error}</div>}

                    <div className="stations-select-list">
                        {stations.length === 0 && (
                            <p className="no-stations-message">No stations available yet.</p>
                        )}
                        {stations.map((station) => {
                            const allIds = sortedStationIds();
                            const canEvaluate = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canEvaluateStation(evaluations, station.id, allIds);
                            const canTeach = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canTeachStation(evaluations, station.id, allIds);
                            return (
                                <div
                                    key={station.id}
                                    className={`station-select-row ${selectedStation === station.id ? 'selected' : ''} ${canEvaluate || canTeach ? '' : 'disabled'}`}
                                    onClick={() => { if (canEvaluate || canTeach) setSelectedStation(station.id); }}
                                >
                                    <input
                                        type="radio"
                                        name="station"
                                        value={station.id}
                                        checked={selectedStation === station.id}
                                        onChange={() => { if (canEvaluate || canTeach) setSelectedStation(station.id); }}
                                        disabled={!canEvaluate && !canTeach}
                                    />
                                    <label>{station.name}</label>
                                </div>
                            );
                        })}
                    </div>

                    {selectedStation && (
                        <>
                            <div className="queue-panel">
                                <h3>Queue for Station {selectedStation}</h3>
                                {queueError && <div className="error-message">{queueError}</div>}
                                {queueMessage && <div className="success-message">{queueMessage}</div>}
                                <p>{queue.length ? `${queue.length} student(s) waiting.` : 'No one is waiting in the queue yet.'}</p>
                                {queue.length > 0 && (
                                    <ol>
                                        {queue.map((entry) => (
                                            <li key={entry.id}>{entry.name} {entry.position === 1 ? '(next)' : ''}</li>
                                        ))}
                                    </ol>
                                )}
                                <button
                                    className="btn submit-btn"
                                    onClick={handleTakeNext}
                                    disabled={!queue.length}
                                >
                                    Pull Next Student
                                </button>
                            </div>

                            {/* QR Scanner — only shown after a station is selected */}
                            <div className="qr-scan-panel">
                                <h3>Scan Student QR Code</h3>
                                <p>Scan a student's QR code to evaluate them for Station {selectedStation}.</p>
                                {scanError && <div className="error-message">{scanError}</div>}
                                {scannedUser && (
                                    <div className="scanned-student">
                                        <strong>Scanned:</strong> {scannedUser.name}
                                        <button className="button primary" onClick={handleEvaluateScanned} style={{ marginLeft: '1rem' }}>
                                            Evaluate Now
                                        </button>
                                    </div>
                                )}
                                {!scannerOpen ? (
                                    <button className="button secondary" onClick={startScanner}>
                                        📷 Open QR Scanner
                                    </button>
                                ) : (
                                    <div className="scanner-container">
                                        <video ref={videoRef} className="scanner-video" playsInline muted />
                                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                                        <button className="button secondary" onClick={() => { stopScanner(); setScannerOpen(false); }}>
                                            Close Scanner
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <button
                        className="btn submit-btn"
                        onClick={handleSelect}
                        disabled={!selectedStation}
                    >
                        Continue (Manual)
                    </button>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .qr-scan-panel {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                    background: #f9f9f9;
                }
                .qr-scan-panel h3 { margin-bottom: 0.5rem; }
                .scanner-container {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-top: 0.75rem;
                }
                .scanner-video {
                    width: 100%;
                    max-width: 360px;
                    border-radius: 10px;
                    border: 2px solid #60a5fa;
                }
                .scanned-student {
                    margin: 0.75rem 0;
                    padding: 0.75rem 1rem;
                    background: #f0fdf4;
                    border: 1px solid #22c55e;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
            `}</style>
        </>
    );
}
