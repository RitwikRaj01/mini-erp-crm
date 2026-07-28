import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Challan, PaginatedResponse } from "../../types";

export default function ChallanList() {
  const { user } = useAuth();
  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";

  const [challans, setChallans] = useState<Challan[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (status) params.status = status;

    api
      .get<PaginatedResponse<Challan>>("/challans", { params })
      .then((res) => {
        setChallans(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [page, status]);

  return (
    <div>
      <div className="page-header">
        <h2>Sales Challans</h2>
        {canCreate && <Link to="/challans/new" className="btn">New Challan</Link>}
      </div>

      <div className="filters">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Challan #</th>
            <th>Customer</th>
            <th>Total Qty</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {challans.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
              </td>
              <td>{c.customerNameSnapshot}</td>
              <td>{c.totalQuantity}</td>
              <td>
                <span className={`status-badge status-${c.status.toLowerCase()}`}>{c.status}</span>
              </td>
              <td>{new Date(c.createdAt).toLocaleDateString()}</td>
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
