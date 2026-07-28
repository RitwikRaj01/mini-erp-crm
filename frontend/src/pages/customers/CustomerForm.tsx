import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { Customer } from "../../types";

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "RETAIL",
  address: "",
  status: "LEAD",
  notes: "",
};

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get<Customer>(`/customers/${id}`).then((res) => {
      const c = res.data;
      setForm({
        name: c.name,
        mobile: c.mobile,
        email: c.email,
        businessName: c.businessName,
        gstNumber: c.gstNumber || "",
        customerType: c.customerType,
        address: c.address,
        status: c.status,
        notes: c.notes || "",
      });
    });
  }, [id, isEdit]);

  const handleChange = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, form);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post("/customers", form);
        navigate(`/customers/${res.data.id}`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>{isEdit ? "Edit Customer" : "Add Customer"}</h2>
      {error && <div className="error">{error}</div>}
      <form className="card-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={form.name} onChange={handleChange("name")} required />
        </label>
        <label>
          Mobile
          <input value={form.mobile} onChange={handleChange("mobile")} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={handleChange("email")} required />
        </label>
        <label>
          Business Name
          <input value={form.businessName} onChange={handleChange("businessName")} required />
        </label>
        <label>
          GST Number (optional)
          <input value={form.gstNumber} onChange={handleChange("gstNumber")} />
        </label>
        <label>
          Customer Type
          <select value={form.customerType} onChange={handleChange("customerType")}>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={handleChange("status")}>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label className="full-width">
          Address
          <textarea value={form.address} onChange={handleChange("address")} required />
        </label>
        <label className="full-width">
          Notes
          <textarea value={form.notes} onChange={handleChange("notes")} />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
