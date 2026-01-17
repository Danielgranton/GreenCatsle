import  { useEffect, useState ,useContext} from 'react'
import Scroll from './Scroll';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../context/StoreContext';
import { toast } from 'react-toastify';


const Navbar = ({setShowLogin, setCategory, category}) => {
  const navigate = useNavigate();
  const [isBouncing, setIsBouncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("header");
  const { cartItems, token, setToken, setSearchQuery, user, logout,filteredFoodList } = useContext(StoreContext);
  const [searchTerm, setSearchTerm] = useState("");
 
    
  const totalItems = Object.values(cartItems || {}).reduce((total, quantity) => total + quantity, 0);

  const handleBounce = () => {
    if(!isBouncing) {
       setIsBouncing(true);
       setTimeout(() => { 
        setIsBouncing(false);
       }, 300);
    }
  }

  const links = [
    {name: "Home", id: "header", icon: "fa-home"},
    {name: "Menu", id: "menu", icon: "fa-utensils"},
    {name: "Mobile", id: "mobile", icon: "fa-mobile-alt"},
    {name: "Contacts", id: "footer", icon: "fa-address-book"},
  ]


  useEffect(() => {
    const handleScroll = () => {
      links.forEach((link) => {
        const section = document.getElementById(link.id);
        if(section) {
          const top = section.getBoundingClientRect().top;
          if(top >= 0 && top <= 200) {
            setActiveSection(link.id);
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.dropdown-container') && !event.target.closest('.user-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleClickOut = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOut);
    return () => {
      document.removeEventListener('mousedown', handleClickOut);
    }
  } , [showDropdown]);

  const foodCategories = [
      { label: "🍎 Fruits", value: "Fruits" },
      { label: "🥕 Vegetables", value: "Vegetables" },
      { label: "🐟 Meat and Seafood", value: "Meat and Seafood" },
      { label: "🍬 Snacks and Sweets", value: "Snacks and Sweets" },
      { label: "🥤 Beverages", value: "Beverages" },
      { label: "🍞 Bakery", value: "Bakery" },
      { label: "🥜 Nuts and Dried Fruits", value: "Nuts and Dried Fruits" },
      { label: "📦 Packaged Foods", value: "Packaged Foods" },
      { label: "🥛 Dairy and Eggs", value: "Dairy and Eggs" },
      { label: "🧊 Frozen Foods", value: "Frozen Foods" },
      { label: "🌶️ Spices and Condiments", value: "Spices and Condiments" },
      { label: "👨‍🍳 Cooking Essentials", value: "Cooking Essentials" },
      { label: "🌱 Organic and Health Foods", value: "Organic and Health Foods" },
      { label: "🌾 Grains and Cereals", value: "Grains and Cereals" },
    ];

  return (
    <>
    <div className=' text-white flex items-center justify-between  mx-auto w-full h-16 px-10 sticky top-0 z-30 space-x-3 bg-black/30 backdrop-blur-sm '>
    
    <div className="relative dropdown-container">
  <button
    onClick={() => setShowDropdown(!showDropdown)}
    className="bg-green-100 px-3 py-2 rounded-lg text-green-500 hover:underline"
  >
    <i className="fas fa-list text-gray-900"></i>
  </button>

  {showDropdown && (
    <div   className={`absolute top-13 left-0 w-60 bg-white rounded-b-2xl shadow-2xl
  border border-gray-100 z-30 overflow-hidden
  transform transition-all duration-300 ease-out origin-top
  ${
    showDropdown
      ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
      : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
  }`}>
      <div className="px-4 py-3 font-bold text-gray-700 border-b">Food Categories</div>
      <ul className="max-h-96 overflow-y-auto scrollbar-hide">
        {[
          { label: "🍽️ All", value: "All" },
          ...foodCategories
        ].map(cat => (
          <li key={cat.value}>
            <button
              onClick={() => {
                setCategory(cat.value);
                setShowDropdown(false);
              }}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 font-medium transition-all duration-200 ${
                category === cat.value
                  ? "bg-yellow-300 text-yellow-700"
                  : "text-gray-700 hover:bg-yellow-200"
              }`}
            >
              {cat.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )}
</div>

    <Link to={"/"}>
 
    <h1
  className="
    text-2xl
    sm:text-3xl
    lg:text-4xl
    font-bold
    text-yellow-500
    font-poppins
    bg-green-900
    px-4 py-2
    rounded-lg
    inline-block
  "
>
  FoodNest
</h1>

    </Link>

    {/* Desktop Menu */}
    <div className='flex items-center gap-5 '>
       <ul className=' hidden md:flex space-x-8 mx-auto rounded-xl bg-gray-600 items-center justify-center px-6 py-2  font-poppins'>
        {links.map((link) => (
          <li key ={link.id}>
            <button onClick={() => {
              Scroll(link.id);
            }}

            className= {`transition duration-300 flex items-center ${activeSection === link.id? "underline text-yellow-500 font-bold" : "hover:underline hover:text-yellow-500 hover:scale-105"}`}


            >
              <i className={`fas ${link.icon} mr-2`}></i>
              {link.name}
            </button>
          </li>
        ))}
      </ul>

        <div className="relative w-full sm:w-72 md:w-70 lg:w-70 hidden lg:block">
          <input
            className="bg-gray-200 text-black font-bold placeholder:text-gray-400 rounded-lg outline-none py-2 pl-3 pr-10 w-full focus:ring-2 focus:ring-yellow-600 transition-all duration-300"
            placeholder="Search foodstuffs..."
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchQuery(e.target.value);
            }}

            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (filteredFoodList.length > 0) {
                  const firstFood = filteredFoodList[0];
                  navigate(`/food/${firstFood._id}`);
                } else {
                  toast.error("food out of stock");
                }
              }
            }}
          />
          <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"></i>
        </div>

    </div>

       {/* Search & Buttons (Hidden on mobile) */}
      <div className='hidden lg:flex   ml-2'> 
        
        <Link to={"/cart"}>
        <button onClick={handleBounce}
         className={`bg-yellow-400 rounded-xl px-5 py-1 flex items-center space-x-2 cursor-pointer transition-all duration-300 hover:bg-indigo-300 justify-center  ${isBouncing ? "transform scale-110 -translate-y-2":""}`}>

           <i className="fas fa-cart-shopping text-black"></i>
              <span className='text-black flex text-sm'>Cart ({totalItems})</span>
          
        </button>
        </Link> 

      </div>

      <div className ='hidden lg:flex   '>
          { 
        !token ?  
        <button 

        onClick={() => setShowLogin(true)} 
        className='bg-green-400 px-3 py-1 rounded-lg cursor-pointer hover:scale-110 duration-300 mb-3'>
          Login

        </button>  

        :
        
        <div className='relative dropdown-container'>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className='flex flex-col items-center  p-2 rounded-lg  hover:bg-white/20 transition-all duration-300'
          >
            <img className='h-10 w-10 rounded-full object-cover border-2 border-white/30 ' src="/images/logo.jpeg" alt="User Avatar" />
            <span className='text-gray-900 capitalize font-bold text-sm'> Hi,{user?.name || 'User'}</span>
          </button>

          {/* Desktop Dropdown Menu */}
          {isDropdownOpen && (
            <div className='user-dropdown fixed top-16 right-4 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-300 z-80'>
              <div className='bg-gradient-to-r from-blue-500 to-purple-600 p-4'>
                <div className='flex items-center gap-3'>
                  <img className='h-8 w-8 rounded-full object-cover border-2 border-white/30' src="/images/logo.jpeg" alt="User Avatar" />
                  <div className='text-white'>
                    <h3 className='font-bold text-lg'>{user?.name || 'User'}</h3>
                    <p className='text-sm opacity-90'>{user?.email || 'user@example.com'}</p>
                  </div>
                </div>
              </div>
              <div className='py-2'>
                <div className='px-4 py-2 border-b border-gray-100'>
                  <div className='flex items-center gap-2'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                    <span className='text-sm text-gray-600 capitalize'> Role : {user?.role || 'user'}</span>
                  </div>
                </div>
                <button className='w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200'>
                  <svg className='w-5 h-5 text-gray-500' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className='font-medium'>Settings</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  className='w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200'
                >
                  <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className='font-medium'>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      }
      </div>

      {/* Mobile Menu Button */}
     <button className=' lg:hidden text-2xl text-green-900 ' onClick={() => setSidebarOpen(!sidebarOpen)}>
       <i className='fas fa-bars'></i>
     </button>




    </div>

     {/* mobile search bar */}
    <div className="lg:hidden w-full px-4 py-3 bg-black/30 backdrop-blur-sm sticky top-16 z-20">
        <div className="relative w-full">
        <input
          type="text"
          placeholder="Search foodstuffs..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setSearchQuery(e.target.value)
          }}

          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (filteredFoodList.length > 0) {
                 const firstFood = filteredFoodList[0];
                 navigate(`/food/${firstFood._id}`);
              } else {
                 toast.error("Food out of stock");
              }
            }
          }}
          className="w-full bg-gray-200 text-black font-semibold
          placeholder:text-gray-400 rounded-xl outline-none
          py-3 pl-4 pr-12
          focus:ring-2 focus:ring-yellow-500 transition-all duration-300"
        />
        <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
      </div>
    </div>

    {/* Sidebar Backdrop */}

    {sidebarOpen && (
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      ></div>
    )}

    {/* Sidebar */}
    <div
      className={`fixed left-0 top-0 h-full w-80 bg-green-600/95 backdrop-blur-lg text-white z-50 transform transition-transform duration-500 ease-in-out lg:hidden shadow-2xl border-r border-white/20 overflow-scroll scrollbar-hide ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex justify-between items-center p-6 border-b border-white/20">
        <h2 className="text-2xl font-bold flex items-center">Menu</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-2xl hover:text-red-400 transition-colors hover:scale-110"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="p-6">

        <ul className="space-y-3 mb-8">
          {links.map((link) => (
            <li key={link.id}>
              <button
                onClick={() => {
                  Scroll(link.id);
                  setSidebarOpen(false);
                }}
                className={`block w-full text-left py-4 px-4 rounded-xl transition-all duration-300 font-medium flex items-center hover:scale-105 ${
                  activeSection === link.id
                    ? 'bg-yellow-500 text-black shadow-lg'
                    : 'hover:bg-white/20 hover:shadow-md'
                }`}
              >
                <i className={`fas ${link.icon} mr-2`}></i>
                {link.name}
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-4">
          <Link to="/cart">
            <button
              onClick={() => {
                handleBounce();
                setSidebarOpen(false);
              }}
              className="w-full bg-yellow-400 text-black py-4 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-yellow-500 transition-all duration-300 font-medium hover:scale-105 mb-4"
            >
              <i className="fas fa-cart-shopping"></i>
              <span>Cart ({totalItems})</span>
            </button>
          </Link>

          {!token ? (
            <button
              onClick={() => {
                setShowLogin(true);
                setSidebarOpen(false);
              }}
              className="w-full bg-white text-green-600 py-4 px-4 rounded-xl hover:bg-gray-100 transition-all duration-300 font-medium flex items-center justify-center hover:scale-105"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Login
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative dropdown-container">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div className="flex flex-col items-center space-x-4 p-4 bg-white/20 rounded-xl backdrop-blur-sm w-68">
                <div className='flex items-center space-x-4 mb-3 capitalize'>
                <img
                  className="h-13 w-13 rounded-full object-cover border-2 border-white/30"
                  src="/images/logo.jpeg"
                  alt="User Avatar"
                />

                <p className="font-bold text-lg"> Hi,{user?.name || 'User'}</p>
                </div>
                <div className='text-white'>
                  <p className="text-sm text-black font-semibold opacity-90">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
              </button>

               {/* Desktop Dropdown Menu */}
            {isDropdownOpen && (
              <div  className={`absolute top-full right-0 mt-2 w-60 bg-white rounded-b-2xl shadow-2xl 
  border border-gray-100 z-30 overflow-hidden
  transform transition-all duration-300 ease-out origin-top
  ${
    showDropdown
      ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
      : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
  }`}>
                <div className='bg-gradient-to-r from-blue-500 to-purple-600 p-4'>
                  <div className='flex items-center gap-3'>
                    <img className='h-8 w-8 rounded-full object-cover border-2 border-white/30' src="/images/logo.jpeg" alt="User Avatar" />
                    <div className='text-white'>
                      <h3 className='font-bold text-lg'>{user?.name || 'User'}</h3>
                      <p className='text-sm opacity-90'>{user?.email || 'user@example.com'}</p>
                    </div>
                  </div>
                </div>
                <div className='py-2'>
                  <div className='px-4 py-2 border-b border-gray-100'>
                    <div className='flex items-center gap-2'>
                      <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                      <span className='text-sm text-gray-600 capitalize'> Role : {user?.role || 'user'}</span>
                    </div>
                  </div>
                  <button className='w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200'>
                    <svg className='w-5 h-5 text-gray-500' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className='font-medium'>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsDropdownOpen(false);
                    }}
                    className='w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200'
                  >
                    <svg className='w-5 h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className='font-medium'>Logout</span>
                  </button>
                </div>
              </div>
            )}
              </div>
              <button
                onClick={() => {
                  logout();
                  setSidebarOpen(false);
                }}
                className="w-full bg-red-500 text-white py-4 px-4 rounded-xl hover:bg-red-600 transition-all duration-300 font-medium flex items-center justify-center hover:scale-105"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

export default Navbar
