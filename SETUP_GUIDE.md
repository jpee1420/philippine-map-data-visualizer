# 🚀 Setup Guide - Philippine Map Visualizer

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
```

## Project Structure

```
vue-leaflet-echarts/
├── public/                  # Static assets
│   └── data/               # GeoJSON files
│       ├── regions.geojson
│       ├── provinces.geojson
│       └── cities.geojson
├── src/
│   ├── assets/
│   │   └── styles/
│   │       └── main.css    # Global styles
│   ├── components/         # Vue components
│   │   ├── MapView.vue          # Leaflet map
│   │   ├── MetricOverlay.vue    # ECharts metrics
│   │   ├── DataUploader.vue     # Data import
│   │   ├── Filters.vue          # Filtering controls
│   │   └── Legend.vue           # Map legend
│   ├── store/
│   │   └── dataStore.js         # Pinia state management
│   ├── utils/
│   │   ├── dataParser.js        # Data parsing utilities
│   │   └── geoUtils.js          # GeoJSON utilities
│   ├── App.vue                  # Root component
│   └── main.js                  # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## Features

### 📊 Data Import
- **CSV Files**: Upload CSV files with geographic data
- **Excel Files**: Import .xlsx and .xls files
- **JSON Files**: Load JSON data arrays
- **Google Sheets**: Connect to public Google Sheets
- **Sample Data**: Load built-in sample data for testing

### 🗺️ Map Visualization
- Interactive choropleth map powered by Leaflet
- Color-coded regions based on selected metrics
- Hover tooltips with data details
- Zoom and pan controls
- Responsive design

### 📈 Metrics & Analytics
- Dynamic metric selection
- Summary statistics (min, max, avg, total)
- Interactive charts powered by ECharts
- Top N locations visualization

### 🔍 Multi-Level Filtering
- Region-based filtering
- Province-based filtering
- City-based filtering
- Cascading filter dependencies
- Clear all filters functionality

## Data Format

Your data should include the following columns:

### Required Geographic Columns
- `region` - Philippine region name (e.g., "National Capital Region")
- `province` - Province name (e.g., "Metro Manila")
- `city` - City/Municipality name (e.g., "Manila")

### Metric Columns
Any numeric columns will be automatically detected as available metrics.

### Example Data Structure

```csv
region,province,city,population,gdp
National Capital Region,Metro Manila,Manila,1780000,5000000
National Capital Region,Metro Manila,Quezon City,2960000,7500000
Ilocos Region,Ilocos Norte,Laoag,111000,250000
```

## Using the Application

### Step 1: Import Data
1. Click on the "Upload File" tab or "Google Sheets" tab
2. Select your data file or enter a Google Sheets URL
3. Alternatively, click "Load Sample Data" to try the app

### Step 2: Select Metric
1. In the Filters panel, choose a metric from the dropdown
2. The map will automatically update with color-coded regions

### Step 3: Apply Filters (Optional)
1. Select a Region to filter by region
2. Select a Province (requires region selection)
3. Select a City (requires province selection)
4. Click "Clear All Filters" to reset

### Step 4: Explore
- Hover over map regions to see data tooltips
- View summary statistics in the metrics panel
- Analyze the top locations chart
- Zoom and pan the map as needed

## Customization

### Adding Real GeoJSON Data
Replace the files in `public/data/` with accurate Philippine GeoJSON files:
- `regions.geojson` - Philippine regions
- `provinces.geojson` - Philippine provinces
- `cities.geojson` - Philippine cities/municipalities

You can download accurate GeoJSON files from:
- [GeoJSON Philippines on GitHub](https://github.com/altcoder/philippines-json-maps)
- [Philippine GIS Data Portal](https://data.gov.ph/)

### Customizing Colors
Edit the color scale in `src/store/dataStore.js`:

```javascript
colorScale: {
  min: 0,
  max: 100,
  colors: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15']
}
```

### Changing Map Tiles
Edit the tile layer in `src/components/MapView.vue`:

```javascript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 18
}).addTo(map.value)
```

## Troubleshooting

### Issue: Map not displaying
- Check browser console for errors
- Ensure Leaflet CSS is loaded in index.html
- Verify GeoJSON files are properly formatted

### Issue: Data not importing
- Check file format (CSV, Excel, JSON)
- Ensure geographic columns are named correctly
- Verify data structure matches expected format

### Issue: Charts not showing
- Ensure you have selected a metric
- Check that your data contains numeric columns
- Verify filtered data is not empty

## Performance Tips

1. **Large Datasets**: For datasets with >10,000 rows, consider:
   - Using pagination
   - Implementing data aggregation
   - Loading data on-demand

2. **Complex GeoJSON**: Simplify GeoJSON files using tools like [Mapshaper](https://mapshaper.org/)

3. **Chart Performance**: Limit the number of items in charts (currently set to top 20)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Dependencies

- **Vue 3** - Progressive JavaScript framework
- **Leaflet** - Interactive map library
- **ECharts** - Charting and visualization
- **Pinia** - State management
- **Naive UI** - Component library
- **PapaParse** - CSV parsing
- **SheetJS** - Excel file handling
- **Axios** - HTTP client

## Contributing

Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For questions or issues:
1. Check this guide
2. Review the blueprint in `vue-leaflet-echarts-blueprint.md`
3. Check component documentation in source files
4. Review browser console for errors

---

**Happy Mapping! 🗺️**
