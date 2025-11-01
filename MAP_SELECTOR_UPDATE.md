# Map Selector Feature Update

## Overview
Added a comprehensive map selector that allows users to choose different administrative levels and focus on specific regions, provinces, or cities.

## New Features

### 1. Map Level Selection
Users can now select from 4 different map views:
- **🇵🇭 Philippines (Country)** - Shows the entire Philippines boundary (ADM0)
- **🗺️ Regions** - Shows all Philippine regions (ADM1)
- **📍 Provinces** - Shows all provinces (ADM2)
- **🏙️ Cities & Municipalities** - Shows all cities and municipalities (ADM3)

### 2. Location Focus
When a specific level is selected, users can:
- **Regions View**: Select a specific region (e.g., "Ilocos Region") to view only that region
- **Provinces View**: Select a specific province to view only that province
- **Cities View**: Select a specific city/municipality to view only that location

### 3. Initial Map View
- Map now loads with the **Philippines country boundary (ADM0)** by default
- Shows the entire Philippines without regional boundaries
- No surrounding countries or oceans visible
- Clean, focused view on Philippine territory

## Components Modified/Created

### New Component: `MapSelector.vue`
Located in `src/components/MapSelector.vue`

Features:
- Radio button group for level selection
- Dynamic dropdown selectors for regions/provinces/cities
- Current view information display
- Auto-populates available locations from loaded GeoJSON
- Filterable and searchable location lists

### Updated: `dataStore.js`
Added new state properties:
- `mapLevel`: Tracks current map level ('country', 'regions', 'provinces', 'cities')
- `mapFocus`: Tracks specific location being viewed (e.g., "Ilocos Region")

Added new actions:
- `setMapLevel(level)`: Changes the map administrative level
- `setMapFocus(location)`: Focuses on a specific location

### Updated: `MapView.vue`
- Modified `loadGeoJSONData()` to use `mapLevel` instead of filters
- Added feature filtering based on `mapFocus`
- Special styling for country-level view (blue outline, light fill)
- Watches `mapLevel` and `mapFocus` for automatic updates

### Updated: `App.vue`
- Added `MapSelector` component to sidebar
- Positioned at the top of the sidebar for easy access

## User Workflow

### Example 1: View Specific Region
1. Select "Regions" radio button
2. Dropdown appears with all Philippine regions
3. Select "Ilocos Region" from dropdown
4. Map zooms to show only Ilocos Region
5. Info alert shows "Viewing: Ilocos Region"

### Example 2: View All Provinces
1. Select "Provinces" radio button
2. Map loads all Philippine provinces
3. Can select specific province from dropdown if desired
4. Or leave unselected to view all provinces

### Example 3: Return to Country View
1. Select "Philippines (Country)" radio button
2. Map shows entire Philippines boundary
3. Clean view without internal boundaries

## Technical Details

### GeoJSON Loading Strategy
```javascript
switch (mapLevel) {
  case 'country':   → geoBoundaries-PHL-ADM0_simplified.geojson
  case 'regions':   → geoBoundaries-PHL-ADM1_simplified.geojson
  case 'provinces': → geoBoundaries-PHL-ADM2_simplified.geojson
  case 'cities':    → geoBoundaries-PHL-ADM3_simplified.geojson
}
```

### Feature Filtering
When a specific location is selected:
```javascript
if (mapFocus) {
  filteredGeoData = {
    ...geoData,
    features: geoData.features.filter(feature => 
      getLocationName(feature) === mapFocus
    )
  }
}
```

### Styling
- **Country level**: Blue outline (#2563eb), light blue fill (#e8f4f8), 30% opacity
- **Other levels**: White borders, data-driven fill colors, 70% opacity
- **Hover**: Increased border weight and opacity

## Benefits

1. **Better Navigation**: Easy switching between administrative levels
2. **Focused Analysis**: Zoom into specific regions/provinces/cities
3. **Clean Initial View**: Philippines boundary without clutter
4. **Intuitive UI**: Radio buttons + dropdowns for clear selection
5. **Dynamic Options**: Location lists auto-populate from GeoJSON
6. **Search Support**: Filterable dropdowns for quick location finding

## Integration with Existing Features

- **Data Filters**: Work independently from map selector
- **Metrics**: Apply to whatever map level is selected
- **Charts**: Update based on visible features
- **Legend**: Reflects current data visualization

## Future Enhancements

Consider adding:
- Click-to-select: Click a region on the map to focus on it
- Breadcrumb navigation: Show hierarchy (Philippines > Region > Province)
- Quick zoom buttons: Reset view, zoom to fit
- Save favorite views: Bookmark specific locations
- Compare mode: View multiple locations side-by-side
