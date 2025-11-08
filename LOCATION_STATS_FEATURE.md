# Location Statistics Feature

## Overview

The Location Statistics feature displays a detailed breakdown of metrics by geographic location with support for category-based subdivisions (gender, age groups, types, etc.). This feature is inspired by demographic visualization patterns and provides an intuitive way to view location-specific data alongside the map.

## Features

### 1. **Location-Based Statistics**
- Displays all locations at the current map level (regions, provinces, or cities)
- Shows total value and percentage for each location
- Sorted by total value (highest to lowest)
- Color-coded progress bars matching the map's color scale

### 2. **Category Breakdowns**
- Automatically detects breakdown columns in your data:
  - `gender` (Male, Female)
  - `age_group` (Youth, Adult, Senior, etc.)
  - `category` (any custom categories)
  - `type` (any classification)
  - `classification` (any grouping)
- Shows value and percentage for each category within a location
- Example: "Ilocos Norte: 111,651 total → Male: 58,000 (52%), Female: 53,651 (48%)"

### 3. **Interactive Elements**
- Hover over location to highlight (future: sync with map)
- Click to view details
- Smooth animations and transitions
- Responsive scrolling for long lists

### 4. **Summary Statistics**
- Total number of locations
- Total value across all locations
- Average value per location

### 5. **Category Filtering** (when breakdowns exist)
- Filter view by specific category
- Dropdown selector for available categories

## Data Format

### Basic Data (No Breakdowns)
```csv
region,province,city,population,gdp_millions
Ilocos Region,Ilocos Norte,Laoag City,111651,15234
Ilocos Region,Ilocos Sur,Vigan City,53879,8945
```

### Data with Gender Breakdown
```csv
region,province,city,population,gdp_millions,gender
Ilocos Region,Ilocos Norte,Laoag City,58000,7617,Male
Ilocos Region,Ilocos Norte,Laoag City,53651,7617,Female
Ilocos Region,Ilocos Sur,Vigan City,28000,4473,Male
Ilocos Region,Ilocos Sur,Vigan City,25879,4472,Female
```

### Data with Multiple Breakdowns
```csv
region,province,city,population,gender,age_group
Ilocos Region,Ilocos Norte,Laoag City,30000,Male,Adult
Ilocos Region,Ilocos Norte,Laoag City,28000,Male,Youth
Ilocos Region,Ilocos Norte,Laoag City,27000,Female,Adult
Ilocos Region,Ilocos Norte,Laoag City,26651,Female,Youth
```

## Usage

### 1. Load Sample Data with Breakdowns

**Option A: Use Built-in Sample**
1. Go to "Import Data" panel
2. Click "Sample Data" tab
3. Click "Load Sample Data (with Gender Breakdown)"
4. Select a metric (e.g., "population")

**Option B: Upload Your Own Data**
1. Prepare CSV with breakdown column (gender, age_group, etc.)
2. Upload via "Upload File" tab
3. Select your metric

### 2. View Location Statistics

The Location Stats panel will automatically display:
- List of locations with totals
- Breakdown by category (if available)
- Progress bars showing relative sizes
- Summary statistics at bottom

### 3. Navigate Between Levels

**View Regions:**
1. Select "Regions" in Map View
2. Location Stats shows all Philippine regions
3. Each region shows total and breakdowns

**View Provinces:**
1. Select "Provinces" in Map View
2. Location Stats shows all provinces
3. Or select a specific region to see its provinces

**View Cities:**
1. Select "Cities & Municipalities" in Map View
2. Location Stats shows all cities
3. Or select a province to see its cities

## Component Structure

### LocationStats.vue

**Props:** None (uses Pinia store)

**Computed Properties:**
- `locationStats` - Aggregated statistics by location
- `hasBreakdowns` - Whether data contains breakdown columns
- `categoryOptions` - Available categories for filtering
- `totalValue` - Sum of all location values
- `averageValue` - Average across locations

**Key Functions:**
- `detectBreakdowns(rows)` - Automatically detects breakdown columns
- `formatValue(value)` - Formats numbers (K, M notation)
- `getTagType(percentage)` - Returns color based on percentage
- `handleLocationHover(location)` - Handles hover interactions

## Styling

### Color Scheme
- **Success (≥20%)**: Green tag
- **Info (10-19%)**: Blue tag
- **Warning (5-9%)**: Orange tag
- **Default (<5%)**: Gray tag

### Layout
- **Card-based design** with rounded corners
- **Hover effects** with shadow and translation
- **Progress bars** matching map colors
- **Scrollable list** with custom scrollbar

### Responsive
- **Desktop**: Full height panel
- **Tablet**: Stacked below map
- **Mobile**: Full width, scrollable

## Integration with Map

### Current Behavior
- Location Stats updates when:
  - Map level changes (Country → Regions → Provinces → Cities)
  - Metric selection changes
  - Filters are applied
  - Data is uploaded

### Future Enhancements
- **Bi-directional highlighting**: Hover on stats → highlight on map
- **Click to focus**: Click location → zoom map to that location
- **Synchronized selection**: Map selection updates stats filter

## Examples

### Example 1: Gender Breakdown by Region

**Data:**
```csv
region,province,city,population,gender
Ilocos Region,Ilocos Norte,Laoag City,58000,Male
Ilocos Region,Ilocos Norte,Laoag City,53651,Female
```

**Display:**
```
📍 Ilocos Region
   221,651 (15.2%)
   Male: 115,000 (52%)
   Female: 106,651 (48%)
   [████████████████░░░░] 15.2%
```

### Example 2: Age Group Breakdown by Province

**Data:**
```csv
region,province,city,population,age_group
Central Luzon,Pampanga,Angeles City,150000,Adult
Central Luzon,Pampanga,Angeles City,180000,Youth
Central Luzon,Pampanga,Angeles City,81634,Senior
```

**Display:**
```
📍 Pampanga
   411,634 (8.5%)
   Youth: 180,000 (44%)
   Adult: 150,000 (36%)
   Senior: 81,634 (20%)
   [████████░░░░░░░░░░░░] 8.5%
```

### Example 3: Multiple Locations

**Display:**
```
📍 National Capital Region
   5,000,000 (35.2%)
   Male: 2,550,000 (51%)
   Female: 2,450,000 (49%)
   [████████████████████████████████████] 35.2%

📍 Central Luzon
   2,100,000 (14.8%)
   Male: 1,080,000 (51.4%)
   Female: 1,020,000 (48.6%)
   [████████████████░░░░░░░░░░░░░░░░░░░░] 14.8%

📍 Calabarzon
   1,850,000 (13.0%)
   Male: 945,000 (51.1%)
   Female: 905,000 (48.9%)
   [██████████████░░░░░░░░░░░░░░░░░░░░░░] 13.0%
```

## Technical Details

### Data Aggregation Logic

1. **Group by Location**
   ```javascript
   // Determine location based on map level
   let location = null
   if (mapLevel === 'cities') location = row.city
   else if (mapLevel === 'provinces') location = row.province
   else location = row.region
   ```

2. **Detect Breakdown Columns**
   ```javascript
   const breakdownColumns = ['gender', 'sex', 'age_group', 'category', 'type']
   const availableBreakdowns = breakdownColumns.filter(col => 
     rows.some(row => row[col] !== undefined)
   )
   ```

3. **Calculate Percentages**
   ```javascript
   const percentage = (value / totalSum) * 100
   ```

4. **Sort by Value**
   ```javascript
   stats.sort((a, b) => b.total - a.total)
   ```

### Performance Considerations

- **Computed Properties**: All calculations are reactive and cached
- **Efficient Grouping**: Single pass through data
- **Lazy Rendering**: Only visible items rendered (future enhancement)
- **Debounced Updates**: Prevents excessive re-renders

### Memory Usage

- **Small datasets (<100 locations)**: Negligible impact
- **Medium datasets (100-500 locations)**: ~1-2MB
- **Large datasets (>500 locations)**: Consider pagination

## Customization

### Change Breakdown Column Priority

Edit `detectBreakdowns()` function:
```javascript
const breakdownColumns = [
  'gender',      // Check first
  'age_group',   // Then this
  'category',    // Then this
  'type'         // Finally this
]
```

### Change Color Thresholds

Edit `getTagType()` function:
```javascript
function getTagType(percentage) {
  if (percentage >= 25) return 'success'  // Change from 20
  if (percentage >= 15) return 'info'     // Change from 10
  if (percentage >= 8) return 'warning'   // Change from 5
  return 'default'
}
```

### Change Number Formatting

Edit `formatValue()` function:
```javascript
function formatValue(value) {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'  // 1 decimal instead of 2
  }
  // ... rest of logic
}
```

## Troubleshooting

### Issue 1: No Breakdowns Showing
**Cause**: Breakdown column not detected
**Solution**: 
- Check column names match: `gender`, `age_group`, `category`, `type`, `classification`
- Ensure column has values (not all null/empty)
- Check console for detection logs

### Issue 2: Incorrect Percentages
**Cause**: Data has duplicate rows or missing values
**Solution**:
- Verify each location+category combination appears once
- Check for null/undefined values in metric column
- Validate data before upload

### Issue 3: Performance Issues
**Cause**: Too many locations (>1000)
**Solution**:
- Apply filters to reduce visible locations
- Use pagination (future enhancement)
- Simplify data aggregation

### Issue 4: Categories Not Formatting
**Cause**: Category names need formatting
**Solution**:
- Edit `formatCategoryName()` function
- Add custom formatting rules
- Handle special cases

## API Reference

### Component Props
None - uses global Pinia store

### Emitted Events
None currently - future: `location-hover`, `location-click`

### Store Dependencies
- `dataStore.filteredData` - Current filtered dataset
- `dataStore.selectedMetric` - Currently selected metric
- `dataStore.mapLevel` - Current map level
- `dataStore.filters` - Active filters
- `dataStore.getColorForValue()` - Get color for value

## Future Enhancements

### Phase 1 (Short-term)
- [ ] Bi-directional map highlighting
- [ ] Click to zoom on map
- [ ] Export location stats to CSV
- [ ] Print-friendly view

### Phase 2 (Medium-term)
- [ ] Multiple breakdown columns simultaneously
- [ ] Custom breakdown column selection
- [ ] Comparison mode (compare two locations)
- [ ] Trend indicators (up/down arrows)

### Phase 3 (Long-term)
- [ ] Animated transitions between levels
- [ ] Mini charts in each location card
- [ ] Search/filter locations
- [ ] Pagination for large datasets
- [ ] Customizable sorting options

## Best Practices

### Data Preparation
1. **Consistent naming**: Use standard column names (gender, age_group)
2. **Complete data**: Ensure all locations have all categories
3. **Clean values**: Remove null/empty values
4. **Normalized categories**: Use consistent category names (Male vs male vs M)

### Performance
1. **Filter early**: Apply filters before aggregation
2. **Limit locations**: Show top N locations if list is very long
3. **Debounce updates**: Don't update on every keystroke
4. **Cache results**: Store computed values when possible

### User Experience
1. **Clear labels**: Use descriptive category names
2. **Helpful tooltips**: Explain what percentages mean
3. **Loading states**: Show spinner during calculations
4. **Empty states**: Handle no-data scenarios gracefully

## Conclusion

The Location Statistics feature provides a powerful way to visualize geographic data with category breakdowns. It automatically adapts to your data structure, supports multiple breakdown types, and integrates seamlessly with the map visualization.

**Key Benefits:**
- ✅ Automatic breakdown detection
- ✅ Flexible data format support
- ✅ Interactive and responsive
- ✅ Matches map color scheme
- ✅ Summary statistics included
- ✅ Easy to customize

For questions or issues, refer to the troubleshooting section or check the component source code.

---

*Last Updated: November 4, 2025*
