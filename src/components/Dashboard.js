import React from 'react';

const Dashboard = () => {
  const chatTimespan = "11 iunie 2025 până în 29 octombrie 2025";
  const totalMessages = 2961 + 2429 + 1164 + 705 + 294 + 4 + 3 + 1; // Sum of all messages

  return (
    <div className="dashboard-container">
      ░█████████           ░██              ░██                          ░██░██
░██     ░██                           ░██                                
░██     ░██ ░██░████ ░██ ░███████  ░████████  ░███████  ░████████  ░██░██
░█████████  ░███     ░██░██    ░██    ░██    ░██    ░██ ░██    ░██ ░██░██
░██         ░██      ░██░█████████    ░██    ░█████████ ░██    ░██ ░██░██
░██         ░██      ░██░██           ░██    ░██    ░██ ░██    ░██ ░██░██
░██         ░██      ░██ ░███████      ░████  ░███████  ░██    ░██ ░██░██
      <div className="stats-summary">
        <div className="stat-box">
          <h2>Perioada Chat</h2>
          <p>{chatTimespan}</p>
        </div>
        <div className="stat-box">
          <h2>Total Mesaje</h2>
          <p>{totalMessages}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
