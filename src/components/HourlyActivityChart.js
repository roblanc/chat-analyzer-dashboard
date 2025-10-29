import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const HourlyActivityChart = () => {
  const data = {
    labels: ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
    datasets: [
      {
        label: 'Messages',
        data: [221, 75, 26, 4, 0, 0, 14, 23, 93, 419, 569, 451, 369, 602, 651, 647, 747, 0, 487, 458, 795, 776, 541, 297],
        backgroundColor: '#B0E0E6', // Powder Blue
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
        text: 'Hourly Activity',
        color: '#B0E0E6', // Powder Blue title
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

export default HourlyActivityChart;