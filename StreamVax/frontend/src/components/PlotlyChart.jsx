import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'

const Plot = createPlotlyComponent(Plotly)

const DEFAULT_LAYOUT = {
    font: { family: 'Inter, system-ui, sans-serif', color: '#374151' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { l: 50, r: 20, t: 40, b: 50 },
    xaxis: {
        gridcolor: '#e5e7eb',
        zerolinecolor: '#e5e7eb',
    },
    yaxis: {
        gridcolor: '#e5e7eb',
        zerolinecolor: '#e5e7eb',
    },
    legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: -0.25,
        xanchor: 'center',
        x: 0.5,
        font: { size: 11 },
    },
    hoverlabel: {
        bgcolor: '#1e293b',
        font: { color: '#fff', size: 12 },
        bordercolor: 'transparent',
    },
}

export default function PlotlyChart({ data, layout = {}, config, style, className = '' }) {
    const mergedLayout = {
        ...DEFAULT_LAYOUT,
        ...layout,
        xaxis: { ...DEFAULT_LAYOUT.xaxis, ...(layout.xaxis || {}) },
        yaxis: { ...DEFAULT_LAYOUT.yaxis, ...(layout.yaxis || {}) },
        margin: { ...DEFAULT_LAYOUT.margin, ...(layout.margin || {}) },
        legend: { ...DEFAULT_LAYOUT.legend, ...(layout.legend || {}) },
        hoverlabel: { ...DEFAULT_LAYOUT.hoverlabel, ...(layout.hoverlabel || {}) },
        font: { ...DEFAULT_LAYOUT.font, ...(layout.font || {}) },
    }

    const mergedConfig = {
        responsive: true,
        displayModeBar: false,
        locale: 'fr',
        ...config,
    }

    return (
        <Plot
            data={data}
            layout={mergedLayout}
            config={mergedConfig}
            useResizeHandler
            style={{ width: '100%', height: '100%', ...style }}
            className={className}
        />
    )
}
