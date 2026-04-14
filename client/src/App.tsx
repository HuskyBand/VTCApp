import {
    Routes,
    Route,
} from "react-router";

import IndexPage from "./components/pages/IndexPage";
import LogoutPage from "./components/pages/LogoutPage";
import RegisterPage from "./components/pages/RegisterPage";
import LoginPage from "./components/pages/LoginPage";
import NotFoundPage from "./components/pages/NotFoundPage";

function App() {
  return (
    <>
			<Routes>
				<Route index element={<IndexPage />} />
				<Route path="/logout" element={<LogoutPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
    </>
  )
}

export default App;
