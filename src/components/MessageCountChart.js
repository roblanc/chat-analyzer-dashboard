import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MessageCountChart = () => {
  const data = {
    labels: ['Unde', 'Marius Motoi', 'Baldo', 'Vasile', 'R'],
    datasets: [
      {
        label: 'Total Mesaje',
        data: [2961, 2429, 1164, 705, 294],
        backgroundColor: 'rgba(99, 102, 241, 0.85)', // Indigo
        borderColor: '#6366F1',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#F8FAFC',
          font: { family: 'Inter', size: 13 }
        },
      },
      title: {
        display: true,
        text: 'Total Mesaje per Persoană',
        color: '#F8FAFC',
        font: { family: 'Inter', size: 16, weight: '600' }
      },
    },
    scales: {
      x: {
        ticks: { color: '#94A3B8', font: { family: 'Inter' } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y: {
        ticks: { color: '#94A3B8', font: { family: 'Inter' } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default MessageCountChart;
