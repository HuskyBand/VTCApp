import React from "react";

import {
    BrowserRouter as Router,
    Routes,
    Route,
} from "react-router";

import ExamplePage from "./components/pages/ExamplePage";

import './App.css';


function App() {

  return (
    <>
      <Router>
          <Routes>
              <Route path="/" element={<ExamplePage />} />
          </Routes>
      </Router>
    </>
  )
}

export default App
