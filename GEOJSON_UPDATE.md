# GeoJSON Update Documentation

## Changes Made

### 1. Removed Old GeoJSON Files
Deleted the following demo files:
- `public/data/regions.geojson`
- `public/data/provinces.geojson`
- `public/data/cities.geojson`

### 2. New GeoJSON Files
The project now uses the following geoBoundaries files:
- **geoBoundaries-PHL-ADM0_simplified.geojson** - Philippines country boundary
- **geoBoundaries-PHL-ADM1_simplified.geojson** - Regions (17 features)
- **geoBoundaries-PHL-ADM2_simplified.geojson** - Provinces (~80 features)
- **geoBoundaries-PHL-ADM3_simplified.geojson** - Cities/Municipalities (~1,600+ features)

### 3. MapView Component Updates

#### Dynamic GeoJSON Loading
The map now automatically loads the appropriate administrative level based on active filters:
- **No filters** → Loads ADM1 (Regions)
- **Region selected** → Loads ADM2 (Provinces)
- **Province selected** → Loads ADM3 (Cities/Municipalities)

#### Property Detection
Added `getLocationName()` helper function that dynamically detects location names from various property fields:
- `shapeName`
- `shapeGroup`
- `shapeID`
- `name`
- `region`
- `province`
- `city`

This ensures compatibility with different GeoJSON formats.

#### Auto-Reload on Filter Changes
The map now watches for filter changes and automatically reloads the appropriate GeoJSON level:
```javascript
watch(() => [dataStore.filters.region, dataStore.filters.province, dataStore.filters.city], async () => {
  await loadGeoJSONData()
}, { deep: true })
```

### 4. Improved Styling
- Reduced border weight from 2 to 1.5 for cleaner appearance
- Added custom tooltip class for better styling
- Enhanced hover effects

## Data Matching

To match your uploaded data with the GeoJSON features, ensure your data columns use names that match the GeoJSON properties. The system will attempt to match using:

1. **shapeName** - Primary identifier in geoBoundaries
2. **shapeGroup** - Secondary identifier
3. **name/region/province/city** - Fallback identifiers

## Testing

To test the new GeoJSON files:

1. Load sample data or upload your own CSV/Excel file
2. Select a metric from the filters
3. The map should display colored regions
4. Apply filters to drill down:
   - Select a region → Map switches to provinces
   - Select a province → Map switches to cities

## Performance Notes

- ADM3 (cities) has 1,600+ features and may take longer to load
- The simplified versions are optimized for web performance
- Consider implementing lazy loading for very large datasets

## Troubleshooting

If regions aren't coloring properly:
1. Check browser console for property names: Click on a region and check the logged properties
2. Ensure your data column names match the GeoJSON property names
3. Update the `getValueForLocation()` method in dataStore.js if needed to match your data structure

## Next Steps

Consider adding:
- Loading indicators for GeoJSON file switches
- Caching loaded GeoJSON to avoid re-downloading
- Search functionality to find specific regions/provinces/cities
- Click-to-filter: clicking a region automatically sets the filter
