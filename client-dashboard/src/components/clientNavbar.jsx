import React, { useState , useRef, useEffect} from "react";
import {
  Bell,
  User,
  Home,
  Utensils,
  ShoppingCart,
  Settings,
  LogOutIcon,
  ListOrdered
} from "lucide-react";
import { NavLink } from "react-router-dom";


const ClientNavbar = () => {
  const navItems = [
    { name: "Home", path: "/", icon: Home , className : "text-yellow-500" },
    { name: "Menu", path: "/menu", icon: Utensils , className : "text-blue-600" },
    { name: "Cart", path: "/cart", icon: ShoppingCart, className : "text-orange-600" },
    { name: "Notifications", path: "/notifications", icon: Bell, className : "text-amber-500" },
    { name: "Account",  icon: User, className : "text-green-300" },
  ];

  const dropItems = [
    { name : "Profile", path : "/profile", icon :User , className : "text-green-300" },
    { name : "Orders", path : "/orders", icon :ListOrdered, className : "text-orange-600" },
    { name : "Settings", path : "/settings", icon :Settings, className : "text-blue-600" },
    { name : "Logout", path : "/logout", icon :LogOutIcon, className : "text-amber-500" }
  
  ]

  const [dropDown, setDropDown] = useState(false);

  const dropDownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (dropDownRef.current && !dropDownRef.current.contains(event.target)) {
            setDropDown(false);
        }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, []);


  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm sticky top-0 z-50">
      
      {/* Logo */}
      <div className="flex items-center cursor-pointer">
        <img
          src="/systemlogo.png"
          alt="logo"
          className="h-60 -mt-25 -mb-22 w-auto object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-8">
        {navItems.map((item) => {
          const Icon = item.icon;

            if (item.name === "Account") {
            return (
                <div key={item.name} className="relative" ref={dropDownRef}>
                
                {/* Account Button */}
                <div
                    onClick={() => setDropDown(!dropDown)}
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer text-gray-600 hover:text-green-600"
                >
                    <Icon className={`h-5 w-5 ${item.className}`} />
                    <span>{item.name}</span>
                </div>

                {/* Dropdown */}
                {dropDown && (
                    <div className="absolute right-0 mt-6 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50">
                    
                    {dropItems.map((item) => {
                        const DropIcon = item.icon;

                        return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-green-600 transition"
                        >
                            <DropIcon className={`h-5 w-5 ${item.className}`} />
                            <span>{item.name}</span>
                        </NavLink>
                        );
                    })}

                    </div>
                )}
                </div>
            );
            }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 text-sm font-medium transition-all duration-200 relative
                ${
                  isActive
                    ? "text-green-600"
                    : "text-gray-500 hover:text-green-600"
                }`
              }
            >
              {/* Icon */}
              <Icon className={`h-5 w-5 font-bold ${item.className}`} />

              {/* Label */}
              <span>{item.name}</span>

              {/* Active underline */}
              {({ isActive }) => isActive && (
                <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-green-600 rounded-full" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
};

export default ClientNavbar;