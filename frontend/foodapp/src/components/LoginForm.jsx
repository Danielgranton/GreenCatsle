import { motion, AnimatePresence } from "framer-motion";
import { StoreContext } from "../context/StoreContext";
import axios from "axios";
import { toast } from "react-toastify";
import {jwtDecode} from "jwt-decode";
import { useContext, useState } from "react";


const LoginForm = ({ setShowLogin }) => {
  const { url, setToken, setUser } = useContext(StoreContext);

  const [currentState, setCurrentState] = useState("Login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const onLogin = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const endpoint = currentState === "Login" ? "/api/users/login" : "/api/users/register";
      const response = await axios.post(url + endpoint, data);

      if (response && response.data && response.data.success) {
        const { token } = response.data;

        // Save token in localStorage
        localStorage.setItem("token", token);

        // Decode token immediately to set user state
        const decoded = jwtDecode(token);
        setUser({
          id: decoded.id,
          role: decoded.role,
          name: decoded.name,
          email: decoded.email
        });

        // Update token state in StoreContext
        setToken(token);

        setShowLogin(false);
        toast.success(response.data.message);
      } else {
        toast.error(response.data?.message || "something went wrong, please try again");
      }
    } catch (error) {
      console.log(error);
      toast.error("Server error, please try again later");
    } finally {
      setLoading(false);
    }
  };

  const hadleKeyDown = (e) => {
    if(e.key === "Enter"){
      onLogin(e);
    }
  }

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        key="overlay"
        className="fixed inset-0 bg-black/50 backdrop-blur-md z-40"
        onClick={() => setShowLogin(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        className="fixed z-50 w-[95%] sm:w-[80%] md:w-[60%] lg:w-[45%] xl:w-[40%] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-tl-4xl rounded-br-4xl shadow-2xl max-h-[95vh] overflow-hidden overflow-scroll scrollbar-hide rounded-tr-lg rounded-bl-lg"
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <motion.h1
              className="text-center font-bold text-3xl md:text-4xl mb-2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {currentState}
            </motion.h1>
            <motion.p
              className="text-center text-green-100 text-sm md:text-base"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {currentState === "Login" ? "Welcome back! Please sign in to continue" : "Join us today! Create your account"}
            </motion.p>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8"></div>
        </div>

        {/* Close Button */}
        <motion.button
          onClick={() => setShowLogin(false)}
          className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        {/* Form */}
        <motion.form
          onSubmit={onLogin}
          className="p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Inputs */}
          <div className="space-y-4">
            {currentState === "Sign up" && (
              <motion.div
                className="relative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  name="name"
                  onChange={handleChange}
                  value={data.name}
                  type="text"
                  placeholder="Your full name"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl outline-none focus:border-green-500 focus:bg-white transition-all duration-300 text-gray-900 placeholder-gray-500 font-medium"
                  required
                />
              </motion.div>
            )}

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: currentState === "Sign up" ? 0.6 : 0.5 }}
            >
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                name="email"
                onChange={handleChange}
                value={data.email}
                type="email"
                placeholder="Email address"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl outline-none focus:border-green-500 focus:bg-white transition-all duration-300 text-gray-900 placeholder-gray-500 font-medium"
                required
              />
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: currentState === "Sign up" ? 0.7 : 0.6 }}
            >
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <input
                name="password"
                onChange={handleChange}
                onKeyDown={hadleKeyDown}
                value={data.password}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl outline-none focus:border-green-500 focus:bg-white transition-all duration-300 text-gray-900 placeholder-gray-500 font-medium"
                required
              />
               <button
                  type='button'
                  className='absolute inset-y-0 right-0 pr-3 flex items-center'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className='h-5 w-5 text-gray-400 hover:text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21' />
                    </svg>
                  ) : (
                    <svg className='h-5 w-5 text-gray-400 hover:text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                    </svg>
                  )}
                </button>
              </div>
            </motion.div>
          </div>

          {/* Terms for Sign Up */}
          {currentState === "Sign up" && (
            <motion.div
              className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                required
              />
              <p className="text-sm text-gray-600 leading-relaxed">
                I agree to the <span className="text-green-600 font-semibold cursor-pointer hover:underline">Terms of Service</span> and <span className="text-green-600 font-semibold cursor-pointer hover:underline">Privacy Policy</span>
              </p>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            }`}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: currentState === "Sign up" ? 0.9 : 0.7 }}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {currentState === "Sign up" ? "Creating account..." : "Signing in..."}
              </div>
            ) : (
              currentState === "Sign up" ? "Create Account" : "Sign In"
            )}
          </motion.button>

          {/* Switch between Login/Signup */}
          <motion.div
            className="text-center pt-4 border-t border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            <p className="text-gray-600">
              {currentState === "Login"
                ? "Don't have an account? "
                : "Already have an account? "}
              <motion.button
                type="button"
                onClick={() => setCurrentState(currentState === "Login" ? "Sign up" : "Login")}
                className="font-semibold text-green-600 hover:text-green-700 transition-colors duration-300 hover:underline"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {currentState === "Login" ? "Sign up" : "Sign in"}
              </motion.button>
            </p>
          </motion.div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoginForm;
