import React from 'react';

function CeoDashboard() {
  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold">CEO Panel</h1>
        </div>
        <nav className="mt-10">
          <ul>
            <li className="px-6 py-3 hover:bg-gray-200">
              <a href="/dashboard" className="text-gray-700">Dashboard</a>
            </li>
            <li className="px-6 py-3 hover:bg-gray-200">
              <a href="/years" className="text-gray-700">Engineering Years</a>
            </li>
            <li className="px-6 py-3 hover:bg-gray-200">
              <a href="/branches" className="text-gray-700">Branches</a>
            </li>
            <li className="px-6 py-3 hover:bg-gray-200">
              <a href="/sections" className="text-gray-700">Sections</a>
            </li>
            <li className="px-6 py-3 hover:bg-gray-200">
              <a href="/student-marks" className="text-gray-700">Student Marks</a>
            </li>
            <li className="px-6 py-3 hover:bg-gray-200 mt-10">
              <a href="/logout" className="text-red-500">Logout</a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Header */}
        <header className="w-full bg-white shadow-sm p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          <div className="flex items-center">
            <span className="mr-4 text-gray-600">Hello, CEO</span>
            {/* profile pic */}
            <div className="w-10 h-10 rounded-full bg-gray-300"></div>
          </div>
        </header>

        {/* Content area */}
        <main className="p-6 flex-1">
          {/* Example: Grid of cards with quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white shadow rounded-lg p-5">
              <h3 className="text-lg font-medium text-gray-600">Total Students</h3>
              <p className="text-3xl font-bold text-gray-800">1,234</p>
            </div>
            <div className="bg-white shadow rounded-lg p-5">
              <h3 className="text-lg font-medium text-gray-600">Branches</h3>
              <p className="text-3xl font-bold text-gray-800">3</p>
            </div>
            <div className="bg-white shadow rounded-lg p-5">
              <h3 className="text-lg font-medium text-gray-600">Sections</h3>
              <p className="text-3xl font-bold text-gray-800">4</p>
            </div>
            {/* More cards as needed */}
          </div>

          {/* Example table of student marks */}
          <div className="mt-10 bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full leading-normal">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Section</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">E1 Marks</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">E2 Marks</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Average</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  <td className="px-5 py-5 border-b border-gray-200">John Doe</td>
                  <td className="px-5 py-5 border-b border-gray-200">CSE</td>
                  <td className="px-5 py-5 border-b border-gray-200">A</td>
                  <td className="px-5 py-5 border-b border-gray-200">78</td>
                  <td className="px-5 py-5 border-b border-gray-200">85</td>
                  <td className="px-5 py-5 border-b border-gray-200">81.5</td>
                </tr>
                {/* More rows */}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

export default CeoDashboard;
