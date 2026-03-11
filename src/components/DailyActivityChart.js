import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DEFAULT_LABELS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const DEFAULT_DATA = [1085, 1072, 909, 1164, 910, 1138, 1283];

const DailyActivityChart = ({ stats }) => {
  const labels = stats?.labels?.weekdays?.length ? stats.labels.weekdays : DEFAULT_LABELS;
  const weekdayCounts = stats?.combined?.weekdayCounts;
  const values = Array.isArray(weekdayCounts) && weekdayCounts.length === 7 ? weekdayCounts : DEFAULT_DATA;
  const titleText = stats?.combined ? 'Activitate Zilnică (Legacy + Noi)' : 'Activitate Zilnică';

  const data = {
    labels,
    datasets: [
      {
        label: 'Mesaje',
        data: values,
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
        text: titleText,
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
