import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function Sidebar() {
  const { isAuthed } = useAuth();

  if (!isAuthed) return null;

  const linkClass = ({ isActive }) =>
    isActive ? "sidebar-link sidebar-link--active" : "sidebar-link";

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/browse" className={linkClass}>Browse</NavLink>
        <NavLink to="/my-listings" className={linkClass}>My Listings</NavLink>
        <NavLink to="/owner/applications" className={linkClass}>Applications</NavLink>
        <NavLink to="/create" className={linkClass}>New Listing</NavLink>
      </nav>
    </aside>
  );
}