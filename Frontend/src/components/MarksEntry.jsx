import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Eye } from "lucide-react";
import { api } from "../api";

function formatLastUpdated(dateStr) {
  if (!dateStr) return "-";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const relative =
    diffDays === 0
      ? "Today"
      : diffDays === 1
      ? "1d ago"
      : `${diffDays}d ago`;

  return {
    relative,
    exact: date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

// --------------- get marks coloum--------------------
function getMarksColumns(subjectType, examScheme) {
  if (!subjectType) return [];

  // ---------------- THEORY ----------------
  if (subjectType === "THEORY") {

    if (examScheme === "MID15_AT4") {
      return ["mid1", "mid2", "mid3", "at1", "at2", "at3", "at4", "est"];
    }

    if (examScheme === "MID20") {
      return ["mid1", "mid2", "mid3", "est"];
    }

    if (examScheme === "MID40") {
      return ["mid1", "mid2", "est"];
    }

    if (examScheme === "ZERO_CREDIT") {
      return ["est"];
    }

    return [];
  }

  // ---------------- LAB / PROJECT / ELECTIVE ----------------
  if (["LAB", "PROJECT", "ELECTIVE"].includes(subjectType)) {
    return ["internal", "external"];
  }

  if (subjectType === "INTERNSHIP") {
    return ["external"];
  }

  return [];
}


export default function MarksEntry() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Selection
  const [level, setLevel] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  

  // Data
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [batch, setBatch] = useState("");
  //const [batch, setBatch] = useState("R27");
  const [batches, setBatches] = useState([]);
  const [semester, setSemester] = useState("Sem1");
  const [search, setSearch] = useState("");
  //BULK UPLODE
  const [bulkFile, setBulkFile] = useState(null);

  //exam filtering 
  const [examType, setExamType] = useState("ALL");

  // Semester init
  const [selectedSection, setSelectedSection] = useState("Sem1");

  const [branchFilter, setBranchFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState(batch);

   // history setup in marks entry table
  const [historyData, setHistoryData] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  //--------------
  const [hasLoadedSubjects, setHasLoadedSubjects] = useState(false);
  //-----------------for locking the marks table----------
  const userRole = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const userLevel = localStorage.getItem("level");
  //----------sections work--------------------------
  const [sections, setSections] = useState([]);
  const [sectionFilter, setSectionFilter] = useState("");
  const hasSections = sections.length > 0;

  // ---------------- FETCH SUBJECTS ----------------
  const fetchSubjects = async (lvl) => {
    try {
      setLoading(true);
      setLevel(lvl);
      setSelectedSubject(null);
      setStudents([]);

      const res = await api.get("/subjects/", {
        params: { 
          level: lvl,
          semester: semesterFilter !== "ALL" ? semesterFilter : "",
          batch: batch,
          branch: branchFilter !== "ALL" ? branchFilter : "",
         },
      });
      console.log("Fetching subjects with:", {
        level,
        semester,
        branchFilter,
      });


      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FETCH MARKS ----------------

  const fetchMarks = async (subjectObj) => {
    try {
      setLoading(true);
      setSelectedSubject(subjectObj);

      const res = await api.get("/marks/", {
        params: {
          //batch: batchFilter !== "ALL" ? batchFilter : "",
          batch: batch,
          semester: semesterFilter !== "ALL" ? semesterFilter : "",
          level,
          subject: subjectObj.code,
          section: sectionFilter 
        }

      });
      console.log("MARKS RESPONSE:", res.data);
      console.log(res.data.students[0]);

      //  SAFETY CHECK
      if (Array.isArray(res.data.students)) {
        setStudents(res.data.students); 
        window.scrollTo({ top: 0, behavior: "smooth" }); //Add Scroll To Top on Subject Change

      } else {
        console.error("Marks API did not return array:", res.data);
        setStudents([]);
      }

    } catch (err) {
      console.error(err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };



  // ---------------- SETUP SEMESTER ----------------
  const setupSemester = async () => {
    try {
      await api.post("/semester/setup/", {
        batch_id: batch,
        semester: selectedSection,
      });
      alert("Semester initialized successfully");
    } catch (err) {
      alert(err.response?.data?.error || "Semester setup failed");
    }
  };

  // ---------------- HISTORY check ----------------
  const openHistory = async (marksId) => {
    try {
      const res = await api.get("/marks/history/", {
        params: { marks_id: marksId },
      });

      setHistoryData(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      alert("Failed to fetch history");
    }
  };


  // ---------------- FILTER ----------------
  const filteredStudents = Array.isArray(students)
    ? students.filter(
        (s) =>
          s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.student_id?.includes(search)
      )
    : [];

  if (students.length > 0) {
  console.log("Subject Type:", students[0]?.subject_type);
  }
  const batchStatus = batches.find(b => b.batch_id === batch)?.status;
  //------------------ useEffect forFETCH BATCHES for filterwork direct connect DB-------------
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await api.get("/batches/");
        setBatches(res.data);
      } catch (err) {
        console.error("Failed to load batches");
      }
    };

    fetchBatches();
  }, []);
  // for sem filter ---
  useEffect(() => {
    if (selectedSubject) {
      fetchMarks(selectedSubject);
    }
  }, [batch, semesterFilter, branchFilter,sectionFilter]);

  //for sections
  useEffect(() => {
    if (batch && semesterFilter) {
      api.get("/sections/", {
        params: {
          batch,
          semester: semesterFilter
        }
      })
      .then(res => {console.log("SECTIONS:", res.data);
        setSections(res.data);})
      .catch(() => setSections([]));
    }
  }, [batch, semesterFilter]);

//---------------- export pdf function -------------
  const handleExportPDF = async () => {
    try {
      const response = await api.get("/marks/export/pdf/", {
        params: {
          batch: batch,
          semester: semesterFilter !== "ALL" ? semesterFilter : "",
          level,
          subject: selectedSubject?.code,
          exam_type: examType,
        },
        responseType: "blob",   // VERY IMPORTANT
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "marks_report.pdf";
      link.click();

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export failed", error);
    }
  };
 //------------ export button function-------------------------
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert("Please select CSV file");
      return;
    }
    if (!semesterFilter || !batch || !selectedSubject) {
      alert("Select batch, semester, subject");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("subject", selectedSubject.code);
      formData.append("level", level);
      formData.append("semester", semesterFilter);
      formData.append("batch", batch);

      const res = await api.post("/marks/bulk-upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      //alert("Bulk upload successful");
      alert(`Updated: ${res.data.updated}\n Errors: ${res.data.errors.length}`);
      console.table(res.data.errors);
      fetchMarks(selectedSubject); // refresh table

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Bulk upload failed");
      console.log(err.response?.data);
    }
  };
 //------------ load subjects button-----------------
  const loadSubjects = async () => {
    if (!batch || !semesterFilter) {
      alert("Please select batch and semester");
      return;
    }
    if (level.startsWith("E") && !branchFilter) {
      alert("Please select branch for Engineering level.");
      return;
    }

    try {
      
    setSelectedSubject(null);
    setStudents([]);
    setSubjects([]);
    setHasLoadedSubjects(true); 
    const res = await api.get("/subjects/", {
        params: {
          level,
          semester: semesterFilter !== "ALL" ? semesterFilter : "",
          batch,
          branch: level.startsWith("E") && branchFilter !== "ALL"
            ? branchFilter
            : "",
        },
      });
    
      setSubjects(res.data);
    } catch (err) {
    console.error(err);
    }
  };



  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-800 font-sans">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg border shadow-sm">

          {/* INIT SEMESTER 
          <button
            onClick={setupSemester}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            Initialize Semester
          </button> */}

          {/* HEADING */}
          <h1 className="text-2xl font-bold mb-1">
            {level ? `${level} – Marks Entry` : "Marks Entry"}
          </h1>
          {selectedSubject && (
            <p className="text-sm text-gray-600">
              Subject: <span className="font-semibold">{selectedSubject.name}</span>
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">
            Enter & manage student examination marks
          </p>

          {/* LEVEL BUTTONS */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {["PUC1", "PUC2", "E1", "E2", "E3", "E4"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setLevel(lvl);
                  setSubjects([]);
                  setSelectedSubject(null);
                  setStudents([]);
                  setSemesterFilter("");
                  setBranchFilter("");
                  setHasLoadedSubjects(false);
                }}

                className={`p-4 border rounded-lg text-left ${
                  level === lvl
                    ? "bg-red-50 border-red-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <h3 className="font-semibold">{lvl}</h3>
                <p className="text-xs text-gray-500">
                  {lvl.startsWith("PUC") ? "Pre-University" : "Engineering"}
                </p>
              </button>
            ))}
          </div>

          
          {/* FILTER SECTION - BEFORE SUBJECTS */}
          {level &&  (
            <div className="flex flex-wrap gap-4 mb-6 items-end">

              {/* Batch */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">Batch</label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="border px-3 py-2 rounded"
                >
                  <option value="">Select Batch</option>
                  {batches.map((b) => (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.batch_id} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">Semester</label>
                <select
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  className="border px-3 py-2 rounded"
                >
                  <option value="">Select Semester</option>
                  <option value="Sem1">Sem1</option>
                  <option value="Sem2">Sem2</option>
                </select>
              </div>

              {/* Branch for Engineering */}
              {level.startsWith("E") && (
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Branch</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="border px-3 py-2 rounded"
                  >
                    <option value="">Select Branch</option>
                    <option value="AIML">AIML</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="MME">MME</option>
                    <option value="CHEM">CHEM</option>
                  </select>
                </div>
              )}

              {/* Load Subjects Button */}
              <button
                onClick={loadSubjects}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Load Subjects
              </button>

            </div>
          )}
          {/* SUBJECTS */}
          {subjects.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {subjects.map((sub) => (
                  <button
                    key={sub.code}
                    onClick={() => fetchMarks(sub)}
                    className={`px-4 py-2 rounded-full text-sm border ${
                      selectedSubject?.code === sub.code
                        ? "bg-red-600 text-white"
                        : "hover:bg-red-50 border-red-200"
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* NO SUBJECT MESSAGE */}
          {hasLoadedSubjects && !loading && subjects.length === 0 && (
            <div className="p-6 border rounded bg-yellow-50 text-center text-yellow-700">
              <p className="font-semibold">
                No subjects found for:
              </p>
              <p className="mt-1 text-sm font-medium">
                Level: {level} | Batch: {batch} | Semester: {semesterFilter}
                {level.startsWith("E") && branchFilter && ` | Branch: ${branchFilter}`}
              </p>

              <p className="mt-2 text-sm">
                Please create subjects in Academic Management, NO INITIALIZED SUBJECTS.
              </p>
            </div>
          )}

          
          {/* TABLE ACTION BAR */}
          {selectedSubject && (
              <div className="flex justify-between items-end gap-4 mb-4 bg-gray-50 p-3 rounded border flex-wrap">
                 {/* LEFT SIDE → FILTERS */}
                  <div className="flex gap-4 items-end flex-wrap">

                    {/* SECTION FILTER */}
                    {hasSections && (
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">Section</label>
                        <select
                          value={sectionFilter}
                          onChange={(e) => setSectionFilter(e.target.value)}
                          className="border px-3 py-2 rounded"
                        >
                          <option value="">All Sections</option>
                          {sections.map((sec) => (
                            <option key={sec} value={sec}>
                              {sec}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                {/* Search */}
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">
                    Search Student
                  </label>
                  <input
                    type="text"
                    placeholder="Roll / Name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border px-3 py-2 rounded w-52"
                  />
                </div>
                {/*EXPORT BUTTON */}
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">
                    Bulk Upload
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkFile(e.target.files[0])}
                    className="text-xs"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-transparent mb-1">.</label>
                  <button
                    onClick={handleBulkUpload}
                    className="bg-blue-600 text-white px-3 py-2 rounded text-xs"
                  >
                    Upload
                  </button>
                </div>

                {/* Export Type (Only Theory) */}
                {selectedSubject?.subject_type === "THEORY" &&
                 selectedSubject?.exam_scheme !== "ZERO_CREDIT" && (
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Export Type
                    </label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      className="border px-3 py-2 rounded"
                    >
                      <option value="ALL">All</option>
                      <option value="MID1">Mid 1</option>
                      <option value="MID2">Mid 2</option>
                      {selectedSubject?.exam_scheme === "MID15_AT4" && (
                        <>
                          <option value="MID3">Mid 3</option>
                          <option value="ATS">All ATs</option>
                        </>
                      )}

                      {selectedSubject?.exam_scheme === "MID20" && (
                        <option value="MID3">Mid 3</option>
                      )}

                      {selectedSubject?.exam_scheme === "MID40" && null}
                      <option value="EST">EST</option>
                      <option value="INTERNAL">Internal</option>
                      <option value="TOTAL">Total</option>
                    </select>
                  </div>
                )}

                {/* Export Button */}
                <div className="flex flex-col">
                  <label className="text-xs text-transparent mb-1">
                    .
                  </label>
                  <button
                    onClick={handleExportPDF}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Export PDF
                  </button>
                </div>

              </div>

              )}


          {/*---- which subject we are dealing currently*/}
          {selectedSubject && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <span className="font-semibold text-blue-800">
                Currently Editing:
              </span>{" "}
              {selectedSubject.name} ({selectedSubject.code}) –{" "}
              {selectedSubject.subject_type}
            </div>
          )}


          {/* MARKS TABLE */}
          {selectedSubject && (
            <div className={`transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full min-w-[1400px] text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Student ID</th>
                      <th className="p-3 text-left">Student Name</th>
                      {level?.startsWith("E") && (
                        <th className="p-3 text-center">Branch</th>
                      )}
                      <th className="p-3 text-center">Semester</th>
                      {hasSections && <th className="p-3 text-center">Section</th>}
                      {students.length > 0 &&
                        getMarksColumns(students[0].subject_type,students[0].exam_scheme).map((col) => (

                        <th key={col} className="p-3 text-center uppercase">
                          {col}
                        </th>
                      ))}
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Last Updated</th>
                      <th className="p-3 text-center w-24">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map((s) => {
                      let hasMarks = false;

                        if (s.subject_type === "THEORY") {

                          const cols = getMarksColumns(s.subject_type, s.exam_scheme);

                          hasMarks = cols.some(col => s[col]);
                        }

                        else if (["LAB", "PROJECT", "ELECTIVE"].includes(s.subject_type)) {
                          hasMarks = s.internal || s.external;
                        }

                        else if (s.subject_type === "INTERNSHIP") {
                          hasMarks = s.external;
                        }


                      const time = formatLastUpdated(s.updated_at);

                      return (
                        <tr key={s.marks_id}
                          className={`border-b hover:bg-gray-50 ${
                            batchStatus === "Completed" ||
                            (userRole === "faculty" && userLevel !== level)
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          title={
                            batchStatus === "Completed"
                              ? "Batch completed"
                              : (userRole === "faculty" && userLevel !== level)
                                ? "Locked: Different level"
                                : ""
                          }
                        >
                          <td className="p-3 font-medium">{s.student_id}</td>
                          <td className="p-3">{s.name}</td>

                          {level?.startsWith("E") && (
                            <td className="p-3 text-center">
                              {s.branch || "-"}
                            </td>
                          )}

                          <td className="p-3 text-center">{s.semester}</td>
                          {hasSections && (
                            <td className="p-3 text-center">{s.section || "-"}</td>
                          )}
                          {students.length > 0 &&
                          getMarksColumns(students[0].subject_type,students[0].exam_scheme).map((field) => (

                            <td key={field} className="p-3 text-center">
                              <input
                                type="number"
                                disabled={
                                  batchStatus === "Completed" ||
                                  (userRole === "faculty" && s.level !== level)
                                }
                                value={s[field] ?? ""}
                                onChange={(e) =>{
                                  const newValue = Number(e.target.value);
                                    // Update UI immediately
                                  setStudents(prev =>
                                    prev.map(st =>
                                      st.marks_id === s.marks_id
                                        ? { ...st, [field]: newValue }
                                        : st
                                    )
                                  );
                                  console.log("Sending marks_id:", s.marks_id);
                                  //Save to backend
                                  api.post("/marks/save/", {
                                    marks_id: s.marks_id,
                                    [field]: newValue,
                                  })
                                  .catch(err => {
                                      if (err.response?.status === 403) {
                                        alert("This batch is locked (Completed).");
                                      }
                                    })
                                  .then(res => {
                                    const now = new Date().toISOString();

                                    setStudents(prev =>
                                      prev.map(st =>
                                        st.marks_id === s.marks_id
                                          ? { ...st, updated_at: now }
                                          : st
                                      )
                                    );
                                  });

                                }}
                                className="w-16 border rounded px-2 py-1 text-center"
                              />
                            </td>
                          ))}

                          <td className="p-3 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                hasMarks
                                  ? "bg-green-100 text-green-800"
                                  : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {hasMarks ? "Entered" : "Pending"}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <div className="font-semibold">{time.relative}</div>
                            <div className="text-xs text-gray-500">
                              {time.exact}
                            </div>
                          </td>

                          <td className="p-3 text-center w-24">
                            <button
                              onClick={() => openHistory(s.marks_id)}
                              className="text-blue-600 hover:underline flex items-center justify-center gap-1"
                            >
                              <Eye size={14} /> History
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {selectedSubject && !loading && students.length === 0 && (
                  <div className="text-center text-gray-500 mt-6 p-6 border rounded bg-gray-50">
                    <p className="font-semibold">No records found for {batch} - {semesterFilter}.</p>
                    <p className="text-sm mt-1">
                      This batch/semester may not be initialized yet.
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}

          {loading && (
            <div className="text-center text-sm text-gray-500 mt-4">
              Loading...
            </div>
          )}
        </div>
        {/* HISTORY MODAL */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white w-3/4 max-w-3xl rounded-lg shadow-lg p-6">

              <h2 className="text-lg font-bold mb-4">
                Marks Change History
              </h2>

              <div className="max-h-96 overflow-y-auto">
                {historyData.length === 0 ? (
                  <p className="text-gray-500">No changes recorded.</p>
                ) : (
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Field</th>
                        <th className="p-2 text-center">Old</th>
                        <th className="p-2 text-center">New</th>
                        <th className="p-2 text-left">Entered By</th>
                        <th className="p-2 text-left">Role</th>
                        <th className="p-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map((h, index) => (
                        <tr
                          key={index}
                          className={`border-t p-2 ${
                            h.role === "coe"
                              ? "bg-purple-50"
                              : "bg-blue-50"
                          }`}
                        >
                          <td className="p-2">{h.field.toUpperCase()}</td>
                          <td className="p-2 text-center text-red-600">{h.old}</td>
                          <td className="p-2 text-center text-green-600">{h.new}</td>
                          <td className="p-2">{h.by || "-"}</td>
                          <td className="p-2">
                            {h.role === "coe" ? "COE" : "Faculty"}
                          </td>
                          <td className="p-2">
                            {new Date(h.at).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );

}
