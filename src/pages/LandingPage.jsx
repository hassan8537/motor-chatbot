import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export default function LandingPage() {
  const navigate = useNavigate();
  const token = Cookies.get("token");

  const [queryData, setQueryData] = useState([]);
  const [tokenData, setTokenData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalSearches, setTotalSearches] = useState(0);
  const [estimatedUsd, setEstimatedUsd] = useState(0);

  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });

  const formatDate = (dateStr) => {
    const [yyyy, mm, dd] = dateStr.split("-");
    return `${dd}-${mm}-${yyyy}`;
  };

  useEffect(() => {
    const fetchQueryStats = async () => {
      try {
        const queryRes = await fetch(
          `https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/charts/queries/count?startDate=${formatDate(
            filters.startDate
          )}&endDate=${formatDate(filters.endDate)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const queryJson = await queryRes.json();
        setTotalSearches(queryJson?.data?.total);
        setQueryData(queryJson?.data?.breakdown || []);
      } catch (err) {
        console.error("Query fetch error:", err);
        setQueryData([]);
      }
    };

    const fetchTokenStats = async () => {
      try {
        const usageRes = await fetch(
          `https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/charts/openai/usage?startDate=${formatDate(
            filters.startDate
          )}&endDate=${formatDate(filters.endDate)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const usageJson = await usageRes.json();

        setTotalTokens(usageJson.data.totalTokens || 0);
        setEstimatedUsd(usageJson.data.estimatedUsd || 0);

        setTokenData([
          {
            date: usageJson.data.startDate,
            tokens: usageJson.data.totalTokens,
            usd: usageJson.data.estimatedUsd
          }
        ]);
      } catch (err) {
        console.error("Usage fetch error:", err);
        setTokenData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQueryStats();
    fetchTokenStats();
  }, [filters]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleContinue = () => {
    navigate("/dashboard");
  };

  return (
    <div className="app-container">
      <div className="container-fluid min-vh-100 bg-dark text-white py-5 px-3 d-flex flex-column align-items-center">
        <h1 className="display-4 fw-bold text-center mb-3">
          Welcome to <span style={{ color: "#10a37f" }}>Motor Chatbot</span>
        </h1>

        {/* Filters */}
        <div className="d-flex gap-3 mb-4">
          <input
            type="date"
            name="startDate"
            className="form-control rounded-4 shadow-sm border-0"
            value={filters.startDate}
            onChange={handleDateChange}
            style={{
              maxWidth: "200px",
              fontSize: "15px",
              background: "linear-gradient(135deg, #10a37f, #0d8b6f)",
              color: "white"
            }}
          />
          <input
            type="date"
            name="endDate"
            className="form-control rounded-4 shadow-sm border-0"
            value={filters.endDate}
            onChange={handleDateChange}
            style={{
              maxWidth: "200px",
              fontSize: "15px",
              background: "linear-gradient(135deg, #10a37f, #0d8b6f)",
              color: "white"
            }}
          />
        </div>

        <div className="row w-100 justify-content-center mb-2">
          {/* Pie Chart */}
          <div className="col-md-4 mb-4">
            <div className="card bg-white text-black h-100 p-4 shadow rounded-4">
              <h5 className="text-center mb-4 fw-bold text-primary-emphasis">
                📊 Query Breakdown
              </h5>
              {loading ? (
                <p className="text-center">Loading chart...</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={queryData.map((item) => ({
                        name: item.date,
                        value: item.totalQueries
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#17a2b8"
                      label
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}

              <div className="text-center mt-3">
                <p className="mb-0">
                  <span className="text-muted">Total Searches:</span>{" "}
                  <span className="fw-semibold text-success">
                    {totalSearches}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="col-md-6 mb-4">
            <div className="card bg-white text-black h-100 p-4 shadow rounded-4">
              <h5 className="text-center mb-4 fw-bold text-primary-emphasis">
                📈 OpenAI Token Usage
              </h5>
              {loading ? (
                <p className="text-center">Loading chart...</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={tokenData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="tokens"
                      stroke="#10a37f"
                      name="Tokens"
                    />
                    <Line
                      type="monotone"
                      dataKey="usd"
                      stroke="#ff7300"
                      name="Estimated USD"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              <div className="text-center mt-3">
                <p className="mb-1">
                  <span className="text-muted">Total Tokens Used:</span>{" "}
                  <span className="fw-semibold text-success">
                    {totalTokens}
                  </span>
                </p>
                <p className="mb-0">
                  <span className="text-muted">Estimated Cost:</span>{" "}
                  <span className="fw-semibold text-warning">
                    ${estimatedUsd.toFixed(4)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          className="btn btn-lg px-5 py-3 fw-semibold rounded-pill border-0 shadow"
          style={{
            background: "linear-gradient(135deg, #10a37f, #0d8b6f)",
            color: "white",
            transition: "all 0.3s ease-in-out"
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 4px 20px rgba(16, 163, 127, 0.4)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          🚀 Continue to Dashboard
        </button>
      </div>
    </div>
  );
}
