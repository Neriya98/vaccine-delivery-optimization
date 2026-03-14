/**
 * charts.js — Chart.js helper utilities
 */

/**
 * Create a line chart for vaccination history
 * @param {string} canvasId - Canvas element ID
 * @param {Array} data - Array of daily record objects
 */
function createHistoryChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !data || data.length === 0) return null;

    return new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.map(r => r.date),
            datasets: [
                {
                    label: 'Vaccinations',
                    data: data.map(r => r.vaccines_done),
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'Urgences',
                    data: data.map(r => r.emergencies_real),
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'Stock utilisé',
                    data: data.map(r => r.stock_used),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: false,
                    tension: 0.3,
                    borderDash: [5, 5],
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/**
 * Create a bar chart for zone comparison
 * @param {string} canvasId - Canvas element ID
 * @param {Array} zones - Array of zone data objects
 */
function createZoneComparisonChart(canvasId, zones) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !zones || zones.length === 0) return null;

    return new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: zones.map(z => z.nom),
            datasets: [{
                label: 'Vaccinations (30j)',
                data: zones.map(z => z.total_vaccines_30j),
                backgroundColor: 'rgba(13, 110, 253, 0.7)',
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
