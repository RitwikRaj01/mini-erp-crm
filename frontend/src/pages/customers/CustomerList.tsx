import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Customer, PaginatedResponse } from "../../types";

export default function CustomerList() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (search) params.search = search;
    if (status) params.status = status;

    api
      .get<PaginatedResponse<Customer>>("/customers", { params })
      .then((res) => {
        setCustomers(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [page, search, status]);

  return (
    <div>
      <div className="page-header">
        <h2>Customers</h2>
        {canEdit && <Link to="/customers/new" className="btn">Add Customer</Link>}
      </div>

      <div className="filters">
        <input
          placeholder="Search by name, mobile, email, business"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Business</th>
            <th>Mobile</th>
            <th>Type</th>
            <th>Status</th>
            <th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/customers/${c.id}`}>{c.name}</Link>
              </td>
              <td>{c.businessName}</td>
              <td>{c.mobile}</td>
              <td>{c.customerType}</td>
              <td>{c.status}</td>
              <td>{c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {meta.page} of {meta.totalPages || 1}
        </span>
        <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
