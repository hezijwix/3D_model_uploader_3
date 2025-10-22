# 3D Model Viewer - Product Overview

## Product Description

A professional 3D model viewer tool that enables users to upload 3D models (GLB, GLTF, FBX) and create high-quality renders with advanced lighting, shadows, and customizable backgrounds. Built with Three.js r162+ and designed for graphic designers, product photographers, and 3D artists.

**Core Value**: Transform 3D models into professional marketing materials with cinema-quality lighting and flexible export options.

## Key Features

- **Professional HDRI Lighting**: Image-Based Lighting (IBL) with 7 curated 2K HDR environments from Poly Haven
- **Automatic Sun Extraction**: Cinema 4D/Redshift-style directional shadows from HDRI brightest point
- **Dual-Canvas Architecture**: Accurate background colors independent of 3D rendering
- **World-Space Transforms**: Intuitive rotation controls without gimbal lock
- **Turntable Animation**: Product display with continuous rotation
- **High-Resolution Export**: 1x (1920×1080), 2x (4K), 4x (8K) scaling options
- **Flexible Backgrounds**: Solid colors, transparent, or custom images

## Technical Stack

- **Three.js r162+**: Core 3D rendering engine
- **Loaders**: GLTFLoader, FBXLoader, RGBELoader
- **Architecture**: Modular JavaScript with dual-canvas rendering
- **Styling**: Custom CSS design system with dark theme

## Development Guidelines

### Before Implementing New Features

1. **Check Context7**: Search for Three.js patterns and best practices
   - Example: "Three.js environment rotation", "Three.js shadow optimization"
   - Use for official API documentation and implementation patterns

2. **Web Search for Recent Updates**: Three.js evolves rapidly
   - Check for version-specific changes (currently using r162+)
   - Verify deprecated APIs and modern replacements
   - Example: `outputEncoding` → `outputColorSpace` (r162+)

3. **Test with MCP Tools**: Use Playwright for automated testing
   - Test model loading across different formats
   - Validate export functionality at all resolutions
   - Check HDRI rotation performance and visual accuracy

### Code Organization

- **3d-viewer.js**: Core Three.js scene, rendering, model loading
- **3d-ui.js**: UI control event handlers and state management
- **3d-config.js**: Configuration, presets, default values
- **HTML**: Clean structure following template design patterns
- **CSS**: Reuse existing modular design system (styles/ directory)

### Testing Workflow

```bash
# 1. Test with sample models (different formats)
# - GLB: Binary GLTF (recommended)
# - GLTF: Text-based with external assets
# - FBX: Legacy format from 3D software

# 2. Verify HDRI functionality
# - Test all 7 presets
# - Validate rotation affects both lighting and shadows
# - Confirm sun light follows brightest point

# 3. Export validation
# - Test all resolution scales (1x, 2x, 4x)
# - Verify background compositing (color, transparent, image)
# - Check HDRI background exports correctly

# 4. Performance testing
# - Monitor FPS during turntable animation
# - Test with complex models (high poly count)
# - Verify shadow quality settings impact
```

### Common Pitfalls to Avoid

1. **Canvas Initialization**: Set canvas dimensions BEFORE Three.js initialization
2. **HDRI Rotation**: Use `scene.environmentRotation` (r162+), not texture rotation
3. **Export Buffer**: Always set `preserveDrawingBuffer: true` in renderer
4. **Material Environment**: Use `scene.environment`, not direct `material.envMap`
5. **Background Colors**: Use dual-canvas to avoid tone mapping interference
6. **World Rotations**: Build rotation matrices for gimbal-lock-free transforms

### Performance Optimization

- **HDRI Resolution**: Use 2K HDR images (balance quality/performance)
- **Shadow Quality**: Default 2048×2048 (adjustable 1024-4096)
- **Pixel Ratio**: Cap at 2x to prevent GPU overload
- **Model Optimization**: Encourage <50MB GLB files

### When to Consult Documentation

- **Three.js Changes**: Always check Context7 for version-specific APIs
- **HDRI Issues**: Search for PBR material workflows and IBL techniques
- **Export Problems**: Research canvas compositing and high-res rendering
- **Performance**: Look for optimization patterns and GPU best practices

### Development Philosophy

- **Evidence Over Assumptions**: Test visual output at each step
- **Modularity**: Keep rendering, UI, and config separate
- **User Experience**: Optimize for 60fps during interactions
- **Quality Exports**: Prioritize final render quality over preview speed

## Quick Start for Development

```javascript
// 1. Initialize viewer
const viewer = new ModelViewer();

// 2. Load default HDRI
viewer.loadHDRI('studio');

// 3. Load model
viewer.loadModel(file);

// 4. Customize settings
viewer.hdriIntensity = 1.5;
viewer.sunIntensity = 2.0;

// 5. Export
renderHighResolution(targetCanvas, scale);
```

## Resources

- **Three.js Docs**: Use Context7 MCP for r162+ documentation
- **HDRIs**: [Poly Haven](https://polyhaven.com/hdris) - Free 2K/4K HDR images
- **PBR Guide**: Search for physically-based rendering materials
- **Tool Guidelines**: See tool_guidelines.md for detailed architecture

---

**Last Updated**: 2025-10-22
**Three.js Version**: r162+
**Maintained by**: Studio Video Team
