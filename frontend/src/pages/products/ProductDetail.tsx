import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { MovementType, Product, StockMovement } from "../../types";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("IN");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get<Product>(`/products/${id}`).then((res) => setProduct(res.data));
    api
      .get<{ data: StockMovement[] }>(`/products/${id}/stock-movements`)
      .then((res) => setMovements(res.data.data))
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, [id]);

  const handleAddMovement = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post(`/products/${id}/stock-movements`, {
        quantity: Number(quantity),
        movementType,
        reason,
      });
      setQuantity("");
      setReason("");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!product) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>{product.name}</h2>
        {canEdit && <Link to={`/products/${id}/edit`} className="btn">Edit</Link>}
      </div>

      <div className="detail-grid">
        <div>
          <strong>SKU</strong>
          <div>{product.sku}</div>
        </div>
        <div>
          <strong>Category</strong>
          <div>{product.category}</div>
        </div>
        <div>
          <strong>Unit Price</strong>
          <div>{product.unitPrice}</div>
        </div>
        <div>
          <strong>Current Stock</strong>
          <div>{product.currentStock}</div>
        </div>
        <div>
          <strong>Minimum Stock Alert</strong>
          <div>{product.minStockAlert}</div>
        </div>
        <div>
          <strong>Location</strong>
          <div>{product.location}</div>
        </div>
      </div>

      <h3>Stock Movements</h3>
      {error && <div className="error">{error}</div>}

      {canEdit && (
        <form className="movement-form" onSubmit={handleAddMovement}>
          <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)}>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <input
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <button type="submit" disabled={saving}>
            Record Movement
          </button>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Reason</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id}>
              <td>{new Date(m.createdAt).toLocaleString()}</td>
              <td>{m.movementType}</td>
              <td>{m.quantity}</td>
              <td>{m.reason}</td>
              <td>{m.createdBy.name}</td>
            </tr>
          ))}
          {movements.length === 0 && (
            <tr>
              <td colSpan={5}>No stock movements yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
