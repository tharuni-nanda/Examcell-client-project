import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
//import FacultyDashboard from "./components/FacultyDashboard";
import StudentSearch from "./components/StudentSearch";
import MarksEntry from "./components/MarksEntry";
import BatchManagement from "./components/BatchManagement";
import AcademicManagement from "./components/AcademicManagement";
import Reports from "./components/Reports";
import TestAPI from "./TestAPI";
import ProtectedRoute from "./components/ProtectedRoute";
import CertificatePage from "./components/CertificatePage";
function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/batch-management" 
          element={
            <ProtectedRoute allowedRoles={["coe","faculty"]}>
              <BatchManagement />
            </ProtectedRoute>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["coe","faculty"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/student-search" element={<StudentSearch />} />
        <Route path="/marks-entry" 
          element={
            <ProtectedRoute allowedRoles={["coe","faculty"]}>
              <MarksEntry />
            </ProtectedRoute>} />
        <Route path="/academic-management" 
          element={
            <ProtectedRoute allowedRoles={["coe","faculty"]}>
              <AcademicManagement />
            </ProtectedRoute> }/>
        <Route path="/reports" 
          element={
            <ProtectedRoute allowedRoles={["coe","faculty"]}>
              <Reports />
            </ProtectedRoute>} />
        <Route
          path="/test"
          element={
            <div>
              <h1>React + Django Connection Test</h1>
              <TestAPI />
            </div>
          }
        />
        <Route
          path="/certificate-management"
          element={
            <ProtectedRoute allowedRoles={["coe","faculty"]}>
              <CertificatePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
{/*import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginPage from "./components/LoginPage";
import COEDashboard from "./components/COEDashboard";
import FacultyDashboard from "./components/FacultyDashboard";
import TestAPI from "./TestAPI";

function App() {
  return (
    <>
      {/* Navbar stays visible on all pages 
      <Navbar />

      <Routes>
        {/* Default login route *
        <Route path="/" element={<LoginPage />} />

        {/* COE dashboard route *
        <Route path="/coe-dashboard" element={<COEDashboard />} />

        {/* Faculty dashboard route *
        <Route path="/faculty-dashboard" element={<FacultyDashboard />} />

        {/* Optional test API route *
        <Route
          path="/test"
          element={
            <div>
              <h1>React + Django Connection Test</h1>
              <TestAPI />
            </div>
          }
        />
        <Route
          path="/faculty-dashboard"
          element={
            <ProtectedRoute allowedRole="faculty">
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
*/}