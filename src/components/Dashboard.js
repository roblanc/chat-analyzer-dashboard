import React from 'react';

const Dashboard = () => {
  const chatTimespan = "June 11, 2025 to October 29, 2025";
  const totalMessages = 2961 + 2429 + 1164 + 705 + 294 + 4 + 3 + 1; // Sum of all messages

  return (
    <div className="dashboard-container">
      <h1>WhatsApp Chat Analysis Dashboard</h1>
      <div className="stats-summary">
        <div className="stat-box">
          <h2>Chat Timespan</h2>
          <p>{chatTimespan}</p>
        </div>
        <div className="stat-box">
          <h2>Total Messages</h2>
          <p>{totalMessages}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
