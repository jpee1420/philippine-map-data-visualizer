# CSV Import Troubleshooting Guide

## Required CSV Format

Your CSV file **must** have these column names (case-sensitive):

### Location Columns (at least one required):
- `region` - For region-level data (e.g., "Ilocos Region", "NCR", "Region I")
- `province` - For province-level data (e.g., "La Union", "Ilocos Norte")
- `city` - For city/municipality data (e.g., "San Fernando City", "Manila")

### Data Columns:
- Any numeric columns for metrics (e.g., `population`, `gdp_millions`, `poverty_rate`)

## Example CSV Structure

```csv
region,province,city,population,poverty_rate
Ilocos Region,Ilocos Norte,,580,000,15.2
Ilocos Region,Ilocos Sur,,690,000,18.5
Ilocos Region,La Union,,850,000,16.8
Ilocos Region,Pangasinan,,3,163,000,14.3
```

## Common Issues & Solutions

### Issue 1: "Map doesn't show any data"
**Cause:** Column names don't match exactly
**Solution:** 
- Column names must be lowercase: `region`, `province`, `city`
- NOT: `Region`, `REGION`, `Province`, `City`

### Issue 2: "Some regions show white boundaries"
**Cause:** No data available for that location
**Solution:** 
- This is now expected behavior - white = no data
- Check if your CSV has data for all regions/provinces you're viewing

### Issue 3: "Region names don't match"
**Supported Aliases:**
- NCR = National Capital Region = Metro Manila
- CAR = Cordillera Administrative Region
- Region I = Ilocos Region = R1
- Region II = Cagayan Valley = R2
- etc.

## Debugging Steps

1. **Open Browser Console** (F12)
2. **Import your CSV file**
3. **Look for these log messages:**

```
📁 Importing file: your-file.csv
✅ Parsed data: 100 rows
📊 First row sample: {region: "Ilocos Region", province: "Ilocos Norte", ...}
📋 Column names: ["region", "province", "city", "population", ...]
🗺️ Location columns found: {hasRegion: true, hasProvince: true, hasCity: false}
```

4. **Check for errors:**
   - If column names are wrong, you'll see: `hasRegion: false`
   - If parsing failed, you'll see: `❌ Import error: ...`

## CSV Template

Download or create a CSV with this structure:

```csv
region,province,city,population,employment_rate,poverty_rate,gdp_millions
Ilocos Region,Ilocos Norte,,580000,94.5,15.2,125000
Ilocos Region,Ilocos Sur,,690000,93.8,18.5,98000
Ilocos Region,La Union,,850000,95.2,16.8,145000
Ilocos Region,Pangasinan,,3163000,94.1,14.3,380000
```

## Changes Made

### 1. White Color for No Data
- Boundaries with no data now show **white** instead of gray
- Makes it clear which areas are missing data

### 2. Enhanced Logging
- Console now shows detailed import information
- Helps identify column name issues
- Shows first row sample for verification

## Testing Your CSV

1. Open the app
2. Open Browser Console (F12)
3. Click "Upload File" and select your CSV
4. Check console for:
   - ✅ Success messages
   - 📋 Column names detected
   - 🗺️ Location columns found
5. If import succeeds but map is blank:
   - Check if column names match exactly
   - Verify location names match GeoJSON boundaries
   - Look for white boundaries (= no data matched)

## Need Help?

If you still have issues:
1. Share the console log output
2. Share first 3 rows of your CSV
3. Specify which map level you're viewing (regions/provinces/cities)
