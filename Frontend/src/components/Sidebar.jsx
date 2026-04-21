import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Edit,
  Search,
  Folder,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen 
} from "lucide-react";



export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  //  Logout function
  const handleLogout = () => {
    // 🧹 Clear stored session data (optional but recommended)
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to LoginPage
    navigate("/");
  };
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("user_email") || "";
  const formatRoleName = () => {
    if (role === "coe") return "COE Admin";

    if (role === "faculty") {
      const lowerEmail = email.toLowerCase();

      if (lowerEmail.includes("e1")) return "ENGG 1 Faculty";
      if (lowerEmail.includes("e2")) return "ENGG 2 Faculty";
      if (lowerEmail.includes("e3")) return "ENGG 3 Faculty";
      if (lowerEmail.includes("e4")) return "ENGG 4 Faculty";
      if (lowerEmail.includes("puc1")) return "PUC 1 Faculty";
      if (lowerEmail.includes("puc2")) return "PUC 2 Faculty";

      return "Faculty";
    }

    return "User";
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <BarChart2 size={18} />
    },
    { name: "Marks Entry", path: "/marks-entry", icon: <Edit size={18} /> },
    { name: "Student Search", path: "/student-search", icon: <Search size={18} /> },
    { name: "Batch Management", path: "/batch-management", icon: <Folder size={18} /> },
    { name: "Academic Management", path: "/academic-management", icon: <BookOpen size={18} /> },
    { name: "Reports", path: "/reports", icon: <FileText size={18} /> },
    { name: "Certificate Management", path: "/certificate-management", icon: <FileText size={18} /> },
  ];

  return (
    <aside
      className={`bg-white border-r shadow-sm transition-all duration-300 h-screen sticky top-0 ${
        sidebarOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-5 flex items-center justify-between border-b">
        {sidebarOpen && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center text-red-700 font-semibold text-lg">
              EC
            </div>
            <div>
              <h3 className="font-semibold text-lg">Exam Cell</h3>
              <p className="text-xs text-gray-500">{formatRoleName()}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-600 hover:text-red-700 ml-auto"
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="mt-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all
                ${
                  isActive
                    ? "bg-red-50 text-red-700"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/*  Logout Button */}
      <div className="absolute bottom-6 left-0 w-full px-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 px-3 py-2 rounded-lg hover:bg-gray-100 w-full transition-all font-medium"
        >
          <LogOut size={18} />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
