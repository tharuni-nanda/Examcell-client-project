import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { api } from "../api";

export default function AcademicManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [level, setLevel] = useState("PUC1");
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);

    const [newSubject, setNewSubject] = useState({
        code: "",
        name: "",
        credits: 4,
        level: "PUC1",
        semester: "Sem1",
        branch: "",
        subject_type: "THEORY",
        exam_scheme: "MID20",
        });



  const [batch, setBatch] = useState("R27");
  const [semester, setSemester] = useState("Sem1");
  //--------------- for the batch filter ---------------
  const [batches, setBatches] = useState([]);
  const [branch, setBranch] = useState("");


  //------------------ for update or edit subject -----------------
  const [editModal, setEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

 //---------------------for elective students list uplode---------------
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingSubject, setUploadingSubject] = useState(null);

  // ---------------- FETCH SUBJECTS ----------------
  const fetchSubjects = async () => {
    try {
        setLoading(true);

        const params = {
        level,
        semester,
        batch,
        };

        if (!level.startsWith("PUC") && branch) {
        params.branch = branch;
        }

        const res = await api.get("/subjects/", { params });

        setSubjects(res.data);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  // Fetch batches only once
  useEffect(() => {
    fetchBatches();
    }, []);

    // Refetch subjects whenever filter changes
  useEffect(() => {
    fetchSubjects();
    }, [level, semester, branch, batch]);




  // ---------------- CREATE SUBJECT ----------------
  const handleCreateSubject = async () => {
    try {
      // Engineering must have branch selected in filter
      if (level.startsWith("E") && !branch) {
        alert("Please select branch from filter before creating subject.");
        return;
      }


      await api.post("/subjects/create/", {
        ...newSubject,
        level,
        semester,
        regulation: batch,
        branch: level.startsWith("E") ? branch : "",   // AUTO FROM FILTER
      });

      alert("Subject created successfully");
      setShowModal(false);

      setNewSubject({
        code: "",
        name: "",
        credits: 4,
        level,
        semester,
        branch: "",
        subject_type: "THEORY",
        exam_scheme: "MID20",
      });

      fetchSubjects();

    } catch (err) {
      alert(err.response?.data?.error || "Failed to create subject");
    }
  };


  // ---------------- INITIALIZE SEMESTER ----------------
  const initializeSemester = async () => {
    try {
      await api.post("/semester/setup/", {
        batch_id: batch,
        semester: semester,
      });

      alert("Semester initialized successfully");
    } catch (err) {
      alert(err.response?.data?.error || "Initialization failed");
    }
  };
  // ------------------- DELETE SUBJECTS -------------------
  const handleDeleteSubject = async (id) => {
  if (!window.confirm("Are you sure you want to delete this subject?"))
    return;

  try {
    await api.delete(`/subjects/delete/${id}/`);
    fetchSubjects();
  } catch (err) {
    alert("Delete failed");
  }
};
//-------------uplode api for students list for elective subject------------
  const handleElectiveUpload = async () => {
    if (!selectedFile) {
      alert("Please select a CSV file");
      return;
    }

    if (!uploadingSubject) {
      alert("No subject selected");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("subject", uploadingSubject.code);
      formData.append("batch", batch);
      formData.append("semester", semester);

      const res = await api.post("/electives/upload/", formData);

      alert(res.data.message);

      setUploadingSubject(null);
      setSelectedFile(null);
      fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed");
    }
  };
//------------- fetch batches from the db for the batch filter ---------------
const fetchBatches = async () => {
  try {
    const res = await api.get("/batches/");
    setBatches(res.data);
  } catch (err) {
    console.error("Failed to fetch batches");
  }
};



  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-800 font-sans">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg border shadow-sm">

          <h1 className="text-2xl font-bold mb-1">
            Academic Management
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Manage subjects and semester structure
          </p>

          {/* LEVEL SELECT */}
          <div className="flex gap-4 mb-6">
            {["PUC1", "PUC2", "E1", "E2", "E3", "E4"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`px-4 py-2 rounded border ${
                  level === lvl
                    ? "bg-red-50 border-red-500"
                    : "hover:bg-gray-50"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* ACTION BAR */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setShowModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              + Add Subject
            </button>

            <div className="flex items-end gap-6">

                {/* Batch Filter */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                    Batch
                    </label>
                    <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="border px-3 py-2 rounded"
                    >
                    {batches.map((b) => (
                        <option key={b.batch_id} value={b.batch_id}>
                        {b.batch_id} ({b.status})
                        </option>
                    ))}
                    </select>
                </div>

                {/* Branch Filter (Engineering Only) */}
                {!level.startsWith("PUC") && (
                    <div>
                    <label className="block text-sm font-medium mb-1">
                        Branch
                    </label>
                    <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="border px-3 py-2 rounded"
                    >
                        <option value="">SELECT BRANCH</option>
                        <option value="AIML">AIML</option>
                        <option value="CSE">CSE</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                        <option value="CHEM">CHEM</option>
                        <option value="MME">MME</option>
                    </select>
                    </div>
                )}

                {/* Semester Filter */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                    Semester
                    </label>
                    <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="border px-3 py-2 rounded"
                    >
                    <option value="Sem1">Semester 1</option>
                    <option value="Sem2">Semester 2</option>
                    </select>
                </div>

                {/* Initialize Button */}
                <div>
                    <button
                    onClick={initializeSemester}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                    Initialize Semester
                    </button>
                </div>

            </div>

          </div>

          {/* SUBJECT TABLE */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-center">Credits</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-center">Scheme</th>
                  <th className="p-3 text-center">Actions</th>

                </tr>
              </thead>
              <tbody>
                {subjects.map((sub) => (
                  <tr key={sub.code} className="border-b hover:bg-gray-50">
                    <td className="p-3">{sub.code}</td>
                    <td className="p-3">{sub.name}</td>
                    <td className="p-3 text-center">{sub.credits}</td>
                    <td className="p-3 text-center">
                      {sub.subject_type}

                    </td>
                    <td className="p-3 text-center">
                        {sub.subject_type === "THEORY" ? sub.exam_scheme : "-"}
                    </td>

                    <td className="p-3 text-center space-x-3">
                        <button
                            onClick={() => {
                            setEditingSubject(sub);
                            setEditModal(true);
                            }}
                             className="bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                            Edit
                        </button>

                        <button
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                        >
                            Delete
                        </button>
                        {/* selected elective subject students uplode */}
                        {sub.subject_type === "ELECTIVE" && (
                          <button
                            onClick={() => setUploadingSubject(sub)}
                            className="bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                          >
                            Upload Students
                          </button>
                        )}
                    </td>


                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="text-center text-sm text-gray-500 mt-4">
              Loading...
            </div>
          )}
          {subjects.length === 0 && !loading && (
            <div className="text-center text-red-500 mt-4">
                No subjects created for {batch} - {level} - {semester}.
            </div>
           )}



          {/* MODAL */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                <h2 className="text-lg font-bold mb-4">
                  Add New Subject
                </h2>

                <input
                  type="text"
                  placeholder="Subject Code"
                  value={newSubject.code}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, code: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded mb-3"
                />

                <input
                  type="text"
                  placeholder="Subject Name"
                  value={newSubject.name}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, name: e.target.value })
                  }
                  className="w-full border px-3 py-2 rounded mb-3"
                />

                <input
                  type="number"
                  placeholder="Credits"
                  value={newSubject.credits}
                  onChange={(e) =>
                    setNewSubject({
                      ...newSubject,
                      credits: e.target.value,
                    })
                  }
                  className="w-full border px-3 py-2 rounded mb-3"
                />
                
                <select
                    value={newSubject.subject_type}
                    onChange={(e) =>
                        setNewSubject({
                        ...newSubject,
                        subject_type: e.target.value,
                        })
                    }
                    className="w-full border px-3 py-2 rounded mb-3"
                    >
                    <option value="THEORY">Theory</option>
                    <option value="LAB">Lab</option>
                    <option value="PROJECT">Project</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="ELECTIVE">Elective</option>
                    </select>
                    {newSubject.subject_type === "THEORY" && (
                        <select
                            value={newSubject.exam_scheme}
                            onChange={(e) =>
                            setNewSubject({
                                ...newSubject,
                                exam_scheme: e.target.value,
                            })
                            }
                            className="w-full border px-3 py-2 rounded mb-3"
                        >
                            <option value="MID20">Mid 20 (Best of 2)</option>
                            <option value="MID15_AT4">Mid 15 + AT</option>
                            <option value="MID40">Mid 40 (Best of 2 Avg)</option>
                            <option value="ZERO_CREDIT">Zero Credit (Only EST 100)</option>
                        </select>
                        )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleCreateSubject}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          {editModal && editingSubject && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                <h2 className="text-lg font-bold mb-4">
                    Edit Subject
                </h2>

                <input
                    type="text"
                    value={editingSubject.name}
                    onChange={(e) =>
                    setEditingSubject({ ...editingSubject, name: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded mb-3"
                />

                <input
                    type="number"
                    value={editingSubject.credits}
                    onChange={(e) =>
                    setEditingSubject({ ...editingSubject, credits: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded mb-3"
                />

                <select
                    value={editingSubject.subject_type}
                    onChange={(e) =>
                    setEditingSubject({
                        ...editingSubject,
                        subject_type: e.target.value,
                        exam_scheme:
                        e.target.value === "THEORY"
                            ? editingSubject.exam_scheme
                            : "NONE",
                    })
                    }
                    className="w-full border px-3 py-2 rounded mb-3"
                >
                    <option value="THEORY">Theory</option>
                    <option value="LAB">Lab</option>
                    <option value="PROJECT">Project</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="ELECTIVE">Elective</option>
                </select>

                {/* Show Scheme only for THEORY */}
                {editingSubject.subject_type === "THEORY" && (
                    <select
                    value={editingSubject.exam_scheme}
                    onChange={(e) =>
                        setEditingSubject({
                        ...editingSubject,
                        exam_scheme: e.target.value,
                        })
                    }
                    className="w-full border px-3 py-2 rounded mb-3"
                    >
                    <option value="MID20">Mid 20 (Best of 2)</option>
                    <option value="MID15_AT4">Mid 15 + AT</option>
                    <option value="MID40">Mid 40 (Best of 2 Avg)</option>
                    <option value="ZERO_CREDIT">Zero Credit (Only EST 100)</option>
                    </select>
                )}

                <div className="flex justify-end gap-3">
                    <button
                    onClick={() => setEditModal(false)}
                    className="px-4 py-2 border rounded"
                    >
                    Cancel
                    </button>

                    <button
                    onClick={async () => {
                        try {
                        await api.patch(
                            `/subjects/update/${editingSubject.id}/`,
                            editingSubject
                        );

                        alert("Subject updated successfully");
                        setEditModal(false);
                        fetchSubjects();
                        } catch (err) {
                        alert("Update failed");
                        }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                    Save Changes
                    </button>
                </div>
                </div>
            </div>
        )}
          {/* uplode model for elective sub selected students */}
          {uploadingSubject && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                <h2 className="text-lg font-bold mb-4">
                  Upload Students for {uploadingSubject.name}
                </h2>

                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="mb-4"
                />

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setUploadingSubject(null);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleElectiveUpload}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
