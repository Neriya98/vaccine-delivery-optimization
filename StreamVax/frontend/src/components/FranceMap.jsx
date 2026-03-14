import PlotlyChart from './PlotlyChart'

const STOCK_COLORS = {
    critical: '#ef4444',
    warning: '#f59e0b',
    good: '#22c55e',
}

function getStockColor(stock) {
    if (stock < 20) return STOCK_COLORS.critical
    if (stock < 50) return STOCK_COLORS.warning
    return STOCK_COLORS.good
}

function getStockLabel(stock) {
    if (stock < 20) return 'Critique'
    if (stock < 50) return 'Modéré'
    return 'Bon'
}

export default function FranceMap({ centres, title = 'Carte des centres' }) {
    if (!centres || centres.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                Aucun centre avec coordonnées disponible.
            </div>
        )
    }

    const validCentres = centres.filter((c) => c.latitude && c.longitude)

    if (validCentres.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                Aucun centre avec coordonnées disponible.
            </div>
        )
    }

    const lats = validCentres.map((c) => c.latitude)
    const lons = validCentres.map((c) => c.longitude)
    const stocks = validCentres.map((c) => c.stock_actuel ?? 0)
    const colors = stocks.map(getStockColor)
    const sizes = stocks.map((s) => Math.max(8, Math.min(30, s / 3)))

    const hoverTexts = validCentres.map(
        (c) =>
            `<b>${c.nom}</b><br>` +
            `Stock : ${c.stock_actuel ?? '—'} doses<br>` +
            `État : ${getStockLabel(c.stock_actuel ?? 0)}<br>` +
            `Capacité/j : ${c.capacite_jour ?? '—'}`
    )

    const data = [
        {
            type: 'scattergeo',
            lat: lats,
            lon: lons,
            text: hoverTexts,
            hoverinfo: 'text',
            marker: {
                size: sizes,
                color: colors,
                opacity: 0.85,
                line: { width: 1.5, color: '#fff' },
                sizemode: 'diameter',
            },
            name: 'Centres',
        },
    ]

    const layout = {
        title: { text: title, font: { size: 15, color: '#1e293b' }, x: 0.02 },
        geo: {
            scope: 'europe',
            resolution: 50,
            lonaxis: { range: [-5.5, 10] },
            lataxis: { range: [41, 51.5] },
            showland: true,
            landcolor: '#f1f5f9',
            showocean: true,
            oceancolor: '#e0f2fe',
            showlakes: true,
            lakecolor: '#bae6fd',
            showcountries: true,
            countrycolor: '#cbd5e1',
            countrywidth: 1,
            showsubunits: true,
            subunitcolor: '#e2e8f0',
            showframe: false,
            bgcolor: 'transparent',
            projection: { type: 'mercator' },
        },
        margin: { l: 0, r: 0, t: 40, b: 0 },
        legend: { orientation: 'h', y: -0.05 },
        dragmode: false,
    }

    return (
        <div className="w-full" style={{ minHeight: 420 }}>
            <PlotlyChart
                data={data}
                layout={layout}
                config={{ scrollZoom: false, displayModeBar: false }}
                style={{ height: 420 }}
            />
        </div>
    )
}
