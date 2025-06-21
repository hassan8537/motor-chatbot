// import { useNavigate } from "react-router-dom";
// import {
//   LineChart,
//   Line,
//   CartesianGrid,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";
// import { FaChartLine, FaUserShield, FaRocket } from "react-icons/fa";
// import { useEffect, useState } from "react";

// const sampleData = [
//   { name: "Jan", value: 40 },
//   { name: "Feb", value: 60 },
//   { name: "Mar", value: 50 },
//   { name: "Apr", value: 80 },
//   { name: "May", value: 70 },
// ];

// export default function LandingPage() {
//   const navigate = useNavigate();

//   const handleContinue = () => {
//     navigate("/dashboard");
//   };
//     const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//  useEffect(() => {
//     fetch("https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/charts/queries/count?period=today")
//       .then((res) => res.json())
//       .then((json) => {
//         const chartData = json.data.breakdown.map((item, index) => ({
//           name: item.label || `Item ${index + 1}`,
//           value: item.count || 0,
//         }));
//         setData(chartData);
//       })
//       .catch((err) => console.error("Chart fetch error:", err))
//       .finally(() => setLoading(false));
//   }, []);


//   return (
//     <div className="app-container">
//     <div className="container-fluid min-vh-100 bg-dark text-white py-5 px-3 d-flex flex-column align-items-center">
//       <h1 className="display-4 fw-bold text-center mb-3">Welcome to Motor Chatbot</h1>
//       <p className="lead text-center text-white mb-5 w-75">
//         Lorem ipsum dolor sit amet consectetur adipisicing elit. Libero, modi unde! Laboriosam deleniti magnam molestias laudantium! Dolores, optio. Voluptatibus atque recusandae in libero, aliquid dolorem corporis unde deleniti iusto magnam!.
//       </p>

//       {/* Feature Highlights */}
//       <div className="row w-100 justify-content-center mb-5">
//         <div className="col-md-4 mb-4">
//       <div className="card bg-white text-black h-100 p-4 shadow">
//         <h5 className="text-center mb-3">Today's Query Breakdown</h5>
//         {loading ? (
//           <p className="text-center">Loading chart...</p>
//         ) : data.length === 0 ? (
//           <p className="text-center">No data available for today.</p>
//         ) : (
//          <ResponsiveContainer width="100%" height={200}>
//   <PieChart>
//     <Pie
//       data={data}
//       dataKey="value"
//       nameKey="name"
//       cx="50%"
//       cy="50%"
//       outerRadius={80}
//       fill="#17a2b8"
//       label
//     />
//     <Tooltip />
//   </PieChart>
// </ResponsiveContainer>
//         )}
//       </div>
//     </div>
//         <div className="col-md-4 mb-4">
//           <div className="card bg-white text-white h-100 text-center p-4 shadow">
//             <div className="justify-content-center d-flex">
//             <FaUserShield size={40} className="mb-3 text-info" />
//             </div>
//             <h5 className="card-title text-black">Secure Access</h5>
//             <p className="card-text text-black">Built-in roles and permissions for admin and users.</p>
//           </div>
//         </div>
//         <div className="col-md-4 mb-4">
//           <div className="card bg-white text-white h-100 text-center p-4 shadow">
//              <div className="justify-content-center d-flex">
//             <FaRocket size={40} className="mb-3 text-warning" />
//             </div>
//             <h5 className="card-title text-black">Fast Performance</h5>
//             <p className="card-text text-black">Optimized for speed and scalability across all devices.</p>
//           </div>
//         </div>
//       </div>

//       {/* Chart Section */}
//       {/* <div className="bg-secondary rounded p-4 mb-5 shadow w-100" style={{ maxWidth: "900px" }}>
//         <h4 className="text-center mb-3">Monthly Overview</h4>
//         <div style={{ width: "100%", height: "300px" }}>
//           <ResponsiveContainer width="100%" height="100%">
//             <LineChart data={sampleData}>
//               <Line type="monotone" dataKey="value" stroke="#0dcaf0" strokeWidth={2} />
//               <CartesianGrid stroke="#555" />
//               <XAxis dataKey="name" stroke="#fff" />
//               <YAxis stroke="#fff" />
//               <Tooltip />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>
//       </div> */}

//       {/* CTA Button */}
//       <button
//         onClick={handleContinue}
//         className="btn btn-light btn-lg text-white px-5 rounded-5 border-none" style={{backgroundColor:"#10a37f"}}
//       >
//         Continue to Dashboard
//       </button>
//     </div>
//     </div>
//   );
// }

import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FaUserShield, FaRocket } from "react-icons/fa";
import { useEffect, useState } from "react";
import OpenAIUsageChart from "../components/OpenAIUsageChart";

export default function LandingPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const getCurrentDate = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const currentDate = getCurrentDate();
  useEffect(() => {
    fetch(
      "https://ikfwwxazldg56elyxpxqutixd40kiecd.lambda-url.us-east-1.on.aws/api/v1/charts/queries/count?period=today"
    )
      .then((res) => res.json())
      .then((json) => {
        const breakdown = json?.data?.breakdown || [];
        if (breakdown.length === 0) {
          // Fallback to mock data if no actual data is returned
          const mockData = [
            { name: "Search", value: 10 },
            { name: "Booking", value: 5 },
            { name: "Feedback", value: 8 },
          ];
          setData(mockData);
        } else {
          const chartData = breakdown.map((item, index) => ({
            name: item.label || `Item ${index + 1}`,
            value: item.count || 0,
          }));
          setData(chartData);
        }
      })
      .catch((err) => {
        console.error("Chart fetch error:", err);
        // Optional: Set mock data on error
        setData([
          { name: "Search", value: 10 },
          { name: "Booking", value: 5 },
          { name: "Feedback", value: 8 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleContinue = () => {
    navigate("/dashboard");
  };

  return (
    <div className="app-container">
      <div className="container-fluid min-vh-100 bg-dark text-white py-5 px-3 d-flex flex-column align-items-center">
        <h1 className="display-4 fw-bold text-center mb-3">
          Welcome to Motor Chatbot
        </h1>
        <p className="lead text-center text-white w-75">
A motor is a device that converts electrical energy into mechanical energy, based on the principle that a current-carrying conductor in a magnetic field experiences a mechanical force. This force drives the motor's rotation. Motors are crucial in various applications, including industrial machinery, electric trains, and household appliances, due to their speed/torque characteristics.        </p>

        {/* Feature Highlights */}
        <div className="row w-100 justify-content-center mb-2">
          {/* Chart Card */}
          <div className="col-md-4 mb-4">
            <div className="card bg-white text-black h-100 p-4 shadow">
              <h5 className="text-center mb-3">Today's Query Breakdown</h5>
              {loading ? (
                <p className="text-center">Loading chart...</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data}
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
            </div>
          </div>

          {/* Feature Cards */}
          <div className="col-md-4 mb-4">
            <OpenAIUsageChart startDate={currentDate} endDate={currentDate} />          </div>
          {/* <div className="col-md-4 mb-4">
            <div className="card bg-white text-white h-100 text-center p-4 shadow">
              <div className="justify-content-center d-flex">
                <FaRocket size={40} className="mb-3 text-warning" />
              </div>
              <h5 className="card-title text-black">Fast Performance</h5>
              <p className="card-text text-black">
                Optimized for speed and scalability across all devices.
              </p>
            </div>
          </div> */}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          className="btn btn-light btn-lg text-white px-5 rounded-5 border-none"
          style={{ backgroundColor: "#10a37f" }}
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}
