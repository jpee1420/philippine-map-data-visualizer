// vite.config.js
import { defineConfig } from "file:///C:/Users/Pao/Projects/vue-leaflet-echarts/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/Pao/Projects/vue-leaflet-echarts/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { fileURLToPath, URL } from "node:url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Pao/Projects/vue-leaflet-echarts/vite.config.js";
var vite_config_default = defineConfig({
  base: "/philippine-map-data-visualizer/",
  plugins: [vue()],
  build: {
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  css: {
    devSourcemap: false
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  server: {
    port: 3e3,
    sourcemapIgnoreList: (sourcePath, sourcemapPath) => true
  },
  esbuild: {
    sourcemap: false
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxQYW9cXFxcUHJvamVjdHNcXFxcdnVlLWxlYWZsZXQtZWNoYXJ0c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcUGFvXFxcXFByb2plY3RzXFxcXHZ1ZS1sZWFmbGV0LWVjaGFydHNcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL1Bhby9Qcm9qZWN0cy92dWUtbGVhZmxldC1lY2hhcnRzL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ25vZGU6dXJsJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBiYXNlOiAnL3BoaWxpcHBpbmUtbWFwLWRhdGEtdmlzdWFsaXplci8nLFxyXG4gIHBsdWdpbnM6IFt2dWUoKV0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICBtaW5pZnk6ICd0ZXJzZXInLFxyXG4gICAgdGVyc2VyT3B0aW9uczoge1xyXG4gICAgICBjb21wcmVzczoge1xyXG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcclxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIGNzczoge1xyXG4gICAgZGV2U291cmNlbWFwOiBmYWxzZVxyXG4gIH0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSlcclxuICAgIH1cclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIHNvdXJjZW1hcElnbm9yZUxpc3Q6IChzb3VyY2VQYXRoLCBzb3VyY2VtYXBQYXRoKSA9PiB0cnVlXHJcbiAgfSxcclxuICBlc2J1aWxkOiB7XHJcbiAgICBzb3VyY2VtYXA6IGZhbHNlXHJcbiAgfVxyXG5cclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VCxTQUFTLG9CQUFvQjtBQUNwVixPQUFPLFNBQVM7QUFDaEIsU0FBUyxlQUFlLFdBQVc7QUFGZ0ssSUFBTSwyQ0FBMkM7QUFJcFAsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sU0FBUyxDQUFDLElBQUksQ0FBQztBQUFBLEVBQ2YsT0FBTztBQUFBLElBQ0wsV0FBVztBQUFBLElBQ1gsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsZUFBZTtBQUFBLE1BQ2pCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILGNBQWM7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxjQUFjLElBQUksSUFBSSxTQUFTLHdDQUFlLENBQUM7QUFBQSxJQUN0RDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLHFCQUFxQixDQUFDLFlBQVksa0JBQWtCO0FBQUEsRUFDdEQ7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLFdBQVc7QUFBQSxFQUNiO0FBRUYsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
