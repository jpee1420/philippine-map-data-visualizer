# 🚀 Quick Start Guide

## Installation

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000`

## Quick Usage Guide

### 1️⃣ Choose Map View
**Map View Panel** (top of sidebar)
- Select administrative level: Country, Regions, Provinces, or Cities
- Optionally focus on specific location using dropdown

### 2️⃣ Import Data
**Import Data Panel**
- **Upload File**: CSV, Excel, or JSON
- **Google Sheets**: Paste public sheet URL
- **Sample Data**: Click to load demo data

### 3️⃣ Select Metric
**Filters Panel**
- Choose metric from dropdown (e.g., population, GDP)
- Map colors update automatically

### 4️⃣ Apply Filters (Optional)
**Filters Panel**
- Filter by Region
- Filter by Province (requires region)
- Filter by City (requires province)

### 5️⃣ Explore
- **Hover** over regions to see data
- **View** summary statistics in right panel
- **Analyze** top locations in chart

## Example Workflows

### Workflow 1: View Ilocos Region
1. Select "Regions" in Map View
2. Choose "Ilocos Region" from dropdown
3. Load sample data
4. Select "population" metric
5. View colored map of Ilocos Region

### Workflow 2: Compare All Provinces
1. Select "Provinces" in Map View
2. Leave dropdown empty (view all)
3. Upload your CSV with province data
4. Select your metric
5. Compare provinces by color

### Workflow 3: Analyze NCR Cities
1. Select "Cities & Municipalities" in Map View
2. Load data with city-level information
3. Select metric
4. Apply Region filter: "National Capital Region"
5. View detailed city breakdown

## Data Format

Your CSV/Excel should have:

```csv
region,province,city,population,gdp,metric1,metric2
National Capital Region,Metro Manila,Manila,1780000,5000000,100,200
Ilocos Region,Ilocos Norte,Laoag,111000,250000,50,75
```

**Required Columns** (at least one):
- `region` - Region name
- `province` - Province name  
- `city` - City/Municipality name

**Metric Columns**:
- Any numeric column becomes a selectable metric

## Tips

✅ **Start Simple**: Load sample data first to understand the interface
✅ **Match Names**: Ensure your data location names match GeoJSON properties
✅ **Use Search**: Dropdowns are searchable - just start typing
✅ **Clear Filters**: Use "Clear All Filters" to reset
✅ **Export Results**: (Coming soon) Export filtered data

## Troubleshooting

**Map not showing colors?**
- Check if metric is selected
- Verify data has matching location names
- Check browser console for errors

**Dropdown empty?**
- Ensure correct map level is selected
- Wait for GeoJSON to load
- Check if data is imported

**Performance slow?**
- Cities level has 1,600+ features
- Consider filtering to specific region/province
- Use simplified GeoJSON files

## Keyboard Shortcuts

- `Ctrl/Cmd + Click` - Open location in new view (coming soon)
- `Esc` - Clear current selection (coming soon)

## Need Help?

Check these files:
- `README.md` - Project overview
- `SETUP_GUIDE.md` - Detailed setup instructions
- `MAP_SELECTOR_UPDATE.md` - Map selector documentation
- `GEOJSON_UPDATE.md` - GeoJSON file information

---

**Happy Mapping! 🗺️📊**
