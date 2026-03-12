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
  const titleText = 'Activitate Zilnică';


  const data = {
    labels,
    datasets: [
      {
        label: 'Mesaje',
        data: values,
        backgroundColor: 'rgba(139, 92, 246, 0.85)', // Violet
        borderColor: '#8B5CF6',
        borderWidth: 1,
        borderRadius: 2, // Subtler border radius for bento
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
        text: titleText,
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
      ctx.font = 'bold 9px Inter';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#ffffff';
      ctx.textAlign = 'center';

      data.datasets.forEach((dataset, i) => {
        chart.getDatasetMeta(i).data.forEach((bar, index) => {
          const val = dataset.data[index];
          if (val > 0) {
            ctx.fillText(val.toLocaleString('ro-RO'), bar.x, bar.y - 8);
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

export default DailyActivityChart;
