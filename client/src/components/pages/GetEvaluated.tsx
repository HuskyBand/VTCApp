import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import { QRCodeSVG } from "qrcode.react";

export default function GetEvaluated() {
    const user = UserManager.isLoggedIn ? UserManager.currentUser : null;
    const qrValue = user?.id ? String(user.id) : '';

    return (
        <>
            <section id="center">
                <div>
                    <h1>Get Evaluated</h1>
                    <p>Show this QR code to your evaluator so they can pull up your record instantly.</p>
                    {user ? (
                        <div className="qr-container">
                            <div className="qr-name">
                                {user.firstName} {user.lastName}
                            </div>
                            <div className="qr-instrument">{user.instrument}</div>
                            <div className="qr-code-box">
                                <QRCodeSVG value={qrValue} size={220} level="M" />
                            </div>
                            <div className="qr-hint">Student ID: {user.id}</div>
                        </div>
                    ) : (
                        <p>Please log in to generate your QR code.</p>
                    )}
                </div>
            </section>
            <BottomNav />
            <style>{`
                .qr-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 1.5rem;
                    margin-top: 1rem;
                }
                .qr-name {
                    font-size: 1.4rem;
                    font-weight: 700;
                }
                .qr-instrument {
                    color: #666;
                    margin-bottom: 0.5rem;
                }
                .qr-code-box {
                    padding: 1rem;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
                }
                .qr-hint {
                    margin-top: 0.5rem;
                    color: #999;
                    font-size: 0.85rem;
                }
            `}</style>
        </>
    );
}
