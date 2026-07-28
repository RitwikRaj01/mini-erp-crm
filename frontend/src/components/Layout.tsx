import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">Mini ERP + CRM</div>
        <nav>
          <NavLink to="/customers">Customers</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/challans">Challans</NavLink>
        </nav>
        <div className="user-info">
          <span>
            {user?.name} ({user?.role})
          </span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
