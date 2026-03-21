import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_REVIEWS = "http://localhost:4000/api/reviews";

const safeNumber = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const badge = (rating) => {
  const r = safeNumber(rating);
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";
  if (r >= 4.5) return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (r >= 3.5) return `${base} bg-amber-50 text-amber-800 border-amber-200`;
  return `${base} bg-red-50 text-red-700 border-red-200`;
};

const Stars = ({ value }) => {
  const v = Math.max(0, Math.min(5, Math.round(safeNumber(value))));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < v ? "text-amber-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
};

export default function AdminReviewsPage() {
  const [rating, setRating] = React.useState("all");
  const [limit, setLimit] = React.useState(50);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [reviews, setReviews] = React.useState([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Missing token. Please log in again.");

      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      if (rating !== "all") qs.set("rating", rating);

      const resp = await fetch(`${API_REVIEWS}/my-business?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || "Failed to load reviews");
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [limit, rating]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const parts = [
        r._id,
        r.comment,
        r.orderId?._id,
        r.userId?.name,
        r.userId?.email,
        r.rating,
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return parts.includes(q);
    });
  }, [query, reviews]);

  const summary = React.useMemo(() => {
    const total = filtered.length;
    if (total === 0) return { total: 0, avg: 0, withComment: 0 };
    let sum = 0;
    let withComment = 0;
    for (const r of filtered) {
      sum += safeNumber(r.rating);
      if (String(r.comment || "").trim()) withComment += 1;
    }
    return { total, avg: sum / total, withComment };
  }, [filtered]);

  const ratingDist = React.useMemo(() => {
    const buckets = new Map([
      [5, 0],
      [4, 0],
      [3, 0],
      [2, 0],
      [1, 0],
    ]);
    for (const r of filtered) {
      const v = Math.round(safeNumber(r.rating));
      if (buckets.has(v)) buckets.set(v, buckets.get(v) + 1);
    }
    return [5, 4, 3, 2, 1].map((k) => ({ rating: `${k}★`, count: buckets.get(k) || 0 }));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
          <p className="text-sm text-gray-600 mt-1">Customer feedback and rating distribution.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Average rating</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xl font-semibold text-gray-900">{summary.total ? summary.avg.toFixed(1) : "—"}</div>
            {summary.total ? <span className={badge(summary.avg)}>{summary.avg.toFixed(1)}</span> : null}
          </div>
          <div className="mt-2">
            <Stars value={summary.avg} />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Total reviews</div>
          <div className="text-xl font-semibold text-gray-900 mt-2">{summary.total}</div>
          <div className="text-xs text-gray-500 mt-2">{summary.withComment} with comments</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500">Filters</div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">All</option>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Limit</label>
              <select
                value={String(limit)}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 px-4 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="comment, customer name, order id…"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-900">Rating distribution</div>
          <div className="text-xs text-gray-500 mt-1">Counts by star rating.</div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">Latest reviews</div>
            <div className="text-xs text-gray-500 mt-1">Click refresh after new orders are reviewed.</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Comment</th>
                  <th className="px-4 py-3">Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-gray-600">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-gray-600">
                      No reviews found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r._id} className="align-top">
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{r.userId?.name || "—"}</div>
                        <div className="text-xs text-gray-500">{r.userId?.email || "—"}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{safeNumber(r.rating).toFixed(1)}</div>
                        <div className="mt-1">
                          <Stars value={r.rating} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        <div className="max-w-[520px] line-clamp-2">{r.comment || "—"}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        <div className="max-w-[220px] truncate" title={r.orderId?._id || ""}>
                          {r.orderId?._id ? String(r.orderId._id) : String(r.orderId || "—")}
                        </div>
                        {r.orderId?.status ? (
                          <div className="text-xs text-gray-500 mt-1">Status: {r.orderId.status}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

