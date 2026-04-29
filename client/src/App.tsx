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
import EditVTC from "./components/pages/EditVTC";
import ProtectedRoute from "./components/ProtectedRoute";
import EvaluateSelectStation from "./components/pages/EvaluateSelectStation";
import EvaluationForm from "./components/pages/EvaluationForm";
import StationManagement from "./components/pages/StationManagement";
import DirectorOverview from "./components/pages/DirectorOverview";

function App() {
  return (
    <>
			<Routes>
				<Route index element={<IndexPage />} />
				<Route path="/logout" element={<LogoutPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="/profile-setup" element={<ProfileSetupPage />} />
				<Route path="/profile" element={<ProfileSettingsPage />} />
				<Route path="/permissions" element={
					<ProtectedRoute requiredPermission={(pm) => pm.canViewAdmin()}>
						<PermissionManagementPage />
					</ProtectedRoute>
				} />
				<Route path="/station/:id" element={<StationDetail />} />
				<Route path="/evaluate" element={<EvaluateSelectStation />} />
				<Route path="/admin/overview" element={
					<ProtectedRoute requiredPermission={(pm) => pm.canViewAdmin()}>
						<DirectorOverview />
					</ProtectedRoute>
				} />
				<Route path="/admin/stations" element={
					<ProtectedRoute requiredPermission={(pm) => pm.canViewAdmin()}>
						<StationManagement />
					</ProtectedRoute>
				} />
				<Route path="/evaluate/station/:stationId" element={<EvaluationForm />} />
				<Route path="/station/:id/evaluate" element={<StationEvaluationBegin />} />
				<Route path="/station/:id/starred" element={<StationEvaluationStarred />} />
				<Route path="/criteria-detail" element={<CriteriaDetail />} />
				<Route path="/station/:id/search" element={<StationEvaluationSearch />} />
				<Route path="/evaluate-alt" element={<EvaluateAlt />} />
				<Route path="/evaluate-alt-expanded" element={<EvaluateAltExpanded />} />
				<Route path="/admin/edit-vtc" element={
					<ProtectedRoute requiredPermission={(pm) => pm.canViewAdmin()}>
						<EditVTC />
					</ProtectedRoute>
				} />
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
    </>
  )
}

export default App;
