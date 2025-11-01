# Troubleshooting - Map Not Rendering

## Changes Made to Fix the Issue

### 1. Fixed Element ID/Class Mismatch
- **Problem**: Template used `class="map"` but CSS targeted `#map`
- **Fix**: Added `id="map"` to the map element
- **Code**: `<div ref="mapElement" id="map" class="map"></div>`

### 2. Added Console Logging
Added extensive logging to help diagnose issues:
- Map initialization
- GeoJSON loading
- Feature count
- Layer rendering
- Bounds fitting

### 3. Better Error Handling
- Wrapped map initialization in try-catch
- Added `finally` block to ensure loading state is cleared
- Added null checks in renderGeoJSON

## How to Check if Map is Working

### Step 1: Open Browser Console
1. Open the app in your browser (usually `http://localhost:3000` or `http://localhost:5173`)
2. Press `F12` or right-click → "Inspect"
3. Go to the "Console" tab

### Step 2: Check Console Messages
You should see these messages in order:

```
✅ Map initialized successfully
✅ Loading GeoJSON from: /data/geoBoundaries-PHL-ADM0_simplified.geojson
✅ GeoJSON loaded, features: 1
✅ Rendering GeoJSON, features: 1
✅ GeoJSON layer added to map
✅ Fitting bounds: LatLngBounds {...}
```

### Step 3: Common Issues and Solutions

#### Issue 1: "Failed to load GeoJSON: 404"
**Cause**: GeoJSON file not found
**Solution**: 
- Check that files exist in `public/data/`
- Verify file names match exactly
- Restart dev server

#### Issue 2: "Cannot render: map or geoData is null"
**Cause**: Map not initialized or GeoJSON failed to load
**Solution**:
- Check previous console errors
- Verify Leaflet CSS is imported
- Check if map container has height

#### Issue 3: Map container has no height
**Cause**: CSS not applied properly
**Solution**:
- Check that `.map-container` has `min-height: 500px`
- Verify parent containers have height
- Inspect element in DevTools

#### Issue 4: Blank gray area but no map
**Cause**: GeoJSON loaded but not rendering
**Solution**:
- Check if features array is empty
- Verify GeoJSON structure is valid
- Check console for JavaScript errors

### Step 4: Verify Map Container
In the browser DevTools:
1. Click the "Select Element" tool (top-left of DevTools)
2. Click on the map area
3. Check the computed styles:
   - Width should be > 0
   - Height should be >= 500px
   - Background should be #f8f9fa

### Step 5: Check Network Tab
1. Go to "Network" tab in DevTools
2. Refresh the page
3. Look for GeoJSON file requests:
   - Should see: `geoBoundaries-PHL-ADM0_simplified.geojson`
   - Status should be: `200 OK`
   - Size should be: several KB

## Manual Testing Steps

### Test 1: Basic Map Load
1. Open the app
2. Map should show Philippines outline with light blue fill
3. Should be able to zoom in/out
4. Should be able to pan (but limited to Philippines bounds)

### Test 2: Load Sample Data
1. Go to "Import Data" → "Sample Data"
2. Click "Load Sample Data"
3. Select metric: "population"
4. Map should show colored regions

### Test 3: Change View Levels
1. Select "Regions" view
2. Map should show all Philippine regions
3. Select "Provinces" view
4. Map should show all provinces

### Test 4: Hide Boundaries
1. Select "Regions" view
2. Load sample data and select metric
3. Check "Hide internal boundaries"
4. Borders should become subtle

## Quick Fixes

### Fix 1: Force Refresh
```bash
# Clear browser cache
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Fix 2: Restart Dev Server
```bash
# Stop server (Ctrl+C)
# Then restart
npm run dev
```

### Fix 3: Clear Node Modules
```bash
rm -rf node_modules
npm install
npm run dev
```

### Fix 4: Check Leaflet CSS
Verify in `src/main.js`:
```javascript
import 'leaflet/dist/leaflet.css'
```

## Expected Behavior

### Initial Load (Country View)
- Light blue Philippines outline
- Light gray background
- No internal boundaries
- Centered on Philippines
- Zoom level 6

### After Loading Sample Data
- Colored regions based on selected metric
- Tooltips on hover showing location name and value
- Legend showing color scale
- Metrics panel showing statistics

### After Selecting Region
- Map focuses on selected region
- Option to show provinces within region
- Can hide internal boundaries

## Still Not Working?

If the map still doesn't render after checking all the above:

1. **Share Console Output**: Copy all console messages
2. **Check Browser**: Try different browser (Chrome, Firefox, Edge)
3. **Check Node Version**: Ensure Node.js 16+ is installed
4. **Check Dependencies**: Run `npm list leaflet` to verify Leaflet is installed
5. **Check File Permissions**: Ensure all files are readable

## Debug Mode

To enable more detailed logging, you can temporarily add this to MapView.vue:

```javascript
// In onMounted, after map creation
console.log('Map object:', map.value)
console.log('Map container:', mapElement.value)
console.log('Map size:', map.value.getSize())
console.log('Map center:', map.value.getCenter())
console.log('Map zoom:', map.value.getZoom())
```

This will help identify exactly where the issue is occurring.
