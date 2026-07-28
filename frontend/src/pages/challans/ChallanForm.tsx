import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { Challan, Customer, Product } from "../../types";

interface ItemRow {
  productId: string;
  quantity: string;
}

export default function ChallanForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ productId: "", quantity: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: Customer[] }>("/customers", { params: { limit: 100 } }).then((res) => setCustomers(res.data.data));
    api.get<{ data: Product[] }>("/products", { params: { limit: 100 } }).then((res) => setProducts(res.data.data));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get<Challan>(`/challans/${id}`).then((res) => {
      const c = res.data;
      setCustomerId(String(c.customerId));
      setItems(c.items.map((i) => ({ productId: String(i.productId), quantity: String(i.quantity) })));
    });
  }, [id, isEdit]);

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setItems((prev) => [...prev, { productId: "", quantity: "" }]);
  const removeRow = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const buildPayload = () => ({
    customerId: Number(customerId),
    items: items
      .filter((row) => row.productId && row.quantity)
      .map((row) => ({ productId: Number(row.productId), quantity: Number(row.quantity) })),
  });

  const handleSave = async (status?: "DRAFT" | "CONFIRMED") => {
    setError("");
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        const res = await api.put(`/challans/${id}`, payload);
        navigate(`/challans/${res.data.id}`);
      } else {
        const res = await api.post("/challans", { ...payload, status: status || "DRAFT" });
        navigate(`/challans/${res.data.id}`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSave(isEdit ? undefined : "DRAFT");
  };

  return (
    <div>
      <h2>{isEdit ? "Edit Challan" : "New Sales Challan"}</h2>
      {error && <div className="error">{error}</div>}
      <form className="card-form" onSubmit={handleSubmit}>
        <label className="full-width">
          Customer
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.businessName})
              </option>
            ))}
          </select>
        </label>

        <div className="full-width">
          <strong>Items</strong>
          {items.map((row, index) => (
            <div className="item-row" key={index}>
              <select
                value={row.productId}
                onChange={(e) => updateItem(index, "productId", e.target.value)}
                required
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) - stock: {p.currentStock}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                placeholder="Quantity"
                value={row.quantity}
                onChange={(e) => updateItem(index, "quantity", e.target.value)}
                required
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeRow(index)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addRow}>
            Add Item
          </button>
        </div>

        <div className="form-actions">
          {isEdit ? (
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Draft"}
            </button>
          ) : (
            <>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save as Draft"}
              </button>
              <button type="button" disabled={saving} onClick={() => handleSave("CONFIRMED")}>
                Save & Confirm
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
