import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import { QRCodeSVG } from "qrcode.react";
import { Navigate } from "react-router";

export default function GetEvaluated() {
    if (!UserManager.isLoggedIn) {
        return <Navigate to="/" replace />;
    }

    const user = UserManager.currentUser;
    const qrValue = String(user.id);

    return (
        <>
            <section id="center">
                <div>
                    <h1>QR Code</h1>
                    <p>Show this QR code to your evaluator:</p>
                    <div className="qr-container">
                        <div className="qr-code-box">
                            <QRCodeSVG value={qrValue} size={220} level="M" />
                        </div>
                        <div className="qr-name">{user.firstName}</div>
                        <div className="qr-name">{user.lastName}</div>
                        <div className="qr-instrument">{user.instrument}</div>
                    </div>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .qr-container { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem; margin-top: 1rem; }
                .qr-name { font-size: 1.4rem; }
                .qr-instrument { font-size: 1.0rem; }
                .qr-code-box { padding: 1rem; background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); margin-bottom: 1rem; }
                .qr-hint { margin-top: 0.5rem; color: #999; font-size: 0.85rem; }
            `}</style>
        </>
    );
}
