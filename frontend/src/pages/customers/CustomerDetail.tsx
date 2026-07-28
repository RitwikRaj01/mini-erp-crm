import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { CustomerDetail as CustomerDetailType } from "../../types";

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  const [customer, setCustomer] = useState<CustomerDetailType | null>(null);
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .get<CustomerDetailType>(`/customers/${id}`)
      .then((res) => setCustomer(res.data))
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, [id]);

  const handleAddFollowUp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post(`/customers/${id}/followups`, {
        note,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      });
      setNote("");
      setFollowUpDate("");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!customer) {
    return error ? <div className="error">{error}</div> : <div>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>{customer.name}</h2>
        {canEdit && <Link to={`/customers/${id}/edit`} className="btn">Edit</Link>}
      </div>

      <div className="detail-grid">
        <div>
          <strong>Business</strong>
          <div>{customer.businessName}</div>
        </div>
        <div>
          <strong>Mobile</strong>
          <div>{customer.mobile}</div>
        </div>
        <div>
          <strong>Email</strong>
          <div>{customer.email}</div>
        </div>
        <div>
          <strong>GST Number</strong>
          <div>{customer.gstNumber || "-"}</div>
        </div>
        <div>
          <strong>Type</strong>
          <div>{customer.customerType}</div>
        </div>
        <div>
          <strong>Status</strong>
          <div>{customer.status}</div>
        </div>
        <div>
          <strong>Address</strong>
          <div>{customer.address}</div>
        </div>
        <div>
          <strong>Notes</strong>
          <div>{customer.notes || "-"}</div>
        </div>
      </div>

      <h3>Follow-ups</h3>
      {error && <div className="error">{error}</div>}

      {canEdit && (
        <form className="followup-form" onSubmit={handleAddFollowUp}>
          <textarea
            placeholder="Follow-up note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
          <button type="submit" disabled={saving}>
            Add Follow-up
          </button>
        </form>
      )}

      <ul className="followup-list">
        {customer.followUps.map((f) => (
          <li key={f.id}>
            <div className="followup-meta">
              {new Date(f.createdAt).toLocaleString()} by {f.createdBy.name}
              {f.followUpDate && ` · next follow-up: ${new Date(f.followUpDate).toLocaleDateString()}`}
            </div>
            <div>{f.note}</div>
          </li>
        ))}
        {customer.followUps.length === 0 && <li>No follow-ups yet.</li>}
      </ul>
    </div>
  );
}
