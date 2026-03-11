import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DEFAULT_LABELS = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
const DEFAULT_DATA = [221, 75, 26, 4, 0, 0, 14, 23, 93, 419, 569, 451, 369, 602, 651, 647, 747, 0, 487, 458, 795, 776, 541, 297];

const HourlyActivityChart = ({ stats }) => {
  const labels = stats?.labels?.hours?.length ? stats.labels.hours : DEFAULT_LABELS;
  const hourCounts = stats?.incremental?.hourCounts;
  const values = Array.isArray(hourCounts) && hourCounts.length === 24 ? hourCounts : DEFAULT_DATA;
  const titleText = stats?.incremental ? 'Activitate Orară (Mesaje Noi)' : 'Activitate Orară';

  const data = {
    labels,
    datasets: [
      {
        label: 'Mesaje',
        data: values,
        backgroundColor: 'rgba(236, 72, 153, 0.85)', // Pink
        borderColor: '#EC4899',
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
        text: titleText,
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

export default HourlyActivityChart;
