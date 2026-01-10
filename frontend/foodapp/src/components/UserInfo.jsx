import { useContext } from "react";
import { StoreContext } from "../context/StoreContext";
import { useNavigate } from "react-router-dom";

const UserInfo = ({ setShowSidebar }) => {

  const { user, setToken } = useContext(StoreContext);
  const navigate = useNavigate();

  return (
    <div
      onClick={() => setShowSidebar(false)}
      className="fixed inset-0 flex justify-end bg-black/40 backdrop-blur-sm z-50"
    >
      {/* Sidebar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          h-full bg-white shadow-xl flex flex-col gap-6 
          animate-slideLeft 
          w-full sm:w-80 md:w-96   /* wider on bigger screens */
          p-4 sm:p-6
        "
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            User Info
          </h2>

          <button
            onClick={() => setShowSidebar(false)}
            className="text-gray-500 hover:text-black text-2xl sm:text-3xl"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* User Avatar */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <img
            src="/src/assets/logo.jpeg"
            alt="user"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-yellow-500 object-cover"
          />

          <p className="text-gray-800 font-semibold text-sm sm:text-base">
            {user?.name || "No Name"}
          </p>
          <p className="text-gray-500 text-xs sm:text-sm">
            {user?.email || "No Email"}
          </p>
        </div>

        {/* Menu */}
        <ul className="flex flex-col gap-5 text-gray-700 text-base sm:text-lg mt-4">
          <li className="flex items-center gap-3 cursor-pointer hover:text-yellow-600">
            <i className="fa-solid fa-bag-shopping"></i>
            Orders
          </li>

          <hr className="border-gray-300" />

          <li
            className="flex items-center gap-3 cursor-pointer text-red-600 hover:text-red-700"
            onClick={() => {
              setToken("");
              localStorage.removeItem("token");
              navigate("/");
              setShowSidebar(false);
            }}
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Logout
          </li>
        </ul>
      </div>
    </div>
  );
};

export default UserInfo;
