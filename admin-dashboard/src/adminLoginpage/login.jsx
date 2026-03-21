import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const Login = () => {
  void motion;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState('');

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Please enter a valid email';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateForm();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setSubmitError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Login failed");

      if (data.user.role === "superadmin" || data.user.role === "admin") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role);
        localStorage.setItem("businessId", data.user.businessId || "");

        if (data.user.role === "superadmin") navigate("/superadmin");
        else navigate("/admin");
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("businessId");
        navigate("/apply", { state: { email } });
      }
    } catch (error) {
      console.error(error);
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full max-w-6xl">
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 mb-6 sticky top-4 z-20 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <img
              src="/systemlogo.png"
              alt="logo"
              className="w-40 h-40 md:w-60 md:h-60 object-contain -mt-30 -mb-27"
            />
            <div>
              <h1 className="text-base font-semibold text-gray-900">Admin Panel</h1>
              <p className="text-xs text-green-500 font-bold">Sign in to manage your business operations</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-200 text-emerald-700 border border-emerald-200">
            Admin / SuperAdmin
          </span>
        </motion.div>

        {/* Main */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Left info */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Welcome</h2>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    Manage orders, menu items, payouts, and customer feedback in one secure dashboard.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold text-emerald-800">Important:</span> Only approved admin accounts can
                    access this panel. If you don&apos;t have access, apply for approval.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900">Key features</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Real-time business analytics
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Secure data management
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Multi-level access control
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Right form */}
          <motion.div variants={itemVariants}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-400">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold text-lg">Sign in</h2>
                  <span className="text-xs font-semibold bg-white/30 text-white border border-white/30 rounded-full px-3 py-1">
                    Admin / SuperAdmin
                  </span>
                </div>
              </div>

              <div className="p-6">
                {submitError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail
                          className={`w-5 h-5 ${touched.email && errors.email ? 'text-red-400' : 'text-gray-400'}`}
                        />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => handleBlur('email')}
                        autoComplete="email"
                        className={`w-full h-11 pl-12 pr-4 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          touched.email && errors.email
                            ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                            : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
                        }`}
                        placeholder="admin@example.com"
                      />
                    </div>
                    {touched.email && errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {errors.email}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock
                          className={`w-5 h-5 ${touched.password && errors.password ? 'text-red-400' : 'text-gray-400'}`}
                        />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => handleBlur('password')}
                        autoComplete="current-password"
                        className={`w-full h-11 pl-12 pr-12 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          touched.password && errors.password
                            ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                            : 'border-gray-300 focus:ring-emerald-200 focus:border-emerald-500'
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-500 hover:text-blue-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {touched.password && errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {errors.password}
                      </motion.p>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </motion.button>

                  <div className="pt-3 border-t border-gray-400 flex items-center justify-between">
                

                       <p className='text-sm text-blue-500'>Don&apos;t have business admin access?</p>
                      <button
                        type="button"
                        onClick={() => navigate('/apply')}
                        className="text-black hover:text-emerald-800 font-semibold text-sm flex items-center gap-1 bg-green-200 hover:bg-green-300 py-2 px-4 rounded-xl transition-all"
                      >
                        Apply for approval
                      </button>
                     
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
