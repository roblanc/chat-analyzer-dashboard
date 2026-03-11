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
        text: 'Total Mesaje per Persoană (Legacy + Noi)',
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
