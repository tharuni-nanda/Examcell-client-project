import React, { useState, useRef } from "react";
import {jsPDF} from "jspdf";
import html2canvas from "html2canvas";
import Sidebar from "../components/Sidebar";

export default function CertificatePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [step, setStep] = useState(1);
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("PUC");
  const [student, setStudent] = useState(null);
  const [image, setImage] = useState(null);
  const [certType, setCertType] = useState("");
  const [loading, setLoading] = useState(false);

  const certificateRef = useRef();

  const fetchStudent = async () => {
    setLoading(true);
    setTimeout(() => {
      setStudent({
        name: "Anjali",
        id: studentId,
        branch: "CSE",
      });
      setLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleNext = () => setStep(3);
  const handleBack = () => setStep(step - 1);

  const handleImageUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(e.target.files[0]);
  };

  const generatePDF = async () => {
    const canvas = await html2canvas(certificateRef.current);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();

    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * width) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, pdfHeight);
    pdf.save(`${certType}.pdf`);
  };

  const certOptions = [
    {
      key: "CMM",
      title: "Consolidated Marks Memo",
      desc: "Complete marks statement for all semesters",
    },
    {
      key: "PC",
      title: "Provisional Certificate",
      desc: "Temporary certificate with photo",
    },
    {
      key: "OD",
      title: "Original Degree",
      desc: "Official university degree certificate",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">

      {/* SIDEBAR */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* MAIN CONTENT */}
      <div className="flex-1 p-6 overflow-y-auto">

        {/* STEP INDICATOR */}
        <div className="flex items-center gap-6 mb-6 text-[#991b1b] font-medium">
          {["Search Student", "Certificate Type", "Preview"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full 
                ${step === i + 1 ? "bg-[#991b1b] text-white" : "bg-gray-300"}`}
              >
                {i + 1}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="max-w-6xl">

          {/* BACK BUTTON */}
          {step > 1 && (
            <button onClick={handleBack} className="mb-4 text-[#991b1b] font-medium">
              ← Back
            </button>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="bg-white p-6 rounded-xl shadow">

              <h2 className="font-semibold mb-4 text-[#991b1b]">
                Select Course Type
              </h2>

              <div className="flex gap-6 mb-4">
                <label>
                  <input
                    type="radio"
                    value="PUC"
                    checked={type === "PUC"}
                    onChange={(e) => setType(e.target.value)}
                  />{" "}
                  PUC
                </label>

                <label>
                  <input
                    type="radio"
                    value="Engineering"
                    checked={type === "Engineering"}
                    onChange={(e) => setType(e.target.value)}
                  />{" "}
                  BTech
                </label>
              </div>

              <input
                type="text"
                placeholder="Enter Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="border p-2 w-full mb-4"
              />

              <button
                onClick={fetchStudent}
                className="bg-[#991b1b] text-white px-4 py-2 rounded"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="bg-white p-6 rounded-xl shadow">

              <div className="bg-gray-100 p-4 rounded mb-6">
                <p><b>Name:</b> {student.name}</p>
                <p><b>ID:</b> {student.id}</p>
                <p><b>Branch:</b> {student.branch}</p>
                <p><b>Type:</b> {type}</p>
              </div>

              <h2 className="font-bold mb-4 text-[#991b1b]">
                Choose Certificate Type
              </h2>

              <div className="grid md:grid-cols-3 gap-4">
                {certOptions.map((cert) => {
                  const disabled = type === "PUC" && cert.key !== "CMM";

                  return (
                    <div
                      key={cert.key}
                      onClick={() => !disabled && setCertType(cert.key)}
                      className={`p-4 border rounded-xl cursor-pointer transition
                      ${certType === cert.key ? "border-[#991b1b] bg-red-50" : ""}
                      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"}
                      `}
                    >
                      <h3 className="font-semibold">{cert.title}</h3>
                      <p className="text-sm text-gray-600">{cert.desc}</p>
                    </div>
                  );
                })}
              </div>

              {certType === "PC" && (
                <input type="file" onChange={handleImageUpload} className="mt-4" />
              )}

              <button
                onClick={handleNext}
                disabled={!certType}
                className="bg-[#991b1b] text-white px-4 py-2 rounded mt-6 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

          {/* STEP 3 - PROFESSIONAL CERTIFICATE */}
          {step === 3 && (
            <div className="bg-white p-6 rounded-xl shadow">

              <div className="flex justify-between mb-4">
                <h2 className="font-bold text-[#991b1b]">Certificate Preview</h2>
                <button
                  onClick={generatePDF}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Download
                </button>
              </div>
              <div
                ref={certificateRef}
                className="relative w-[800px] h-[1100px] mx-auto bg-white"
                >

                {/* TEMPLATE BACKGROUND */}
                <img
                    src={
                    certType === "CMM"
                        ? "/templates/cmm.jpg"
                        : certType === "OD"
                        ? "/templates/od.jpg"
                        : "/templates/pc.jpg"
                    }
                    alt="template"
                    className="absolute top-0 left-0 w-full h-full object-cover"
                />

                {/* ===== DYNAMIC DATA OVERLAY ===== */}

                {/* NAME */}
                <p className="absolute top-[250px] left-[180px] text-[18px] font-semibold">
                    {student.name}
                </p>

                {/* ID */}
                <p className="absolute top-[280px] left-[500px] text-[16px]">
                    {student.id}
                </p>

                {/* BRANCH */}
                <p className="absolute top-[310px] left-[180px] text-[16px]">
                    {student.branch}
                </p>
                {/* ================= TABLE FOR CMM ================= */}
                {certType === "CMM" && (
                <table className="absolute top-[430px] left-[90px] w-[620px] text-[11px]">

                    <thead>
                    <tr className="text-left font-semibold">
                        <th className="py-1">Code</th>
                        <th className="py-1">Subject Title</th>
                        <th className="py-1 text-center">Cr.</th>
                        <th className="py-1 text-center">Gr.</th>
                    </tr>
                    </thead>

                    <tbody>
                    <tr>
                        <td>MA1101</td>
                        <td>Engineering Mathematics-I</td>
                        <td className="text-center">4</td>
                        <td className="text-center">Ex</td>
                    </tr>

                    <tr>
                        <td>PH1101</td>
                        <td>Engineering Physics</td>
                        <td className="text-center">3</td>
                        <td className="text-center">A</td>
                    </tr>
                    </tbody>

                </table>
                )}

                {/* DATE */}
                <p className="absolute bottom-[90px] left-[150px] text-[14px]">
                    {new Date().toLocaleDateString()}
                </p>

                {/* PHOTO (for PC) */}
                {certType === "PC" && image && (
                    <img
                    src={image}
                    className="absolute top-[180px] right-[120px] w-[100px] h-[120px]"
                    />
                )}

                </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}