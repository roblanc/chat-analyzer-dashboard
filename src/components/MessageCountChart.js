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
          color: 'var(--text-muted)',
          font: { family: 'Inter', size: 12, weight: '500' }
        },
      },
      title: {
        display: true,
        text: 'Total Mesaje per Persoană',
        color: 'var(--text)',
        font: { family: 'Inter', size: 16, weight: '700' },
        padding: { bottom: 10 }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'var(--bg-transparent)',
        titleColor: 'var(--text)',
        bodyColor: 'var(--text-muted)',
        borderColor: 'var(--card-border)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
      },
    },
    scales: {
      x: {
        ticks: { color: 'var(--text-muted)', font: { family: 'Inter', size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: 'var(--text-muted)', font: { family: 'Inter', size: 11 } },
        grid: { color: 'var(--card-border)' },
      },
    },
  };

  const plugins = [{
    id: 'datalabels',
    afterDatasetsDraw(chart) {
      const { ctx, data } = chart;
      ctx.save();
      ctx.font = '600 10px Inter';
      const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
      ctx.fillStyle = textColor || '#1d1d1f';
      ctx.textAlign = 'center';

      data.datasets.forEach((dataset, i) => {
        chart.getDatasetMeta(i).data.forEach((bar, index) => {
          const val = dataset.data[index];
          if (val > 0) {
            ctx.fillText(val.toLocaleString('ro-RO'), bar.x, bar.y - 10);
          }
        });
      });
      ctx.restore();
    }
  }];

  return (
    <div className="chart-container">
      <Bar data={data} options={options} plugins={plugins} />
    </div>
  );
};

export default MessageCountChart;
