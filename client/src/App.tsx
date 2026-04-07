import {
    Routes,
    Route,
} from "react-router";

import IndexPage from "./components/pages/IndexPage";
import LogoutPage from "./components/pages/LogoutPage";
import RegisterPage from "./components/pages/RegisterPage";
import LoginPage from "./components/pages/LoginPage";

function App() {
  return (
    <>
			<Routes>
				<Route index element={<IndexPage />} />
				<Route path="/logout" element={<LogoutPage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
			</Routes>
    </>
  )
}

export default App;
