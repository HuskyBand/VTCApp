import { useEffect, useState, useRef } from "react";
import UserManager from "@client/stores/UserManager";

const LAST_SEEN_KEY = 'last_seen_broadcast_id';
const DISMISS_COOLDOWN_MS = 3000;

export default function BroadcastPopup() {
    const [broadcast, setBroadcast] = useState<{ id: number; title: string; message: string; senderName: string } | null>(null);
    const [canDismiss, setCanDismiss] = useState(false);
    const hasStoredLastSeen = localStorage.getItem(LAST_SEEN_KEY) !== null;
    const lastSeenId = useRef<number>(Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0));
    const hasBaselined = useRef<boolean>(hasStoredLastSeen);

    useEffect(() => {
        const check = async () => {
            if (!UserManager.isLoggedIn || UserManager.isDirector) return;
            const notifications = await UserManager.getNotifications();
            const latestBroadcast = notifications.find((n) => n.category === 'broadcast');

            if (!hasBaselined.current) {
                hasBaselined.current = true;
                if (latestBroadcast) {
                    lastSeenId.current = latestBroadcast.id;
                    localStorage.setItem(LAST_SEEN_KEY, String(latestBroadcast.id));
                }
                return;
            }

            if (latestBroadcast && latestBroadcast.id > lastSeenId.current) {
                setBroadcast(latestBroadcast);
            }
        };
        check();
        const interval = setInterval(check, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!broadcast) {
            setCanDismiss(false);
            return;
        }
        const timer = setTimeout(() => setCanDismiss(true), DISMISS_COOLDOWN_MS);
        return () => clearTimeout(timer);
    }, [broadcast]);

    const dismiss = () => {
        if (!canDismiss || !broadcast) return;
        lastSeenId.current = broadcast.id;
        localStorage.setItem(LAST_SEEN_KEY, String(broadcast.id));
        setBroadcast(null);
    };

    if (!broadcast) return null;

    return (
        <div className="broadcast-overlay">
            <div className="broadcast-modal">
                <div className="broadcast-badge">📢 Director Broadcast</div>
                <h3>{broadcast.title}</h3>
                <p>{broadcast.message}</p>
                <div className="broadcast-meta">From {broadcast.senderName}</div>
                <button className="button primary" onClick={dismiss} disabled={!canDismiss}>
                    {canDismiss ? 'Got it' : 'Got it (please read)'}
                </button>
            </div>
            <style>{`
                .broadcast-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .broadcast-modal {
                    background: white;
                    border-radius: 16px;
                    padding: 1.5rem;
                    max-width: 420px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                }
                .broadcast-badge {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #1d4ed8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.5rem;
                }
                .broadcast-modal h3 { margin: 0 0 0.5rem; }
                .broadcast-modal p { white-space: pre-line; margin: 0 0 0.75rem; }
                .broadcast-meta { font-size: 0.8rem; color: #6b7280; margin-bottom: 1rem; }
                .broadcast-modal button:disabled { opacity: 0.6; cursor: not-allowed; }
            `}</style>
        </div>
    );
}
