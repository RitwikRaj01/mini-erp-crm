import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Challan } from "../../types";

export default function ChallanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "SALES";

  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const load = () => {
    api
      .get<Challan>(`/challans/${id}`)
      .then((res) => setChallan(res.data))
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, [id]);

  const handleConfirm = async () => {
    setError("");
    setWorking(true);
    try {
      await api.post(`/challans/${id}/confirm`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = async () => {
    setError("");
    setWorking(true);
    try {
      await api.post(`/challans/${id}/cancel`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  if (!challan) {
    return error ? <div className="error">{error}</div> : <div>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>
          {challan.challanNumber}{" "}
          <span className={`status-badge status-${challan.status.toLowerCase()}`}>{challan.status}</span>
        </h2>
        {canManage && challan.status === "DRAFT" && (
          <div className="button-group">
            <Link to={`/challans/${id}/edit`} className="btn">Edit</Link>
            <button onClick={handleConfirm} disabled={working}>
              Confirm
            </button>
            <button onClick={handleCancel} disabled={working}>
              Cancel
            </button>
          </div>
        )}
        {canManage && challan.status === "CONFIRMED" && (
          <button onClick={handleCancel} disabled={working}>
            Cancel
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="detail-grid">
        <div>
          <strong>Customer</strong>
          <div>{challan.customerNameSnapshot}</div>
        </div>
        <div>
          <strong>Total Quantity</strong>
          <div>{challan.totalQuantity}</div>
        </div>
        <div>
          <strong>Created</strong>
          <div>{new Date(challan.createdAt).toLocaleString()}</div>
        </div>
      </div>

      <h3>Items</h3>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Unit Price</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.sku}</td>
              <td>{item.unitPrice}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
