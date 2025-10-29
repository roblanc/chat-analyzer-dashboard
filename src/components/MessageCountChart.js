import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MessageCountChart = () => {
  const data = {
    labels: ['Unde', 'Marius Motoi', 'Baldo', 'Vasile', 'R', 'Meta AI', 'ChatGPT', 'You'],
    datasets: [
      {
        label: 'Total Messages',
        data: [2961, 2429, 1164, 705, 294, 4, 3, 1],
        backgroundColor: '#ADD8E6', // Light Blue
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
        text: 'Total Messages per Person',
        color: '#ADD8E6', // Light Blue title
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

export default MessageCountChart;