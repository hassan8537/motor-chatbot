import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";

function OpenAIUsageChart({ startDate, endDate }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!startDate || !endDate) return;

    setLoading(true); // Reset loading state on date change

    fetch(
      `https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/charts/openai/usage?startDate=${startDate}&endDate=${endDate}`
    )
      .then((res) => res.json())
      .then((json) => {
        const raw = json?.data || [];
        if (raw.length === 0) {
          setData([
            { time: "12:00", count: 2 },
            { time: "13:00", count: 4 },
            { time: "14:00", count: 6 },
          ]);
        } else {
          const chartData = raw.map((item) => ({
            time: item.time,
            count: item.count,
          }));
          setData(chartData);
        }
      })
      .catch((err) => {
        console.error("Line chart error:", err);
        setData([
          { time: "12:00", count: 2 },
          { time: "13:00", count: 4 },
          { time: "14:00", count: 6 },
        ]);
      })
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <div className="card bg-white text-black h-100 p-4 shadow">
      <h5 className="text-center mb-3">
        OpenAI Usage ({startDate} to {endDate})
      </h5>
      {loading ? (
        <p className="text-center">Loading usage data...</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#10a37f"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default OpenAIUsageChart;
