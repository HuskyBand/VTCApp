import {
    Routes,
    Route,
} from "react-router";

import IndexPage from "./components/pages/IndexPage";
import LogoutPage from "./components/pages/LogoutPage";
import RegisterPage from "./components/pages/RegisterPage";
import LoginPage from "./components/pages/LoginPage";
import ProfileSetupPage from "./components/pages/ProfileSetupPage";
import ProfileSettingsPage from "./components/pages/ProfileSettingsPage";
import PermissionManagementPage from "./components/pages/PermissionManagementPage";
import NotFoundPage from "./components/pages/NotFoundPage";
import StationDetail from "./components/pages/StationDetail";
import StationEvaluationBegin from "./components/pages/StationEvaluationBegin";
import StationEvaluationStarred from "./components/pages/StationEvaluationStarred";
import CriteriaDetail from "./components/pages/CriteriaDetail";
import StationEvaluationSearch from "./components/pages/StationEvaluationSearch";
import EvaluateAlt from "./components/pages/EvaluateAlt";
import EvaluateAltExpanded from "./components/pages/EvaluateAltExpanded";
import GetEvaluated from "./components/pages/GetEvaluated";
import StationFeedbackView from "./components/pages/StationFeedbackView";
import EditVTC from "./components/pages/EditVTC";
import ProtectedRoute from "./components/ProtectedRoute";
import UserManager from "./stores/UserManager";
import EvaluateSelectStation from "./components/pages/EvaluateSelectStation";
import EvaluationForm from "./components/pages/EvaluationForm";
import StationManagement from "./components/pages/StationManagement";
import DirectorOverview from "./components/pages/DirectorOverview";
import RequireAuth from "./components/RequireAuth";
import BroadcastPopup from "./components/BroadcastPopup";

function App() {
  return (
    <>
			<BroadcastPopup />
			<Routes>
				<Route index element={<IndexPage />} />
				<Route path="/logout" element={<LogoutPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="/profile-setup" element={<ProfileSetupPage />} />
				<Route path="/profile" element={<RequireAuth><ProfileSettingsPage /></RequireAuth>} />
				<Route path="/permissions" element={
					<RequireAuth>
						<ProtectedRoute requiredPermission={() => UserManager.isDirector}>
							<PermissionManagementPage />
						</ProtectedRoute>
					</RequireAuth>
				} />
				<Route path="/station/:id" element={<RequireAuth><StationDetail /></RequireAuth>} />
				<Route path="/evaluate" element={<RequireAuth><EvaluateSelectStation /></RequireAuth>} />
				<Route path="/get-evaluated" element={<RequireAuth><GetEvaluated /></RequireAuth>} />
				<Route path="/station-reference" element={<RequireAuth><StationFeedbackView /></RequireAuth>} />
				<Route path="/admin/overview" element={
					<RequireAuth>
						<ProtectedRoute requiredPermission={() => UserManager.isDirector}>
							<DirectorOverview />
						</ProtectedRoute>
					</RequireAuth>
				} />
				<Route path="/admin/stations" element={
					<RequireAuth>
						<ProtectedRoute requiredPermission={() => UserManager.isDirector}>
							<StationManagement />
						</ProtectedRoute>
					</RequireAuth>
				} />
				<Route path="/evaluate/station/:stationId" element={<RequireAuth><EvaluationForm /></RequireAuth>} />
				<Route path="/station/:id/evaluate" element={<RequireAuth><StationEvaluationBegin /></RequireAuth>} />
				<Route path="/station/:id/starred" element={<RequireAuth><StationEvaluationStarred /></RequireAuth>} />
				<Route path="/criteria-detail" element={<RequireAuth><CriteriaDetail /></RequireAuth>} />
				<Route path="/station/:id/search" element={<RequireAuth><StationEvaluationSearch /></RequireAuth>} />
				<Route path="/evaluate-alt" element={<RequireAuth><EvaluateAlt /></RequireAuth>} />
				<Route path="/evaluate-alt-expanded" element={<RequireAuth><EvaluateAltExpanded /></RequireAuth>} />
				<Route path="/admin/edit-vtc" element={
					<RequireAuth>
						<ProtectedRoute requiredPermission={() => UserManager.isDirector}>
							<EditVTC />
						</ProtectedRoute>
					</RequireAuth>
				} />
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
    </>
  )
}

export default App;
