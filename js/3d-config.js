/**
 * 3D Model Viewer - Configuration
 *
 * Contains HDRI presets, calibrated sun positions, and default settings
 */

const ViewerConfig = {
    // Canvas resolution (Default: 1080×1350 vertical format)
    canvas: {
        width: 1080,
        height: 1350,
        aspectRatio: 1080 / 1350
    },

    // Camera settings
    camera: {
        fov: 45,
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 0, z: 5 }
    },

    // Renderer settings
    renderer: {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true, // CRITICAL for exports
        pixelRatioMax: 2, // Cap for performance
        clearColor: 0x000000,
        clearAlpha: 0 // Transparent by default
    },

    // HDRI Presets (Premium 2K quality from Poly Haven)
    hdriPresets: {
        studio: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/photo_studio_loft_hall_2k.hdr',
        sunset: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/venice_sunset_2k.hdr',
        outdoor: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_48d_partly_cloudy_puresky_2k.hdr',
        warehouse: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/industrial_sunset_puresky_2k.hdr',
        night: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/moonlit_golf_2k.hdr',
        autumn: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/autumn_crossing_2k.hdr',
        urban: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/urban_alley_01_2k.hdr'
    },

    // Manually calibrated sun positions for accurate directional lighting
    // Calibration date: 2025-10-21T15:32:34.875Z
    hdriSunPositions: {
        studio: {
            uv: [0.5379793510324484, 0.4930862831858407],
            direction: [0.23631718059217147, -0.021718374207907128, 0.9714332207510367]
        },
        sunset: {
            uv: [0.5859144542772862, 0.47022492625368734],
            direction: [0.5117315358156711, -0.09340479924989314, 0.8540529133073791]
        },
        outdoor: {
            uv: [0.5918141592920354, 0.24234882005899705],
            direction: [0.37628660383620194, -0.7238975294890294, 0.5782566545860904]
        },
        warehouse: {
            uv: [0.5527286135693216, 0.4746497050147493],
            direction: [0.3242450616340675, -0.07955613972374084, 0.9426218545303182]
        },
        night: {
            uv: [0.5542035398230089, 0.2718473451327434],
            direction: [0.251833791678793, -0.6569474036647028, 0.7106334147694495]
        },
        autumn: {
            uv: [0.7230825958702065, 0.09854351032448377],
            direction: [0.30031513481164146, -0.9524605234566362, 0.05128129346824372]
        },
        urban: {
            uv: [0.5114306784660767, 0.3662426253687316],
            direction: [0.06551648024816516, -0.40795327511423385, 0.9106490631079911]
        }
    },

    // Lighting defaults
    lighting: {
        hdriIntensity: 1.0,
        hdriRotation: 0,
        hdriBackgroundVisible: false,
        sunEnabled: true,
        sunIntensity: 2.0,
        sunAzimuth: 180, // Horizontal rotation (0-360°)
        sunElevation: 45, // Vertical angle (-90 to 90°)
        sunColor: '#ffffff',
        sunDistance: 20, // Far enough to act as directional light
        ambientIntensity: 0.1,
        shadowQuality: 2048, // Shadow map resolution
        shadowBias: -0.0001,
        shadowRadius: 4, // Soft shadow edges
        shadowSoftness: 4, // 1-10 scale
        shadowIntensity: 0.5 // 0-1 opacity control
    },

    // Model defaults
    model: {
        autoCenter: true,
        autoScale: true,
        targetSize: 2, // Units to scale model to
        enableShadows: true
    },

    // Shader presets (preserves textures, modifies surface properties only)
    shaderPresets: {
        custom: {
            // Original material properties (no override)
            roughness: null,
            metalness: null,
            transmission: null,
            clearcoat: null
        },
        metallic: {
            roughness: 0.1,
            metalness: 1.0,
            transmission: 0.0,
            clearcoat: 0.0
        },
        plastic: {
            roughness: 0.3,
            metalness: 0.0,
            transmission: 0.0,
            clearcoat: 0.8
        },
        glass: {
            roughness: 0.0,
            metalness: 0.0,
            transmission: 0.9,
            clearcoat: 1.0
        },
        matte: {
            roughness: 1.0,
            metalness: 0.0,
            transmission: 0.0,
            clearcoat: 0.0
        },
        glossy: {
            roughness: 0.2,
            metalness: 0.5,
            transmission: 0.0,
            clearcoat: 0.5
        }
    },

    // Transform defaults
    transform: {
        scale: 1.0,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
    },

    // Animation defaults
    animation: {
        orbitEnabled: false, // Manual camera control with OrbitControls
        turntableEnabled: false,
        turntableSpeedX: 0.0, // -2 to 2
        turntableSpeedY: 1.0, // -2 to 2
        turntableSpeedZ: 0.0, // -2 to 2
        turntableRotationSpeed: 0.01 // Base radians per frame
    },

    // Background defaults
    background: {
        color: '#1a1a1a',
        transparent: false,
        image: null,
        imageFit: 'cover' // 'cover', 'contain', 'fill'
    },

    // Export settings
    export: {
        scales: [
            { scale: 1, label: '1× (1920×1080)', description: 'Full HD' },
            { scale: 2, label: '2× (3840×2160)', description: '4K' },
            { scale: 4, label: '4× (7680×4320)', description: '8K' }
        ],
        format: 'image/png',
        quality: 1.0
    },

    // Performance settings
    performance: {
        targetFPS: 60,
        hdriRotationDebounce: 300 // ms
    },

    // File size limits (recommended)
    limits: {
        model: 100 * 1024 * 1024, // 100MB
        backgroundImage: 10 * 1024 * 1024 // 10MB
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ViewerConfig = ViewerConfig;
}
