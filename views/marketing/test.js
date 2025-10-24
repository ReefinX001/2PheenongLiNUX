    tailwind.config = {
      darkMode: 'class',
      theme: { 
        extend: { 
          fontFamily: { 
            sans: ['Prompt','sans-serif'] 
          } 
        } 
      },
      daisyui: { 
        themes: ['light','dark','corporate'] 
      }
    }
    // Wait for the DOM to load
    document.addEventListener('DOMContentLoaded', async function() {
      // Load sidebar first
      try {
        const response = await fetch('/views/marketing/includes/sidebar.html');
        const sidebarHtml = await response.text();
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer) {
          sidebarContainer.innerHTML = sidebarHtml;
          // Initialize sidebar functionality
          if (typeof initializeSidebar === 'function') {
            initializeSidebar();
          }
        }
      } catch (error) {
        console.error('Error loading sidebar:', error);
        // Fallback: show basic sidebar structure
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer) {
          sidebarContainer.innerHTML = '<aside class="w-64 bg-white dark:bg-gray-800 sticky top-0 h-screen"><div class="p-4">Sidebar Loading Error</div></aside>';
        }
      }
      
      // Initialize Toggle Menu
      initToggleMenu();
      
      // Initialize Dark Mode
      initDarkMode();
      
      // Initialize Charts
      initializeCharts();
      
      // Initialize Small Charts
      initializeSmallCharts();
      
      // Set up event listeners
      setupEventListeners();
      
      // Current date for report
      document.getElementById('employeeName').textContent = 'reefinX';
    });
    
    // Initialize sidebar toggle
    function initToggleMenu() {
      const btnToggleMenu = document.getElementById('btnToggleMenu');
      const sidebar = document.getElementById('sidebar');

      if (btnToggleMenu && sidebar) {
        btnToggleMenu.addEventListener('click', function() {
          if (sidebar.classList.contains('w-64')) {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-0');
            this.innerHTML = '<i class="bi bi-chevron-right"></i>';
          } else {
            sidebar.classList.remove('w-0');
            sidebar.classList.add('w-64');
            this.innerHTML = '<i class="bi bi-chevron-left"></i>';
          }
        });
      }
    }
    
    // Initialize dark mode toggle
    function initDarkMode() {
      const btnToggleDark = document.getElementById('btnToggleDark');
      const darkModeLabel = document.getElementById('darkModeLabel');

      if (btnToggleDark) {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
          if (darkModeLabel) darkModeLabel.textContent = 'Light Mode';
          btnToggleDark.innerHTML = '<i class="bi bi-brightness-high text-xl text-yellow-500 dark:text-yellow-400"></i><span class="ml-3">Light Mode</span>';
        }

        btnToggleDark.addEventListener('click', function() {
          if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            if (darkModeLabel) darkModeLabel.textContent = 'Dark Mode';
            btnToggleDark.innerHTML = '<i class="bi bi-moon text-xl text-slate-600"></i><span class="ml-3">Dark Mode</span>';
          } else {
            document.documentElement.classList.add('dark');
            if (darkModeLabel) darkModeLabel.textContent = 'Light Mode';
            btnToggleDark.innerHTML = '<i class="bi bi-brightness-high text-xl text-yellow-500"></i><span class="ml-3">Light Mode</span>';
          }
        });
      }
    }

    // Setup Event Listeners
    function setupEventListeners() {
      // Time Range Filter
      const timeRangeFilter = document.getElementById('timeRangeFilter');
      if (timeRangeFilter) {
        timeRangeFilter.addEventListener('change', function() {
          console.log('Time range changed to:', this.value);
          // Add logic to update charts based on selected time range
        });
      }

      // Download Report Button
      const downloadReportBtn = document.getElementById('downloadReportBtn');
      if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', function() {
          console.log('Downloading report...');
          // Add download logic here
        });
      }
    }

    // Initialize Charts
    function initializeCharts() {
      // Define chart colors
      const chartColors = {
        blue: '#3b82f6',
        indigo: '#6366f1',
        purple: '#8b5cf6',
        pink: '#ec4899',
        red: '#ef4444',
        orange: '#f97316',
        amber: '#f59e0b',
        yellow: '#eab308',
        green: '#10b981',
        teal: '#14b8a6',
        cyan: '#06b6d4',
        // Alpha versions
        blueAlpha: 'rgba(59, 130, 246, 0.5)',
        indigoAlpha: 'rgba(99, 102, 241, 0.5)',
        purpleAlpha: 'rgba(139, 92, 246, 0.5)',
        pinkAlpha: 'rgba(236, 72, 153, 0.5)',
        redAlpha: 'rgba(239, 68, 68, 0.5)',
        orangeAlpha: 'rgba(249, 115, 22, 0.5)',
        amberAlpha: 'rgba(245, 158, 11, 0.5)',
        yellowAlpha: 'rgba(234, 179, 8, 0.5)',
        greenAlpha: 'rgba(16, 185, 129, 0.5)',
        tealAlpha: 'rgba(20, 184, 166, 0.5)',
        cyanAlpha: 'rgba(6, 182, 212, 0.5)'
      };
      
      // Sales Trend Chart
      const salesTrendCtx = document.getElementById('salesTrendChart').getContext('2d');
      const salesTrendChart = new Chart(salesTrendCtx, {
        type: 'line',
        data: {
          labels: ['10 เม.ย.', '15 เม.ย.', '20 เม.ย.', '25 เม.ย.', '30 เม.ย.', '5 พ.ค.', '10 พ.ค.'],
          datasets: [
            {
              label: 'ยอดขาย (บาท)',
              data: [1250000, 1480000, 1620000, 1750000, 1890000, 2150000, 2320000],
              borderColor: chartColors.blue,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              tension: 0.4,
              yAxisID: 'y',
              fill: true
            },
            {
              label: 'จำนวนลูกค้า',
              data: [87, 102, 117, 125, 142, 168, 182],
              borderColor: chartColors.amber,
              backgroundColor: 'transparent',
              borderWidth: 3,
              borderDash: [5, 5],
              tension: 0.4,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'ยอดขาย (บาท)'
              },
              ticks: {
                callback: function(value) {
                  return '฿' + (value/1000000).toFixed(1) + 'M';
                }
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'จำนวนลูกค้า'
              },
              grid: {
                drawOnChartArea: false,
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                    if (context.dataset.yAxisID === 'y') {
                      label += '฿' + context.parsed.y.toLocaleString();
                    } else {
                      label += context.parsed.y + ' คน';
                    }
                  }
                  return label;
                }
              }
            }
          }
        }
      });
      
      // Product Category Chart
      const productCategoryCtx = document.getElementById('productCategoryChart').getContext('2d');
      const productCategoryChart = new Chart(productCategoryCtx, {
        type: 'pie',
        data: {
          labels: ['สมาร์ทโฟน', 'แท็บเล็ต', 'อุปกรณ์เสริม', 'สมาร์ทวอทช์', 'หูฟังไร้สาย'],
          datasets: [{
            data: [65, 12, 10, 8, 5],
            backgroundColor: [
              chartColors.blue,
              chartColors.green,
              chartColors.purple,
              chartColors.amber,
              chartColors.pink
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let value = context.parsed;
                  let total = context.dataset.data.reduce((a, b) => a + b, 0);
                  let percentage = Math.round((value * 100) / total);
                  return context.label + ': ' + percentage + '%';
                }
              }
            }
          }
        }
      });
      
      // Age Distribution Chart
      const ageDistributionCtx = document.getElementById('ageDistributionChart').getContext('2d');
      const ageDistributionChart = new Chart(ageDistributionCtx, {
        type: 'bar',
        data: {
          labels: ['18-24', '25-34', '35-44', '45-54', '55+'],
          datasets: [{
            label: 'จำนวนลูกค้า',
            data: [124, 236, 187, 95, 68],
            backgroundColor: chartColors.teal,
            borderRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
      
      // Sales Channel Chart
      const salesChannelCtx = document.getElementById('salesChannelChart').getContext('2d');
      const salesChannelChart = new Chart(salesChannelCtx, {
        type: 'radar',
        data: {
          labels: ['หน้าร้าน', 'เว็บไซต์', 'แอปพลิเคชัน', 'ตัวแทนขาย', 'แพลตฟอร์มออนไลน์', 'โทรศัพท์'],
          datasets: [{
            label: 'ยอดขาย (ล้านบาท)',
            data: [3.2, 1.8, 2.5, 1.2, 0.9, 0.6],
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: chartColors.blue,
            pointBackgroundColor: chartColors.blue,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: chartColors.blue,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: {
                display: true,
                color: '#e5e7eb'
              },
              grid: {
                color: '#e5e7eb',
                lineWidth: 1
              },
              ticks: {
                display: true,
                color: '#6b7280',
                beginAtZero: true
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#374151'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || ';'
                  let value = context.parsed.r;
                  label += ': ' + value + ' ล้านบาท';'
                  return label;
                }
              }
            }
          }
        }
      });
      
      // Installment Period Chart
      const installmentPeriodCtx = document.getElementById('installmentPeriodChart').getContext('2d');
      const installmentPeriodChart = new Chart(installmentPeriodCtx, {
        type: 'doughnut',
        data: {
          labels: ['3 เดือน', '6 เดือน', '12 เดือน', '24 เดือน'],
          datasets: [{
            label: 'จำนวนการขาย',
            data: [150, 75, 50, 10],
            backgroundColor: [
              chartColors.green,
              chartColors.blue,
              chartColors.orange,
              chartColors.red
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#374151'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.label || ';'
                  let value = context.parsed;
                  label += ': ' + value + ' รายการ';'
                  return label;
                }
              }
            }
          }
        }
      });

      // Campaign ROI Chart
      const campaignROICtx = document.getElementById('campaignROIChart');
      if (campaignROICtx) {
        const campaignROIChart = new Chart(campaignROICtx.getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['โซเชียลมีเดีย', 'Google Ads', 'อีเมลมาร์เก็ตติ้ง', 'SEO', 'คอนเทนต์มาร์เก็ตติ้ง'],
            datasets: [{
              label: 'ROI (%)',
              data: [320, 280, 450, 380, 290],
              backgroundColor: [
                chartColors.blue,
                chartColors.green,
                chartColors.purple,
                chartColors.amber,
                chartColors.red
              ],
              borderRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value + '%';
                  }
                }
              }
            }
          }
        });
      }

      // Customer Funnel Chart
      const customerFunnelCtx = document.getElementById('customerFunnelChart');
      if (customerFunnelCtx) {
        const customerFunnelChart = new Chart(customerFunnelCtx.getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['เข้าชมเว็บไซต์', 'ดูสินค้า', 'ใส่รถเข็น', 'เริ่มชำระเงิน', 'ซื้อสำเร็จ'],
            datasets: [{
              label: 'จำนวนลูกค้า',
              data: [10000, 6500, 2800, 1200, 850],
              backgroundColor: chartColors.blue,
              borderRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                beginAtZero: true
              }
            }
          }
        });
      }

      // Initialize small charts
      initializeSmallCharts();
    }

    // Initialize small charts (if any)
    function initializeSmallCharts() {
        // Small chart 1: Sales by Region (Bar Chart) - only if element exists
        const salesByRegionElement = document.getElementById('salesByRegionChart');
        if (salesByRegionElement) {
          const ctxSmall1 = salesByRegionElement.getContext('2d');
          const salesByRegionChart = new Chart(ctxSmall1, {
          type: 'bar',
          data: {
            labels: ['ภาคเหนือ', 'ภาคตะวันออกเฉียงเหนือ', 'ภาคกลาง', 'ภาคตะวันออก', 'ภาคใต้'],
            datasets: [{
              label: 'ยอดขาย (บาท)',
              data: [2500000, 1500000, 3000000, 2000000, 3500000],
              backgroundColor: [
                chartColors.blue,
                chartColors.green,
                chartColors.orange,
                chartColors.red,
                chartColors.purple
              ],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                ticks: {
                  color: '#374151'
                }
              },
              y: {
                ticks: {
                  color: '#374151',
                  callback: function(value) {
                    return '฿' + (value/1000000).toFixed(1) + 'M';
                  }
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    let label = context.dataset.label || ';'
                    label += ': ฿' + context.parsed.y.toLocaleString();'
                    return label;
                  }
                }
              }
            }
          }
        });
        }

        // Small chart 2: Customer Growth (Line Chart) - only if element exists
        const customerGrowthElement = document.getElementById('customerGrowthChart');
        if (customerGrowthElement) {
          const ctxSmall2 = customerGrowthElement.getContext('2d');
        const customerGrowthChart = new Chart(ctxSmall2, {
          type: 'line',
          data: {
            labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.'],
            datasets: [{
              label: 'ลูกค้าใหม่',
              data: [50, 75, 100, 125, 150, 175, 200],
              borderColor: chartColors.green,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 3,
              tension: 0.4,
              fill: true
            },
            {
              label: 'ลูกค้าที่ยกเลิก',
              data: [5, 10, 15, 20, 25, 30, 35],
              borderColor: chartColors.red,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 3,
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            scales: {
              x: {
                ticks: {
                  color: '#374151'
                }
              },
              y: {
                ticks: {
                  color: '#374151'
                }
              }
            },
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: '#374151'
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    let label = context.dataset.label || ';'
                    label += ': ' + context.parsed.y + ' คน';'
                    return label;
                  }
                }
              }
            }
          }
        });
        }

        // Initialize metric mini charts
        initializeMetricCharts();
      }

      // Initialize metric mini charts
      function initializeMetricCharts() {
        // Reach Rate Chart
        const reachRateElement = document.getElementById('reachRateChart');
        if (reachRateElement) {
          new Chart(reachRateElement.getContext('2d'), {
            type: 'line',
            data: {
              labels: ['W1', 'W2', 'W3', 'W4'],
              datasets: [{
                data: [65, 72, 78, 85],
                borderColor: chartColors.blue,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { display: false },
                y: { display: false }
              }
            }
          });
        }

        // Engagement Rate Chart
        const engagementRateElement = document.getElementById('engagementRateChart');
        if (engagementRateElement) {
          new Chart(engagementRateElement.getContext('2d'), {
            type: 'line',
            data: {
              labels: ['W1', 'W2', 'W3', 'W4'],
              datasets: [{
                data: [25, 28, 30, 32],
                borderColor: chartColors.green,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { display: false },
                y: { display: false }
              }
            }
          });
        }

        // Conversion Rate Chart
        const conversionRateElement = document.getElementById('conversionRateChart');
        if (conversionRateElement) {
          new Chart(conversionRateElement.getContext('2d'), {
            type: 'line',
            data: {
              labels: ['W1', 'W2', 'W3', 'W4'],
              datasets: [{
                data: [5.5, 6.2, 6.8, 7.2],
                borderColor: chartColors.amber,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { display: false },
                y: { display: false }
              }
            }
          });
        }

        // Acquisition Cost Chart
        const acquisitionCostElement = document.getElementById('acquisitionCostChart');
        if (acquisitionCostElement) {
          new Chart(acquisitionCostElement.getContext('2d'), {
            type: 'line',
            data: {
              labels: ['W1', 'W2', 'W3', 'W4'],
              datasets: [{
                data: [520, 480, 465, 450],
                borderColor: chartColors.red,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { display: false },
                y: { display: false }
              }
            }
          });
        }
      }
    }
