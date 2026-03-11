import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const HourlyActivityChart = () => {
  const data = {
    labels: ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
    datasets: [
      {
        label: 'Mesaje',
        data: [221, 75, 26, 4, 0, 0, 14, 23, 93, 419, 569, 451, 369, 602, 651, 647, 747, 0, 487, 458, 795, 776, 541, 297],
        backgroundColor: 'rgba(236, 72, 153, 0.85)', // Pink
        borderColor: '#EC4899',
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
        text: 'Activitate Orară',
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

export default HourlyActivityChart;