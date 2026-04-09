import React, { useState, useEffect } from "react";
import { api } from "../api";
import Sidebar from "../components/Sidebar";
import { Edit, ArrowUpCircle, Plus, Save, Pencil } from "lucide-react";

/**
 * BatchManagement.jsx
 * - Fetches / displays batches from backend
 * - Add batch (CSV upload)
 * - Promote batch (with optional CSV for PUC2->E1)
 *
 * Expects backend endpoints (relative to api.baseURL):
 * GET    /batches/
 * POST   /batches/add/           (multipart/form-data with file)
 * POST   /batches/{batch_id}/promote/  (optionally multipart/form-data with file)
 */

const defaultBatch = {
  id: "",
  name: "",
  year: "",
  status: "Active",
  students: 0,
  section: "",
  duration: "",
  startDate: "",
  branchDistribution: [],
  performance: {
    midTerm: 0,
    assignment: 0,
    overall: 0,
    gradeDist: [
      { name: "A Grade", value: 0, color: "text-green-600" },
      { name: "B Grade", value: 0, color: "text-blue-600" },
      { name: "C Grade", value: 0, color: "text-orange-600" },
      { name: "Below C", value: 0, color: "text-red-600" },
    ],
  },
};

export default function BatchManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const role = localStorage.getItem("role");
  // filters & data
  const [activeFilter, setActiveFilter] = useState("all");
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal states (view/edit modal)
  const [modalBatchIdx, setModalBatchIdx] = useState(null);
  const [modalBatchState, setModalBatchState] = useState(null);
  const [modalTab, setModalTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [editTab, setEditTab] = useState("");

  // promote modal
  const [promoteModal, setPromoteModal] = useState(false);
  const [promoteBatchIdx, setPromoteBatchIdx] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  // add batch modal
  const [addModal, setAddModal] = useState(false);
  const [addFile, setAddFile] = useState(null);
  const [newBatch, setNewBatch] = useState(defaultBatch);

  //for exam activity
  const [selectedExam, setSelectedExam] = useState("");
  const [activeExam, setActiveExam] = useState(null);
  // for section in student tab
  const [sectionFile, setSectionFile] = useState(null);

  // ---------- FETCH ----------
  useEffect(() => {
    fetchBatches();
    // eslint-disable-next-line
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get("/batches/");  // Correct backend URL

      const formatted = res.data.map(batch => {
        const students = batch.students || [];

        // TOTAL STUDENTS
        const total = students.length;

        // GROUP STUDENTS BY BRANCH OR PUC
        const branchMap = {};
        students.forEach(s => {
          const key = s.course === "PUC" ? "PUC" : (s.branch || "Unknown");
          if (!branchMap[key]) branchMap[key] = 0;
          branchMap[key]++;
        });

        const branchDistribution = Object.entries(branchMap).map(([name, count]) => ({
          name,
          count,
        }));

        return {
          ...batch,
          studentsCount: total,
          branchDistribution,
        };
      });

      setBatches(formatted);
      console.log("Formatted batches:", formatted);

    } catch (err) {
      console.error("Error loading batches:", err);
    } finally {
      setLoading(false);
    }
  };
  //fetch exam activity
  const fetchActiveExam = async (batchId) => {
    try {
      const res = await api.get(`/active-exam/${batchId}/`);
      setActiveExam(res.data.active_exam);
    } catch (err) {
      console.error(err);
    }
  };
  const handleActivateExam = async (batchId) => {
    if (!selectedExam) {
      alert("Select exam type");
      return;
    }

    const semesterToSend = modalBatchState?.current_semester;
    console.log("semester being sent:", modalBatchState.current_semester);

    if (!semesterToSend) {
      alert("Semester not found");
      return;
    }

    try {
      await api.post("/activate-exam/", {
        batch: batchId,
        exam_type: selectedExam,
        semester: semesterToSend,
      });

      alert("Exam activated");
      fetchActiveExam(batchId);
    } catch (err) {
      console.log(err.response?.data);
      alert(err.response?.data?.error || "Activation failed");
    }
  };
  const handleDeactivateExam = async (batchId) => {
    try {
      await api.post("/deactivate-exam/", {
        batch: batchId,
      });

      alert("Exam deactivated");
      setActiveExam(null);
    } catch (err) {
      alert(err.response?.data?.error || "Deactivation failed");
    }
  };


  // ---------- HELPERS: normalize backend fields ----------
  // Some API serializers might use different names; use fallbacks.
  function getBatchKey(batch) {
    return batch.batch_id || batch.batchId || batch.id || batch.pk;
  }
  function getBatchName(batch) {
    return batch.name || batch.batch_name || "";
  }
  function getAcademicYear(batch) {
    return (
      batch.current_academic_year ||
      batch.academic_year ||
      batch.currentAcademicYear ||
      batch.year ||
      ""
    );
  }
  function getStudentsCount(batch) {
    // try multiple possibilities: explicit count, or students array length
    return (
      batch.students_count ||
      batch.studentsCount ||
      batch.student_count ||
      batch.students?.length ||
      batch.students_count_override ||
      0
    );
  }
  function getCurrentLevel(batch) {
    return batch.current_level || batch.currentLevel || batch.level || "PUC1";
  }

  // ---------- OPEN / CLOSE VIEW MODAL ----------
  const openModal = (idx) => {
    const selectedBatch = batches[idx];

    setModalBatchIdx(idx);
    setModalTab("overview");
    setEditMode(false);
    setModalBatchState(JSON.parse(JSON.stringify(selectedBatch || {})));

    fetchActiveExam(selectedBatch.batch_id);
  };
  const closeModal = () => {
    setModalBatchIdx(null);
    setEditMode(false);
    setModalBatchState(null);
    setSelectedExam("");  
    setActiveExam(null); 
  };


  const handleSaveBatch = async () => {
  try {
    const batch = modalBatchState;
    const batchKey = batch.batch_id;

    await api.patch(
      `/batches/${batchKey}/`,
      {
        name: batch.name,
        current_academic_year: batch.current_academic_year,
        status: batch.status,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    alert("Batch updated successfully");
    setEditMode(false);
    setEditTab("");
    closeModal();
    fetchBatches();
  } catch (err) {
    console.error("Update failed:", err);
    alert(
      "Failed to update batch: " +
        (err.response?.data?.error ||
         JSON.stringify(err.response?.data) ||
         err.message)
    );
  }
};



  const handleCancelEdit = () => {
    setModalBatchState(JSON.parse(JSON.stringify(batches[modalBatchIdx] || {})));
    setEditMode(false);
  };

  // ---------- ADD BATCH ----------
  const openAddModal = () => {
    setAddModal(true);
    setNewBatch({
      ...defaultBatch,
      id: "R" + Math.floor(10 + Math.random() * 90),
      branchDistribution: [{ name: "CSE", count: 0 }],
    });
    setAddFile(null);
  };
  const closeAddModal = () => {
    setAddModal(false);
    setNewBatch(defaultBatch);
    setAddFile(null);
  };

  const handleCreateBatch = async () => {
    try {
      if (!newBatch.id || !newBatch.name || !newBatch.startYear) {
        alert("Please fill batch id, name and start year.");
        return;
      }
      if (!addFile) {
        alert("Please upload initial students CSV.");
        return;
      }

      const fd = new FormData();
      fd.append("batch_id", newBatch.id);
      fd.append("name", newBatch.name);
      fd.append("start_year", newBatch.startYear);
      if (newBatch.endYear) fd.append("end_year", newBatch.endYear);
      if (newBatch.academicYear) fd.append("academic_year", newBatch.academicYear);
      fd.append("file", addFile);

      // POST to /batches/add/
      await api.post("/batches/add/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Batch created and students uploaded.");
      closeAddModal();
      fetchBatches();
    } catch (err) {
      console.error("Error creating batch:", err);
      alert("Error creating batch: " + (err.response?.data?.error || err.message));
    }
  };
  // ------------sections list bulk uplode of students--------------------
  const handleUploadSections = async () => {
    if (!sectionFile) {
      alert("Upload CSV first");
      return;
    }

    //  ADD HERE
    const confirmUpload = window.confirm(
      "This will overwrite previous section data. Continue?"
    );

    if (!confirmUpload) return;

    const fd = new FormData();
    fd.append("file", sectionFile);
    fd.append("batch", modalBatchState?.batch_id);

    try {
      const res = await api.post("/upload-sections/", fd);
      alert(`Updated: ${res.data.updated}`);
    } catch (err) {
      alert("Upload failed");
    }
  };
  // ---------- PROMOTE ----------
  const openPromoteModal = (idx) => {
    setPromoteBatchIdx(idx);
    setUploadedFile(null);
    setPromoteModal(true);
  };

  const closePromoteModal = () => {
    setPromoteModal(false);
    setPromoteBatchIdx(null);
    setUploadedFile(null);
  };

  const handlePromote = async () => {
    try {
      if (promoteBatchIdx == null) return;
      const batch = batches[promoteBatchIdx];
      const batchKey = batch.batch_id || batch.batch_id || getBatchKey(batch);

      const currentLevel = getCurrentLevel(batch);

      // If it's PUC2 -> E1, file is required (branch assignment)
      if (currentLevel === "PUC2") {
        if (!uploadedFile) {
          alert("Please upload CSV for PUC2 -> E1 promotion (id,name,branch).");
          return;
        }
        const fd = new FormData();
        fd.append("file", uploadedFile);
        await api.post(`/batches/${batchKey}/promote/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // for other levels no file required
        await api.post(`/batches/${batchKey}/promote/`);
      }

      alert("Promotion successful.");
      closePromoteModal();
      fetchBatches();
    } catch (err) {
      console.error("Promote failed:", err);
      alert("Promotion failed: " + (err.response?.data?.error || err.message));
    }
  };
  //--------------------semester promote---------------------
  const handlePromoteSemester = async (batch) => {
    try {
      await api.post("/promote-semester/", {
        batch_id: batch.batch_id,
      });

      alert("Semester promoted successfully");
      fetchBatches();
    } catch (err) {
      alert(
        err.response?.data?.error ||
        "Semester promotion failed"
      );
    }
  };

  // ---------- MARK COMPLETE (when at E4) ----------
  const handleComplete = async (batch) => {
    try {
      const confirmed = window.confirm(
        "Are you sure you want to mark this batch as COMPLETED? This cannot be undone."
      );
      if (!confirmed) return;

      const batchKey = getBatchKey(batch);

      await api.post(`/batches/${batchKey}/promote/`);

      alert("Batch marked as COMPLETED!");
      fetchBatches();
    } catch (err) {
      console.error("Complete failed:", err);
      alert("Failed to mark completed: " + (err.response?.data?.error || err.message));
    }
  };


  // ---------- CALCULATED STATS ----------
  const filteredBatches = batches.filter((b) => {
    if (activeFilter === "active") return (b.status || "").toLowerCase() === "active";
    if (activeFilter === "completed") return (b.status || "").toLowerCase() === "completed";
    return true;
  });

  const activeBatches = batches.filter((b) => (b.status || "").toLowerCase() === "active").length;
  const completedBatches = batches.filter((b) => (b.status || "").toLowerCase() === "completed").length;
  //const totalStudents = batches.reduce((acc, b) => acc + (getStudentsCount(b) || 0), 0);

  const activeBatch = modalBatchIdx !== null ? modalBatchState : null;
  // STUDENT COUNTS
const activeStudents = batches
  .filter((b) => (b.status || "").toLowerCase() === "active")
  .reduce((acc, b) => acc + getStudentsCount(b), 0);

const completedStudents = batches
  .filter((b) => (b.status || "").toLowerCase() === "completed")
  .reduce((acc, b) => acc + getStudentsCount(b), 0);

const totalStudents = activeStudents + completedStudents;


  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-800 font-sans">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-sm border">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Batch Management</h1>
          <p className="text-sm text-gray-500 mb-6">Manage student batches from PUC → E4</p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-4">
            {/* Active Batches */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-gray-700 font-medium">Active Batches</span>
              <span className="text-2xl font-bold text-green-800">{activeBatches}</span>
            </div>

            {/* Completed Batches */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-gray-700 font-medium">Completed Batches</span>
              <span className="text-2xl font-bold text-blue-700">{completedBatches}</span>
            </div>

            {/* Active Students */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-gray-700 font-medium">Active Students</span>
              <span className="text-2xl font-bold text-yellow-700">{activeStudents}</span>
            </div>

            {/* Total Students */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-gray-700 font-medium">Total Students</span>
              <span className="text-2xl font-bold text-purple-700">{totalStudents}</span>
            </div>

          </div>


          {/* Filters & Add */}
          <div className="mb-6 flex gap-2 items-center">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeFilter === "all" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 border border-red-200"}`}
            >
              All Batches
            </button>

            <button
              onClick={() => setActiveFilter("active")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeFilter === "active" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 border border-red-200"}`}
            >
              Active
            </button>

            <button
              onClick={() => setActiveFilter("completed")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeFilter === "completed" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 border border-red-200"}`}
            >
              Completed
            </button>

            {role === "coe"&&(
              <button onClick={openAddModal} className="ml-4 px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700">
                <Plus size={16} /> Add Batch
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && <div className="text-sm text-gray-600 mb-4">Loading batches...</div>}

          {/* Batch cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredBatches.map((batch, idx) => {
              const batchKey = getBatchKey(batch);
              const batchName = getBatchName(batch);
              const acadYear = getAcademicYear(batch);
              const studentsCount = getStudentsCount(batch);
              const currentLevel = getCurrentLevel(batch);
              const currentSemester = batch.current_semester || "Sem1";
              const startYear = batch.start_year || batch.startYear || batch.start || "";
              const showPromoteSemester = batch.current_semester === "Sem1";
              const showPromoteBatch =
                batch.current_semester === "Sem2" && batch.current_level !== "E4";
              const showComplete =
                batch.current_level === "E4" && batch.current_semester === "Sem2";

              return (
                <div key={batchKey || idx} className="border border-red-200 rounded-lg p-4 bg-white shadow-sm h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${(batch.status || "").toLowerCase() === "active" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
                        {batch.status || "Active"}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold">{batchName}</h3>
                    <p className="text-sm text-gray-500 mb-2">Academic Year {acadYear}</p>

                    <div className="text-sm mb-2">
                      <span className="font-medium">Total Students </span>
                      <span>{studentsCount}</span>
                    </div>

                    <div className="text-sm mb-2">
                      <span className="font-medium">Current Level </span>
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded ml-1 text-xs font-medium">{currentLevel}</span>
                    </div>
                    {batch.status === "Active" && (
                      <div className="text-sm mb-2">
                        <span className="font-medium">Semester </span>
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded ml-1 text-xs font-medium">
                          {currentSemester}
                        </span>
                      </div>
                    )}

                    <div className="text-sm mb-2">
                      <span className="font-medium">Start Year </span>
                      <span>{startYear}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-between items-center mt-3 pt-1 border-t">
                  {role ==="coe"&&(
                    <button className="text-xs text-red-600 px-3 py-1 rounded-full border border-red-200 hover:bg-red-100 flex items-center gap-1" onClick={() => openModal(idx)}>
                      <Edit size={14} /> Edit
                    </button>
                  )}

                    <button className="text-xs text-red-700 font-semibold hover:underline" onClick={() => openModal(idx)}>
                      View →
                    </button>
                    {role === "coe" && (
                      (batch.status || "").toLowerCase() === "completed" ? (

                        <span className="text-xs bg-gray-300 text-gray-700 px-3 py-1 rounded-full">
                          Completed
                        </span>

                      ) : (
                        <div className="flex gap-2">

                          {/* Sem1 → Promote Semester */}
                          {batch.current_semester === "Sem1" && (
                            <button
                              onClick={() => handlePromoteSemester(batch)}
                              className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full hover:bg-blue-600"
                            >
                              Promote Semester
                            </button>
                          )}

                          {/* Sem2 + not E4 → Promote Batch */}
                          {batch.current_semester === "Sem2" && batch.current_level !== "E4" && (
                            <button
                              onClick={() => openPromoteModal(idx)}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 flex items-center gap-1"
                            >
                              <ArrowUpCircle size={14} /> Promote Batch
                            </button>
                          )}

                          {/* E4 + Sem2 → Complete */}
                          {batch.current_level === "E4" && batch.current_semester === "Sem2" && (
                            <button
                              onClick={() => handleComplete(batch)}
                              className="text-xs bg-gray-700 text-white px-3 py-1 rounded-full hover:bg-gray-800"
                            >
                              Complete
                            </button>
                          )}

                        </div>
                      )
                    )}

                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------ VIEW / EDIT MODAL ------------------ */}
          {activeBatch && (
            <div className="fixed inset-0 bg-black bg-opacity-20 flex justify-center items-center z-50">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* header */}
                <div className="px-8 py-5 flex items-center bg-red-100 rounded-t-xl">
                  <div className="flex-1">
                    <div className="text-xl font-bold text-red-800">{activeBatch.name}</div>
                    <div className="text-sm text-gray-600">Academic Year {activeBatch.current_academic_year || activeBatch.academicYear}</div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${activeBatch.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{activeBatch.status}</span>

                  <button onClick={closeModal} className="ml-4 text-2xl font-bold text-red-700">&times;</button>
                </div>

                {/* tabs */}
                <div className="border-b flex bg-white px-8">
                  <button onClick={() => setModalTab("overview")} className={`py-3 px-5 font-semibold border-b-2 ${modalTab === "overview" ? "border-red-500 text-red-700 bg-red-50" : "border-transparent text-gray-700"}`}>Overview</button>
                  <button onClick={() => setModalTab("students")} className={`py-3 px-5 font-semibold border-b-2 ${modalTab === "students" ? "border-red-500 text-red-700 bg-red-50" : "border-transparent text-gray-700"}`}>Students</button>
                  <button onClick={() => setModalTab("performance")} className={`py-3 px-5 font-semibold border-b-2 ${modalTab === "performance" ? "border-red-500 text-red-700 bg-red-50" : "border-transparent text-gray-700"}`}>Performance</button>
                </div>

                {/* content */}
                <div className="px-8 py-6 overflow-y-auto flex-1">
                  {modalTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <div className="font-semibold text-gray-800 mb-2">Batch Information</div>
                        {!editMode || editTab !== "overview" ? (
                          <>
                            <div className="mb-1 text-sm"><strong>Batch ID:</strong> {activeBatch.batch_id || activeBatch.id}</div>
                            <div className="mb-1 text-sm"><strong>Batch Name:</strong> {activeBatch.name}</div>
                            <div className="mb-1 text-sm"><strong>Level:</strong> {activeBatch.current_level}</div>
                            {activeBatch.status === "Active" && (
                              <div className="mb-1 text-sm">
                                <strong>Semester:</strong> {activeBatch.current_semester}
                              </div>
                            )} 
                            <div className="mb-1 text-sm"><strong>Academic Year:</strong> {activeBatch.current_academic_year}</div>
                            <div className="mb-1 text-sm"><strong>Students:</strong> {getStudentsCount(activeBatch)}</div>
                            {activeBatch.status === "Active" &&(
                              <div className="mt-4 border-t pt-3">
                                <div className="font-semibold mb-2">Exam Status</div>

                                {activeExam ? (
                                  <div className="text-green-700 mb-2">
                                    Active Exam: {activeExam}
                                  </div>
                                ) : (
                                  <div className="text-gray-500 mb-2">
                                    No Active Exam
                                  </div>
                                )}

                                {role === "coe" && (
                                  <>
                                    <select
                                      className="border p-1 rounded text-sm"
                                      onChange={(e) => setSelectedExam(e.target.value)}
                                    >
                                      <option value="">Select Exam</option>
                                      <option value="MID1">MID1</option>
                                      <option value="MID2">MID2</option>
                                      <option value="MID3">MID3</option>
                                      <option value="ATS">ATS</option>
                                      <option value="EST">EST</option>
                                      <option value="INTERNAL">INTERNAL</option>
                                      <option value="EXTERNAL">EXTERNAL</option>
                                    </select>

                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => handleActivateExam(modalBatchState.batch_id)}
                                        className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                                      >
                                        Activate
                                      </button>

                                      {activeExam && (
                                        <button
                                          onClick={() => handleDeactivateExam(modalBatchState.batch_id)}
                                          className="bg-gray-600 text-white px-3 py-1 rounded text-xs"
                                        >
                                          Deactivate
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="mb-2"><label className="text-xs">Name</label><input className="border rounded px-2 py-1 w-full text-sm" value={activeBatch.name} onChange={(e) => setModalBatchState({...activeBatch, name: e.target.value})} /></div>
                            {/* more editable fields if you want */}
                          </>
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-gray-800 mb-2">Section / Start</div>
                        <div className="mb-1 text-sm"><strong>Start Year:</strong> {activeBatch.start_year}</div>
                        <div className="mb-1 text-sm"><strong>End Year:</strong> {activeBatch.end_year}</div>
                        <div className="mb-1 text-sm"><strong>Status:</strong> {activeBatch.status}</div>
                        <button className="mt-3 px-3 py-1 border border-red-300 rounded text-xs text-red-700" onClick={() => { setEditMode(true); setEditTab("overview"); }}><Pencil size={14} className="inline mr-1" /> Edit</button>
                      </div>
                    </div>
                  )}

                  {modalTab === "students" && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setSectionFile(e.target.files[0])}
                            className="text-xs"
                          />

                          <button
                            onClick={handleUploadSections}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
                          >
                            Upload Sections
                          </button>
                        </div>
                        {(() => {
                          const students = activeBatch.students || [];

                          // Count PUC students
                          const pucCount = students.filter(s => s.course === "PUC").length;

                          // Count ENGG by branch
                          const branchMap = {};
                          students.forEach(s => {
                            if (s.course === "ENGG") {
                              const br = s.branch?.trim() || "Unknown";
                              if (!branchMap[br]) branchMap[br] = 0;
                              branchMap[br]++;
                            }
                          });

                          const enggBranches = Object.entries(branchMap);

                          return (
                            <>
                              {/* PUC Batch */}
                              {activeBatch.current_level?.startsWith("PUC") && (
                                <div className="p-4 bg-red-50 border rounded mb-4 text-center">
                                  <div className="text-3xl font-bold text-red-700">{pucCount}</div>
                                  <div className="font-semibold">PUC Students</div>
                                </div>
                              )}

                              {/* Engineering Batch */}
                              {enggBranches.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  {enggBranches.map(([branch, count]) => (
                                    <div
                                      key={branch}
                                      className="bg-red-50 border border-red-200 rounded-lg p-4 text-center"
                                    >
                                      <div className="text-2xl font-bold text-red-700">{count}</div>
                                      <div className="font-semibold">{branch}</div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Total Students */}
                              <div className="p-3 bg-red-100 border border-red-200 rounded font-semibold flex justify-between">
                                <span>Total Enrollment</span>
                                <span className="text-red-700">{students.length} Students</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}


                  {modalTab === "performance" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <div className="font-semibold mb-3">Performance Overview</div>
                        <div className="flex justify-between mb-2 text-sm"><span>Mid Term Average</span><span className="font-bold text-green-700">{activeBatch.performance?.midTerm || 0}%</span></div>
                        <div className="flex justify-between mb-2 text-sm"><span>Assignment</span><span className="font-bold text-blue-700">{activeBatch.performance?.assignment || 0}%</span></div>
                        <div className="flex justify-between mb-2 text-sm"><span>Overall</span><span className="font-bold text-purple-700">{activeBatch.performance?.overall || 0}%</span></div>
                      </div>

                      <div>
                        <div className="font-semibold mb-3">Grade Distribution</div>
                        {(activeBatch.performance?.gradeDist || []).map((g, i) => (
                          <div key={i} className="flex justify-between mb-2 text-sm"><span>{g.name}</span><span className={`font-bold ${g.color || ""}`}>{g.value || 0}%</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t px-8 py-4 bg-gray-50 rounded-b-xl">
                  {editMode ? (
                    <>
                      <button onClick={handleCancelEdit} className="border px-6 py-2 rounded text-gray-700">Cancel</button>
                      <button onClick={handleSaveBatch} className="bg-red-600 text-white px-6 py-2 rounded"><Save size={16} className="inline mr-1" />Save Changes</button>
                    </>
                  ) : (
                    <button onClick={closeModal} className="border px-6 py-2 rounded text-gray-700">Close</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ------------------ ADD BATCH MODAL ------------------ */}
          {addModal && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">Create New PUC Batch</h2>

                <label className="text-sm font-medium">Batch ID (eg. R20)</label>
                <input className="border p-2 rounded w-full mb-3" value={newBatch.id || ""} onChange={e => setNewBatch({ ...newBatch, id: e.target.value })} />

                <label className="text-sm font-medium">Batch Name</label>
                <input className="border p-2 rounded w-full mb-3" value={newBatch.name || ""} onChange={e => setNewBatch({ ...newBatch, name: e.target.value })} />

                <label className="text-sm font-medium">Start Year (YYYY)</label>
                <input type="number" className="border p-2 rounded w-full mb-3"
                  value={newBatch.startYear || ""} onChange={e => {
                    const startYear = Number(e.target.value);
                    const endYear = startYear + 6;
                    const academicYear = `${startYear} - ${startYear + 1}`;
                    setNewBatch({ ...newBatch, startYear, endYear, academicYear });
                  }} />

                <label className="text-sm font-medium">End Year (Auto)</label>
                <input className="border p-2 rounded w-full mb-3 bg-gray-100" value={newBatch.endYear || ""} readOnly />

                <label className="text-sm font-medium">Academic Year (Auto)</label>
                <input className="border p-2 rounded w-full mb-3 bg-gray-100" value={newBatch.academicYear || ""} readOnly />

                <div className="mb-3">
                  <label className="text-sm font-medium">Upload Students CSV (required)</label>
                  <input type="file" accept=".csv,.txt" onChange={e => setAddFile(e.target.files[0])} className="w-full mt-2" />
                  <p className="text-xs text-gray-500 mt-1">CSV format: id,name,course (course will be saved as PUC)</p>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button className="px-4 py-2 border rounded" onClick={closeAddModal}>Cancel</button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleCreateBatch}>Create Batch</button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------ PROMOTE MODAL ------------------ */}
          {role === "coe" && promoteModal && promoteBatchIdx != null && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-3">Promote {batches[promoteBatchIdx]?.name}</h2>

                <p className="mb-3 text-sm text-gray-600">Current: {getCurrentLevel(batches[promoteBatchIdx])} — Academic Year: {batches[promoteBatchIdx]?.current_academic_year}</p>

                {getCurrentLevel(batches[promoteBatchIdx]) === "PUC2" && (
                  <div className="mb-3 p-3 border rounded bg-yellow-50">
                    <p className="text-sm text-yellow-900">Promotion to E1 requires CSV of student branches (id,name,branch). Please upload students CSV sorted by branch.</p>
                    <input type="file" accept=".csv,.txt" className="mt-2 w-full" onChange={e => setUploadedFile(e.target.files[0])} />
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button className="px-4 py-2 border rounded" onClick={closePromoteModal}>Cancel</button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={handlePromote}>Promote</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
