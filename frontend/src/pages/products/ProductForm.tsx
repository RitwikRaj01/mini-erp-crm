import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { Product } from "../../types";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlert: "0",
  location: "",
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get<Product>(`/products/${id}`).then((res) => {
      const p = res.data;
      setForm({
        name: p.name,
        sku: p.sku,
        category: p.category,
        unitPrice: p.unitPrice,
        currentStock: String(p.currentStock),
        minStockAlert: String(p.minStockAlert),
        location: p.location,
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
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        unitPrice: Number(form.unitPrice),
        location: form.location,
        ...(isEdit ? {} : { currentStock: Number(form.currentStock) }),
        minStockAlert: Number(form.minStockAlert),
      };

      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        navigate(`/products/${id}`);
      } else {
        const res = await api.post("/products", payload);
        navigate(`/products/${res.data.id}`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>{isEdit ? "Edit Product" : "Add Product"}</h2>
      {error && <div className="error">{error}</div>}
      <form className="card-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={form.name} onChange={handleChange("name")} required />
        </label>
        <label>
          SKU / Code
          <input value={form.sku} onChange={handleChange("sku")} required />
        </label>
        <label>
          Category
          <input value={form.category} onChange={handleChange("category")} required />
        </label>
        <label>
          Unit Price
          <input type="number" step="0.01" value={form.unitPrice} onChange={handleChange("unitPrice")} required />
        </label>
        {!isEdit && (
          <label>
            Initial Stock
            <input type="number" value={form.currentStock} onChange={handleChange("currentStock")} required />
          </label>
        )}
        <label>
          Minimum Stock Alert Quantity
          <input type="number" value={form.minStockAlert} onChange={handleChange("minStockAlert")} required />
        </label>
        <label>
          Location / Warehouse
          <input value={form.location} onChange={handleChange("location")} required />
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
