# 🗺️Philippine Map Data Visualizer

A powerful visualization framework for Philippine data mapping with multi-level filtering, metric overlays, and data import from CSV, Excel, JSON, and Google Sheets.

## Features

- 📊 Interactive choropleth maps using Leaflet
- 📈 Dynamic metric visualization with ECharts
- 🔍 Multi-level filtering (Region → Province → City)
- 📁 Data import from CSV, Excel, JSON, and Google Sheets
- 🎨 Beautiful UI with Naive UI components
- ⚡ Fast and responsive with Vue 3 + Vite

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

## Usage

1. **Upload Data**: Use the data uploader to import CSV, Excel, JSON files or connect to Google Sheets
2. **Select Metric**: Choose the metric you want to visualize
3. **Apply Filters**: Filter by region, province, or city
4. **Explore**: Interact with the map and view metric overlays

## Data Format

Your data should include geographic columns:
- `region` - Philippine region name
- `province` - Province name
- `city` - City/Municipality name

And at least one numeric metric column for visualization.

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **Leaflet** - Interactive map library
- **ECharts** - Powerful charting library
- **Pinia** - State management
- **Naive UI** - Component library
- **Vite** - Build tool

## License

MIT
