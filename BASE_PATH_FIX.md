# Base Path Configuration Fix

## Problem
After setting `base: '/philippine-map-data-visualizer/'` in `vite.config.js`, the app was getting 404 errors for GeoJSON files and sample data.

## Root Cause
When you set a custom `base` path in Vite config, all absolute paths (starting with `/`) need to include that base path.

**Example:**
- Without base: `/data/file.geojson` → works
- With base `/app/`: `/data/file.geojson` → 404 error
- With base `/app/`: `/app/data/file.geojson` → works

## Solution
Use `import.meta.env.BASE_URL` to dynamically construct paths that work with any base configuration.

### Changes Made

#### 1. MapView.vue - GeoJSON Loading
**Before:**
```javascript
let geoJsonPath = '/data/geoBoundaries-PHL-ADM0_simplified.geojson'
```

**After:**
```javascript
const basePath = import.meta.env.BASE_URL || '/'
let geoJsonPath = `${basePath}data/geoBoundaries-PHL-ADM0_simplified.geojson`
```

#### 2. DataUploader.vue - Sample Data Loading
**Before:**
```javascript
const response = await fetch('/data/sample-data.csv')
```

**After:**
```javascript
const basePath = import.meta.env.BASE_URL || '/'
const response = await fetch(`${basePath}data/sample-data.csv`)
```

## How It Works

### Development Mode
- `import.meta.env.BASE_URL` = `/philippine-map-data-visualizer/`
- Paths become: `/philippine-map-data-visualizer/data/file.geojson`

### Production Build
- Vite automatically handles the base path
- Assets are placed in the correct subdirectory
- All paths work correctly

### Without Base Path
- `import.meta.env.BASE_URL` = `/`
- Paths become: `/data/file.geojson`
- Works as before

## Verification

### Check Console
After the fix, you should see:
```
✅ Loading GeoJSON from: /philippine-map-data-visualizer/data/geoBoundaries-PHL-ADM0_simplified.geojson
✅ GeoJSON loaded, features: 1
```

### Check Network Tab
In browser DevTools → Network tab:
- GeoJSON requests should show status `200 OK`
- URLs should include the base path

## When to Use Base Path

### Use Base Path When:
- ✅ Deploying to GitHub Pages (e.g., `username.github.io/repo-name/`)
- ✅ Deploying to subdirectory on server (e.g., `example.com/app/`)
- ✅ Multiple apps on same domain

### Don't Use Base Path When:
- ❌ Deploying to root domain (e.g., `example.com/`)
- ❌ Using custom domain with root deployment
- ❌ Local development only

## Configuration Examples

### GitHub Pages Deployment
```javascript
// vite.config.js
export default defineConfig({
  base: '/repository-name/',
  // ... rest of config
})
```

### Subdirectory Deployment
```javascript
// vite.config.js
export default defineConfig({
  base: '/my-app/',
  // ... rest of config
})
```

### Root Domain Deployment
```javascript
// vite.config.js
export default defineConfig({
  base: '/',
  // ... rest of config
})
```

### Environment-Specific Base
```javascript
// vite.config.js
export default defineConfig({
  base: process.env.NODE_ENV === 'production' 
    ? '/philippine-map-data-visualizer/' 
    : '/',
  // ... rest of config
})
```

## Building for Production

### With Base Path
```bash
npm run build
```

Output will be in `dist/` with all assets in correct subdirectories.

### Deploy to GitHub Pages
```bash
# Build
npm run build

# Deploy (if using gh-pages package)
npm run deploy
```

### Deploy to Server
1. Build the project: `npm run build`
2. Upload `dist/` contents to server subdirectory
3. Ensure server is configured to serve from subdirectory

## Testing Locally with Base Path

### Option 1: Preview Production Build
```bash
npm run build
npm run preview
```

This will serve the production build with the correct base path.

### Option 2: Update Dev Server
The dev server automatically uses the base path from config, so just run:
```bash
npm run dev
```

Access at: `http://localhost:3000/philippine-map-data-visualizer/`

## Common Issues

### Issue: 404 on Assets
**Cause**: Hardcoded absolute paths
**Solution**: Use `import.meta.env.BASE_URL` for all public assets

### Issue: Router Not Working
**Cause**: Vue Router needs base path too
**Solution**: 
```javascript
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...]
})
```

### Issue: CSS Background Images 404
**Cause**: CSS paths don't use BASE_URL
**Solution**: Use relative paths or import images in JS

### Issue: Works in Dev, Fails in Production
**Cause**: Dev server handles paths differently
**Solution**: Test with `npm run preview` before deploying

## Summary

✅ **Fixed**: All GeoJSON and sample data paths now use `import.meta.env.BASE_URL`
✅ **Works**: With or without custom base path
✅ **Ready**: For deployment to GitHub Pages or subdirectories

The app will now work correctly whether deployed to:
- Root domain: `example.com/`
- Subdirectory: `example.com/app/`
- GitHub Pages: `username.github.io/repo-name/`
