import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DailyActivityChart = () => {
  const data = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [
      {
        label: 'Messages',
        data: [1215, 1258, 1051, 1377, 1107, 1331, 1467],
        backgroundColor: '#E0FFFF', // Light Cyan
        borderColor: '#FFFFFF', // White
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#FFFFFF', // White legend text
        },
      },
      title: {
        display: true,
        text: 'Daily Activity',
        color: '#E0FFFF', // Light Cyan title
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#FFFFFF', // White x-axis labels
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)', // Light grid lines
        },
      },
      y: {
        ticks: {
          color: '#FFFFFF', // White y-axis labels
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)', // Light grid lines
        },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default DailyActivityChart;