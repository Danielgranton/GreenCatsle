import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./login/AdminLogin";
import AdminLayout from "./dashboard/AdminLayout";
import List from "./dashboard/List";
import Add from "./dashboard/Add";
import Order from "./dashboard/Order";
import Stats from "./dashboard/Stats";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public login route */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Protected admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Nested routes render inside Outlet */}
        <Route index element={<Navigate to="list" replace />} />
        <Route path="list" element={<List />} />
        <Route path="add" element={<Add />} />
        <Route path="add/:id" element={<Add />} />
        <Route path="orders" element={<Order />} />
        <Route path="stats" element={<Stats />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default App;
