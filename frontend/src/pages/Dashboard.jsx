import { useEffect, useState } from "react";

function Dashboard() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/bus");
        const data = await res.json();
        setCount(data.passenger_count || 0);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Real-time Capacity</h2>
      <div className="passenger-count">{count}</div>
      <p style={{ color: 'var(--text-muted)' }}>Passengers onboard</p>
    </div>
  );
}

export default Dashboard;