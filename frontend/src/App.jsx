import { Routes, Route, Navigate } from "react-router-dom";

// user
import ProtectedRoute from "./components/ProtectedRoute";
import UserLayout from "./layout/UserLayout";
import Landing from "./pages/user/Landing";
import Login from "./pages/user/Login";
import Signup from "./pages/user/Signup";
import ResetPassword from "./pages/user/ResetPassword";
import Profile from "./pages/user/Profile";

// admin
import AdminLayout from "./layout/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminHouses from "./pages/admin/AdminHouses";
import AdminReports from "./pages/admin/AdminReports";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminHouseDetails from "./pages/admin/AdminHouseDetails";

// houses
import Browse from "./pages/house/Browse";
import CreateListing from "./pages/house/CreateListing";
import EditListing from "./pages/house/EditListing";
import HouseDetails from "./pages/house/HouseDetails";
import MyListings from "./pages/house/MyListings";

import SmokeTest from "./pages/SmokeTest";
import OwnerApplications from "./pages/house/OwnerApplications";


export default function App() {
  return (
    <Routes>
      {/* ===================== USER AREA ===================== */}
      <Route element={<UserLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/__smoke" element={<SmokeTest />} />


        {/* protected user pages */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* house pages (BELONG TO USER) */}
        <Route path="/browse" element={<Browse />} />
        <Route path="/houses/:id" element={<HouseDetails />} />

        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateListing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit/:id"
          element={
            <ProtectedRoute>
              <EditListing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-listings"
          element={
            <ProtectedRoute>
              <MyListings />
            </ProtectedRoute>
          }
        />
      </Route>
          <Route path="/owner/applications" element={<OwnerApplications />} />

      {/* ===================== ADMIN AREA ===================== */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverview />} />
        <Route path="houses" element={<AdminHouses />} />
        <Route path="houses/:id" element={<AdminHouseDetails />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      {/* ===================== FALLBACK ===================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
