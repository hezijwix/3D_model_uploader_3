# 3D Model Viewer - Testing Guide

## Quick Start Testing

### 1. Open the Tool

**Option A: Direct File Access**
```bash
open 3d-model-viewer.html
```

**Option B: Local Server (Recommended)**
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to: `http://localhost:8000/3d-model-viewer.html`

---

## Test Checklist

### ✅ Core Functionality

#### 1. Model Loading
- [ ] Upload GLB file (recommended format)
- [ ] Upload GLTF file
- [ ] Upload FBX file
- [ ] Verify model appears centered
- [ ] Verify model auto-scales to fit view
- [ ] Check that remove button (×) clears model

**Test Models** (free downloads):
- Poly Haven: https://polyhaven.com/models
- Sketchfab (CC0): https://sketchfab.com/search?licenses=322a749bcfa841b29dff1e8a1bb74b0b&type=models

#### 2. Transform Controls
- [ ] Scale slider (0.1 to 5.0) - model resizes
- [ ] Position X slider (-5 to 5) - model moves horizontally
- [ ] Position Y slider (-5 to 5) - model moves vertically
- [ ] Rotation X slider (0° to 360°) - model pitches
- [ ] Rotation Y slider (0° to 360°) - model yaws
- [ ] Rotation Z slider (0° to 360°) - model rolls
- [ ] Verify no gimbal lock (test at 90° increments)

#### 3. HDRI Lighting System
- [ ] Change HDRI preset (7 options available)
- [ ] Each preset loads successfully
- [ ] Environment lighting updates on model
- [ ] HDRI rotation slider (0° to 360°)
- [ ] Rotation affects both lighting AND shadows
- [ ] HDRI intensity slider (0 to 3)
- [ ] Toggle "Show HDRI Background" checkbox
- [ ] Background displays HDR environment when checked

#### 4. Sun Light System
- [ ] Toggle "Enable Sun Light" checkbox
- [ ] Shadows appear/disappear correctly
- [ ] Sun intensity slider (0 to 5)
- [ ] Shadows update with HDRI rotation
- [ ] Change shadow quality (Low/Medium/High)
- [ ] Higher quality = sharper shadows

#### 5. Animation
- [ ] Toggle "Enable Turntable" checkbox
- [ ] Model rotates continuously
- [ ] Turntable speed slider (0.1 to 3)
- [ ] Speed changes affect rotation rate

#### 6. Background System
- [ ] Change background color with color picker
- [ ] Toggle "Transparent Background" checkbox
- [ ] Checkered pattern appears when transparent
- [ ] Upload background image
- [ ] Image displays correctly
- [ ] Change image fit mode (Fill/Fit/Stretch)
- [ ] Remove background image with (×) button

#### 7. Export Functionality
- [ ] Click "Export Image" button
- [ ] Modal appears with resolution options
- [ ] Click "1× (1920×1080)" - Full HD preview
- [ ] Click "2× (3840×2160)" - 4K preview
- [ ] Click "4× (7680×4320)" - 8K preview
- [ ] Preview canvas displays correctly
- [ ] Click "Download PNG" button
- [ ] PNG file downloads successfully
- [ ] Exported image matches preview
- [ ] Background composites correctly

---

## Browser Compatibility

### Recommended
- ✅ Chrome 90+ (Best performance)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Requirements
- WebGL 2.0 support
- ES6 modules support
- File API support

---

## Performance Benchmarks

### Expected Performance
- **60 FPS**: Static model with 2K HDRI
- **60 FPS**: Turntable animation with medium shadows
- **45-55 FPS**: Complex models (>500K triangles)
- **30-45 FPS**: High shadow quality (4096×4096)

### Export Times (Approximate)
- **1× (Full HD)**: <1 second
- **2× (4K)**: 1-2 seconds
- **4× (8K)**: 3-5 seconds

---

## Common Issues & Solutions

### Issue: Black Canvas on Load
**Solution**: Background hasn't rendered yet. Wait 1-2 seconds for HDRI to load.

### Issue: Model Too Small/Large
**Solution**: Auto-scaling should handle this. If not, use Scale slider manually.

### Issue: Shadows Not Appearing
**Solution**:
1. Ensure "Enable Sun Light" is checked
2. Check model has sufficient polygon detail
3. Try increasing shadow quality

### Issue: HDRI Rotation Laggy
**Solution**: This is expected during slider movement. Final quality is rendered after 300ms delay.

### Issue: Export Shows Blank/Black Image
**Solution**: WebGL context may be lost. Refresh page and try again.

### Issue: CORS Error Loading HDRI
**Solution**: Must use local server (not file:// protocol) for HDRI downloads from Poly Haven.

---

## Advanced Testing

### 1. Test Different Model Types
- **Low Poly** (<10K triangles): Performance test
- **Medium Poly** (50K-100K triangles): Standard use case
- **High Poly** (>500K triangles): Stress test

### 2. Test Different Materials
- **PBR Materials**: Metallic/roughness workflow
- **Standard Materials**: Basic diffuse/specular
- **Textured Models**: With embedded textures
- **Untextured Models**: Pure geometry

### 3. Test Background Combinations
- **Solid Color + Transparent Model Parts**
- **HDRI Background + Reflective Model**
- **Custom Image + Model with Alpha**
- **Transparent Export + Import to Photoshop**

### 4. Test Edge Cases
- **Very Large Files** (>50MB)
- **Complex Hierarchies** (nested groups)
- **Animated Models** (should show first frame)
- **Models with Multiple Materials**

---

## Console Logging

Open browser DevTools (F12) to view detailed logs:

### Expected Console Output
```
🚀 Initializing 3D Model Viewer...
  ✓ Scene created with dual-canvas architecture
  ✓ Background canvas layer created
  ✓ Camera initialized
  ✓ Renderer initialized with IBL support
  ✓ Lighting system initialized (sun + ambient)
  ✓ Loaders initialized (GLTF, FBX, RGBE)
✅ 3D Model Viewer initialized successfully
🔄 Loading HDRI: studio...
  ✓ HDRI texture loaded, generating environment map...
  ✓ Using calibrated sun position
✅ HDRI loaded: studio
🎛️ Initializing UI controls...
✅ UI controls initialized
```

### When Loading Model
```
📦 Loading model: example.glb...
  Loading: 100%
✅ GLTF loaded: example.glb
  ✓ Model processed (centered, scaled, shadows enabled)
  ✓ Enabled shadows for 42 meshes
```

### When Exporting
```
📸 Exporting at 2× resolution...
📸 Rendering high-resolution export (2×)...
✅ Export completed (3840×2160)
✅ Image downloaded (2×)
```

---

## Reporting Issues

If you encounter issues, please provide:

1. **Browser & Version**: Chrome 120, Firefox 115, etc.
2. **Operating System**: macOS, Windows, Linux
3. **Model Format & Size**: GLB, 25MB
4. **Console Errors**: Copy from DevTools Console
5. **Steps to Reproduce**: Detailed sequence
6. **Screenshots**: Visual evidence of issue

---

## Next Steps

1. **Test with Your Models**: Upload your own 3D assets
2. **Experiment with HDRI**: Try all 7 presets
3. **Create High-Res Renders**: Export at 4× for print quality
4. **Share Feedback**: Report bugs or suggest features

---

**Happy Testing! 🚀**
