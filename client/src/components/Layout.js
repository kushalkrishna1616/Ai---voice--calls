import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FiHome, FiPhone, FiFileText, FiBarChart2 } from 'react-icons/fi';
import { useSocket } from '../context/SocketContext';

const Layout = () => {
  const { connected } = useSocket();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">AI Call System</h1>
          <div className="flex items-center mt-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="ml-2 text-sm text-gray-600">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <nav className="mt-6">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 ${
                isActive ? 'bg-blue-50 border-r-4 border-blue-500' : ''
              }`
            }
          >
            <FiHome className="mr-3" />
            Dashboard
          </NavLink>

          <NavLink
            to="/calls"
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 ${
                isActive ? 'bg-blue-50 border-r-4 border-blue-500' : ''
              }`
            }
          >
            <FiPhone className="mr-3" />
            Calls
          </NavLink>

          <NavLink
            to="/transcripts"
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 ${
                isActive ? 'bg-blue-50 border-r-4 border-blue-500' : ''
              }`
            }
          >
            <FiFileText className="mr-3" />
            Transcripts
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 ${
                isActive ? 'bg-blue-50 border-r-4 border-blue-500' : ''
              }`
            }
          >
            <FiBarChart2 className="mr-3" />
            Analytics
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
