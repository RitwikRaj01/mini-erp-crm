import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PaginatedResponse, Product } from "../../types";

export default function ProductList() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const params: Record<string, string | number | boolean> = { page, limit: 20 };
    if (search) params.search = search;
    if (lowStock) params.lowStock = true;

    api
      .get<PaginatedResponse<Product>>("/products", { params })
      .then((res) => {
        setProducts(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [page, search, lowStock]);

  return (
    <div>
      <div className="page-header">
        <h2>Products</h2>
        {canEdit && <Link to="/products/new" className="btn">Add Product</Link>}
      </div>

      <div className="filters">
        <input
          placeholder="Search by name or SKU"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => {
              setLowStock(e.target.checked);
              setPage(1);
            }}
          />
          Low stock only
        </label>
      </div>

      {error && <div className="error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Unit Price</th>
            <th>Stock</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={p.currentStock <= p.minStockAlert ? "low-stock" : ""}>
              <td>
                <Link to={`/products/${p.id}`}>{p.name}</Link>
              </td>
              <td>{p.sku}</td>
              <td>{p.category}</td>
              <td>{p.unitPrice}</td>
              <td>{p.currentStock}</td>
              <td>{p.location}</td>
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
