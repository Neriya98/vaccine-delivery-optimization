/**
 * map.js — Leaflet.js helper utilities
 */

/**
 * Initialize a Leaflet map centered on France
 * @param {string} elementId - DOM element ID for the map
 * @param {Object} options - Map options
 * @returns {L.Map} Leaflet map instance
 */
function initMap(elementId, options = {}) {
    const defaults = {
        center: [46.603354, 1.888334],
        zoom: 6,
        tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
    };
    const config = { ...defaults, ...options };

    const map = L.map(elementId).setView(config.center, config.zoom);
    L.tileLayer(config.tileUrl, { attribution: config.attribution }).addTo(map);
    return map;
}

/**
 * Add centre markers to a Leaflet map
 * @param {L.Map} map - Leaflet map instance
 * @param {Array} centres - Array of centre objects with lat/lng
 */
function addCentreMarkers(map, centres) {
    centres.forEach(centre => {
        if (centre.latitude && centre.longitude) {
            const marker = L.marker([centre.latitude, centre.longitude]).addTo(map);
            marker.bindPopup(`
                <strong>${centre.nom}</strong><br>
                ${centre.adresse || ''}<br>
                <hr style="margin: 4px 0">
                Stock : <strong>${centre.stock_actuel}</strong> doses<br>
                Capacité/jour : ${centre.capacite_jour}
            `);
        }
    });
}

/**
 * Color-code markers based on stock level
 * @param {number} stock - Current stock
 * @param {number} capacity - Daily capacity
 * @returns {string} Color string
 */
function getStockColor(stock, capacity) {
    const days = stock / (capacity || 1);
    if (days < 2) return 'red';
    if (days < 5) return 'orange';
    return 'green';
}
