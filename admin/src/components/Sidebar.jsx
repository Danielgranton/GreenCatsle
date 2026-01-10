import axios from "axios";
import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

const Sidebar = ({ open, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loggedInUsers, setLoggedInUsers] = useState([]);
  const [totalLoggedIn, setTotalLoggedIn] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {

      const token = localStorage.getItem("adminToken");

      if (!token) {
        // No token, redirect to login
        return toast.error("Not authorized .please login");
      }
      try {
        const response = await axios.get("http://localhost:4000/api/users/users",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        if (response.data.success) {
          setUsers(response.data.users);
          setLoggedInUsers(response.data.loggedInUsers);
          setTotalLoggedIn(response.data.totalLoggedIn);
        }
      } catch (error) {
        if(error.response && error.response.status === 401)  {
            toast.error("Unauthorized .please login");
        } else{
          toast.error("Failed to fetch users");
        }
      }
    };

    if (open) {
      fetchUsers();
    }
  }, [open]);

  const deleteUser = async (id) => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      // No token, redirect to login
      return toast.error("Not authorized .please login");
    }

    try {
      const res = await axios.delete(`http://localhost:4000/api/users/delete/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }});

      if (res.data.success) {

        //remove deleted user from users array
        setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
        setLoggedInUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));

        toast.success(res.data.message);

      } else {

        toast.error(res.data.message);
      }
    } catch (error) {
      
      toast.error("Error deleting user:", error);
    }
  }

  // middleware
 
  const activeUsers = users.filter((user) => user.status === "active");
  const inactiveUsers = users.filter((user) => user.status === "inactive");

  return (
    <div
      className={`
        fixed top-19 bottom-0 right-0 
        bg-gray-800 text-white
        transition-all duration-300
        ${open ? "w-70" : "w-0"}
        overflow-hidden shadow-xl
        z-40
      `}
    >
      <div className="flex justify-between items-center space-x-25 fixed  rounded-xl bg-green-400 bg-opacity-10 mt-3 backdrop-blur-md p-4 shadow-md ml-2">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 transition-colors"
          title="Close Sidebar"
        >
          <i className="fa-solid fa-times text-xl text-red-400 bg-white p-1 rounded-full"></i>
        </button>
      </div>

      <div className="p-6 h-full overflow-y-auto scroll-smooth ">
        

        <div className="flex flex-col gap-6 mt-15">
          <NavLink
            to="/admin/add"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg
              ${isActive ? "bg-green-700" : "hover:bg-green-600"}`
            }
          >
            <i className="fa-solid fa-plus text-green-300"></i>
            <span>Add Item</span>
          </NavLink>

          <NavLink
            to="/admin/list"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg
              ${isActive ? "bg-blue-700" : "hover:bg-blue-600"}`
            }
          >
            <i className="fa-regular fa-rectangle-list text-blue-300"></i>
            <span>List Items</span>
          </NavLink>

          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg
              ${isActive ? "bg-yellow-700" : "hover:bg-yellow-600"}`
            }
          >
            <i className="fa-solid fa-cart-shopping text-yellow-300"></i>
            <span>Orders</span>
          </NavLink>

          <NavLink
            to="/admin/stats"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg
              ${isActive ? "bg-purple-700" : "hover:bg-purple-600"}`
            }
          >
            <i className="fa-solid fa-chart-bar text-purple-300"></i>
            <span>Stats</span>
          </NavLink>
        </div>

        <div className="mt-8 ">
          <h3 className="text-lg font-semibold mb-4">
            Users ({users.length})
          </h3>
           <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 bg-green-700 rounded-lg">
              <i className="fa-solid fa-user-check text-green-300"></i>
              <span>Active: {activeUsers.length}</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 bg-red-700 rounded-lg">
              <i className="fa-solid fa-user-times text-red-300"></i>
              <span>Inactive: {inactiveUsers.length}</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 bg-blue-700 rounded-lg">
              <i className="fa-solid fa-user-clock text-blue-300"></i>
              <span>Logged In: {totalLoggedIn}</span>
            </div>
          </div>

          {users.length > 0 && (
            <div className="mb-4 mt-6">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
                {users.map((user, index) => (
                  <div
                    key={index}
                    className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors duration-200 border border-gray-600 hover:border-gray-500 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            user.status === "active"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        >
                          <i className="fa-solid fa-user text-white text-sm"></i>
                        </div>
                        <div className="text-center mt-1">
                          <div className="font-semibold text-white text-xs truncate w-20">
                            {user.name}
                          </div>
                          <div className="text-gray-300 text-xs truncate w-20">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === "active"
                                ? "bg-green-600 text-green-100"
                                : "bg-red-600 text-red-100"
                            }`}
                          >
                            {user.status}
                          </div>

                          <button
                            onClick={() => deleteUser(user._id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-600 hover:bg-opacity-20 transition-all duration-200 p-1 rounded-md"
                            title="Delete User"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

         

          {/* Enhanced Logged In Users Section */}
          {loggedInUsers.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <h4 className="text-sm font-semibold text-green-300">
                  Online Users ({totalLoggedIn})
                </h4>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {loggedInUsers.map((user, index) => (
                  <div
                    key={index}
                    className="group bg-gradient-to-r from-gray-700 to-gray-600 hover:from-green-800 hover:to-green-700 p-3 rounded-lg transition-all duration-300 border border-gray-600 hover:border-green-500 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar with Online Indicator */}
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Online Status Dot */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-gray-800 rounded-full animate-pulse">
                          <div className="w-full h-full bg-green-400 rounded-full animate-ping opacity-75"></div>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <h5 className="text-sm font-medium text-white truncate group-hover:text-green-200 transition-colors">
                              {user.name}
                            </h5>
                            <p className="text-xs text-gray-300 truncate group-hover:text-gray-200 transition-colors">
                              {user.email}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1 ml-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-600 text-green-100 shadow-sm">
                              <div className="w-1.5 h-1.5 bg-green-300 rounded-full mr-1 animate-pulse"></div>
                              Online
                            </span>
                          </div>
                        </div>

                        {/* Last Activity (if available) */}
                        {user.lastLogin && (
                          <div className="mt-1 text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                            Active {new Date(user.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hover Details (Expandable on Click) */}
                    <div className="mt-2 pt-2 border-t border-gray-600 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-20 transition-all duration-300 overflow-hidden">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Role: {user.role || 'User'}</span>
                        <span className="text-green-400">● Active Now</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-400">{totalLoggedIn}</div>
                    <div className="text-xs text-gray-400">Online</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-400">{users.length - totalLoggedIn}</div>
                    <div className="text-xs text-gray-400">Offline</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State for No Online Users */}
          {loggedInUsers.length === 0 && users.length > 0 && (
            <div className="mt-6 text-center py-6">
              <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-users text-gray-400 text-lg"></i>
              </div>
              <h4 className="text-sm font-medium text-gray-400 mb-1">No Users Online</h4>
              <p className="text-xs text-gray-500">All users are currently offline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
