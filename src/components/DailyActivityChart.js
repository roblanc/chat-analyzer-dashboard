import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DailyActivityChart = () => {
  const data = {
    labels: ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'],
    datasets: [
      {
        label: 'Mesaje',
        data: [1215, 1258, 1051, 1377, 1107, 1331, 1467],
        backgroundColor: 'rgba(139, 92, 246, 0.85)', // Violet
        borderColor: '#8B5CF6',
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
        text: 'Activitate Zilnică',
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

export default DailyActivityChart;