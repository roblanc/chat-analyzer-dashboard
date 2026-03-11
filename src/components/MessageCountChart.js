import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DEFAULT_LABELS = ['Unde', 'Marius Motoi', 'Baldo', 'Vasile', 'R'];
const DEFAULT_DATA = [2961, 2429, 1164, 705, 294];

const MessageCountChart = ({ stats }) => {
  const labels = stats?.labels?.authors?.length ? stats.labels.authors : DEFAULT_LABELS;
  const combinedAuthors = stats?.combined?.authors;
  const values = combinedAuthors ? labels.map((label) => combinedAuthors[label] || 0) : DEFAULT_DATA;

  const data = {
    labels,
    datasets: [
      {
        label: 'Total Mesaje',
        data: values,
        backgroundColor: 'rgba(99, 102, 241, 0.85)', // Indigo
        borderColor: '#6366F1',
        borderWidth: 1,
        borderRadius: 2,
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
          color: '#a1a1aa',
          font: { family: 'Inter', size: 12, weight: '500' }
        },
      },
      title: {
        display: true,
        text: 'Total Mesaje per Persoană',
        color: '#f8fafc',
        font: { family: 'Inter', size: 16, weight: '700' },
        padding: { bottom: 20 }
      },
    },
    scales: {
      x: {
        ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default MessageCountChart;
