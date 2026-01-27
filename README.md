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

## Usage

1. **Upload Data**: Use the data uploader to import CSV, Excel, JSON files or connect to Google Sheets
2. **Select Metric**: Choose the metric you want to visualize
3. **Apply Filters**: Filter by region, province, or city using the pivot interface
4. **Configure Map**:
   - Toggle callout labels to show data values on the map
   - Drag callouts to reposition them (constrained to map bounds)
   - Choose color schemes for better visualization
   - Hide/show internal boundaries for cleaner views
   - Capture map snapshots as transparent PNG files
5. **Explore**: Interact with the map, view tooltips, and analyze geographic patterns

## Data Format

Your data should include geographic columns:
- `region` - Philippine region name
- `province` - Province name
- `city` - City/Municipality name

And at least one numeric metric column for visualization.

## Tech Stack

- **Vue 3** - Progressive JavaScript framework with Composition API
- **Leaflet** - Interactive map library
- **D3.js** - Data-driven collision detection for callout positioning
- **html2canvas** - Map snapshot functionality
- **Pinia** - State management
- **Naive UI** - Component library
- **Vite** - Build tool

## Architecture

The application follows a modular architecture with reusable utilities:

- **`src/utils/aggregateUtils.js`** - Data aggregation and value extraction
- **`src/utils/calloutLayoutUtils.js`** - D3-based collision avoidance and responsive sizing
- **`src/utils/mapCalloutUtils.js`** - Callout rendering and interaction logic
- **`src/utils/mapLayerUtils.js`** - Map styling and tooltip generation
- **`src/utils/mapGeoJsonLoader.js`** - GeoJSON loading and geographic data processing
- **`src/utils/mapSnapshotUtils.js`** - Map snapshot export functionality
- **`src/utils/pivotFilterUtils.js`** - Pivot table filtering and selection logic
- **`src/utils/dataFieldsUtils.js`** - Dataset field definitions and statistics

## License

MIT
