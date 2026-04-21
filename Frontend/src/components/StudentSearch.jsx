import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../api"; 
import {
  Search,
  User,
  GraduationCap
} from "lucide-react";
//import {FileText,  Edit,  Search,  BarChart2,  Folder,  Bell,  LogOut,  ChevronLeft, ChevronRight,  User,  GraduationCap,  Layers, Settings,} from "lucide-react";

const StudentSearch = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [batch, setBatch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [batches, setBatches] = useState([]);
  const [levels, setLevels] = useState(["PUC1", "PUC2", "E1", "E2", "E3", "E4"]);
  const [semesters, setSemesters] = useState(["Sem1", "Sem2"]);
  const [results, setResults] = useState([]);


  const levelOptions = ["PUC1", "PUC2", "E1", "E2", "E3", "E4"];
  const semOptions = ["Sem1", "Sem2"];
  
  
  const handleSearch = async () => {
    if (!batch) {
      alert("Batch is required");
      return;
    }

    // fallback if user unselects all
    const finalLevels = levels.length > 0 ? levels : levelOptions;
    const finalSemesters = semesters.length > 0 ? semesters : semOptions;

    try {
      const res = await api.get("/student-results/", {
        params: {
          query: studentId,   //matches backend
          batch: batch,
          levels: levels,     // array
          semesters: semesters
        }
      });

      setResults(res.data.students);
    } catch (err) {
      console.error(err);
    }
  };
  //useEffect(() => {
  //  setLevels(levelOptions);
  //  setSemesters(semOptions);
  //}, [levelOptions, semOptions]);
  useEffect(() => {
    api.get("/batches/")
      .then(res => setBatches(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="flex mt-2">
        {/* Sidebar */}
        <div className="flex mt-2">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>


        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="bg-white border p-6 flex justify-between items-center shadow-sm rounded-lg">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Search</h1>
              <p className="text-sm text-gray-500 mt-1">
                Search and filter students by ID, batch, section, or branch.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Search Filters */}
          <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8 border-t-4 border-red-700 mt-6">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6">
              <GraduationCap size={28} className="text-red-700" />
              <h1 className="text-3xl font-semibold text-red-800 tracking-wide">
                Student Search
              </h1>
            </div>
            <p className="text-gray-600 mb-8 text-sm">
              Quickly find students by their ID, name, or academic details.
            </p>

            {/* Search Input */}
            <div className="relative mb-6">
              <User
                size={20}
                className="absolute left-3 top-3 text-gray-500 pointer-events-none"
              />
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter Student ID (e.g., R25001) or Name..."
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Batches */}
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              >
                <option value="">Select Batch</option>
                {batches.map(b => (
                  <option key={b.batch_id} value={b.batch_id}>
                    {b.batch_id}
                  </option>
                ))}
              </select>

              {/* level or years */}
              <div>
                <label>Level *</label>
                {levelOptions.map(l => (
                  <label key={l}>
                    <input
                      type="checkbox"
                      value={l}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLevels(prev => [...prev, l]);
                        } else {
                          setLevels(prev => prev.filter(x => x !== l));
                        }
                      }}
                    />
                    {l}
                  </label>
                ))}
              </div>

              {/* semester*/}
              <div>
                <label>Semester *</label>
                {semOptions.map(s => (
                  <label key={s}>
                    <input
                      type="checkbox"
                      value={s}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSemesters(prev => [...prev, s]);
                        } else {
                          setSemesters(prev => prev.filter(x => x !== s));
                        }
                      }}
                    />
                    {s}
                  </label>
                ))}
              </div>

              {/* Search Button */}
              <div className="flex justify-end mt-8">
                <button
                  onClick={handleSearch}
                  className="flex items-center bg-red-700 hover:bg-red-800 text-white px-6 py-2.5 rounded-lg transition-all shadow-md"
                >
                  <Search size={18} className="mr-2" /> Search
                </button>
              </div>
	      
            </div>
          </div>
          {/* RESULTS SECTION */}
              <div className="max-w-6xl mx-auto mt-8">
                {results.map(student => (
                  <div key={student.student_id} className="bg-white p-6 mb-6 rounded-xl shadow">

                    {/* STUDENT HEADER */}
                    <h2 className="text-xl font-bold">{student.name}</h2>
                    <p>ID: {student.student_id}</p>
                    <p>Branch: {student.branch}</p>
                    <p className="font-semibold">CGPA: {student.cgpa}</p>
                    <button
                      onClick={async () => {
                        try {
                          // fallback if nothing selected
                          const finalLevels = levels.length > 0 ? levels : levelOptions;
                          const finalSemesters = semesters.length > 0 ? semesters : semOptions;

                          // build params properly
                          const params = new URLSearchParams();
                          params.append("student_id", student.student_id);
                          params.append("batch", batch);

                          // send ALL selected filters
                          finalLevels.forEach(l => params.append("levels", l));
                          finalSemesters.forEach(s => params.append("semesters", s));

                          const res = await api.get(
                            `/export-student-result-pdf/?${params.toString()}`,
                            { responseType: "blob" }
                          );

                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `${student.student_id}_result.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                        } catch (err) {
                          alert("PDF download failed");
                        }
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      Download PDF
                    </button>
                    {/* SEM RESULTS */}
                    {Object.entries(student.results).map(([key, val]) => {
                      const hasRemedial = val.subjects.some(sub => sub.grade === "R");

                      const remedials = val.subjects.filter(sub => sub.grade === "R");
                      const cleared = val.subjects.filter(sub => sub.grade !== "R");

                      return (
                        <div key={key} className="mt-4">
                          <h3 className="font-semibold text-red-700">
                            {key.replace("_", " - ")}
                            <p className="text-sm font-medium">
                              SGPA: {val.sgpa ?? "-"}
                            </p>
                          </h3>

                          <table className="w-full mt-2 border">
                            <thead>
                              <tr className="bg-gray-100">
                                <th>Code</th>
                                <th>Subject</th>
                                <th>Credits</th>
                                <th>Grade</th>
                                <th>Status</th>
                              </tr>
                            </thead>

                            <tbody>
                              {val.subjects.map((sub, i) => (
                                <tr key={i}>
                                  <td>{sub.code}</td>
                                  <td>{sub.name}</td>
                                  <td>{sub.credits}</td>
                                  <td>{sub.grade}</td>
                                  <td>
                                    {sub.grade === "R" ? (
                                      <span className="text-red-600">Failed</span>
                                    ) : (
                                      <span className="text-green-600">Cleared</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* BACKLOG SECTION */}
                          {remedials.length > 0 && (
                            <div className="mt-3 bg-red-50 p-3 rounded">
                              <h4 className="text-red-700 font-bold">Backlogs</h4>
                              {remedials.map(sub => (
                                <p key={sub.code}>{sub.name}</p>
                              ))}
                            </div>
                          )}

                          {/* CLEARED SECTION */}
                          {cleared.length > 0 && (
                            <div className="mt-3 bg-green-50 p-3 rounded">
                              <h4 className="text-green-700 font-bold">Cleared</h4>
                              {cleared.map(sub => (
                                <p key={sub.code}>{sub.name}</p>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })}
                      
                    </div>
                ))}
              </div>
        </main>
      </div>
    </div>
  );
};

export default StudentSearch;