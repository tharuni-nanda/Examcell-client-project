import React from "react";
import Navbar from "./components/Navbar"; // path might be './components/Navbar' depending on your folder structure
import LoginPage from "./components/LoginPage";

function App() {
  return (
    <div>
      <Navbar />
      <LoginPage />
    </div>
  );
}

export default App;
