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
        ticks: { color: '#86868b', font: { family: 'Inter', size: 9 } },
        grid: { display: false },
        border: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { 
          color: '#86868b', 
          font: { family: 'Inter', size: 9 },
          maxTicksLimit: 4
        },
        grid: { 
          color: 'rgba(0, 0, 0, 0.04)',
          drawTicks: false
        },
        border: { display: false }
      },
    },
  };

  const plugins = [{
    id: 'datalabels',
    afterDatasetsDraw(chart) {
      const { ctx, data } = chart;
      ctx.save();
      ctx.font = '600 9px Inter';
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.fillStyle = isDark ? '#f5f5f7' : '#1d1d1f';
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

export default HourlyActivityChart;
