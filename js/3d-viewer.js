/**
 * 3D Model Viewer - Core Three.js Logic
 *
 * Handles scene setup, rendering, HDRI lighting, model loading, and exports
 * Uses dual-canvas architecture for accurate background rendering
 */

class ModelViewer {
    constructor(canvasId = 'three-canvas') {
        // Canvas and rendering
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element '${canvasId}' not found`);
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Model and transforms
        this.currentModel = null;
        this.modelContainer = null; // Container for transforms
        this.currentShaderPreset = 'custom';
        this.originalMaterials = new Map(); // Store original material properties

        // Background rendering (removed separate canvas, now handled by Three.js scene.background)
        this.backgroundImage = null;
        this.backgroundVideo = null;
        this.backgroundVideoTexture = null; // Cache video texture for performance
        this.backgroundImageFit = ViewerConfig.background.imageFit;
        this.backgroundColor = ViewerConfig.background.color;

        // Foreground rendering (PNG overlays)
        this.foregroundCanvas = null;
        this.foregroundCtx = null;
        this.foregroundImage = null;

        // HDRI environment
        this.pmremGenerator = null;
        this.currentHDRI = null;
        this.originalHDRITexture = null;
        this.hdriIntensity = ViewerConfig.lighting.hdriIntensity;
        this.hdriRotation = ViewerConfig.lighting.hdriRotation;
        this.hdriBackgroundVisible = ViewerConfig.lighting.hdriBackgroundVisible;

        // Sun light system (User-controlled directional light)
        this.sunLight = null;
        this.sunIntensity = ViewerConfig.lighting.sunIntensity;
        this.sunAzimuth = ViewerConfig.lighting.sunAzimuth;
        this.sunElevation = ViewerConfig.lighting.sunElevation;
        this.sunColor = ViewerConfig.lighting.sunColor;
        this.sunEnabled = ViewerConfig.lighting.sunEnabled;
        this.shadowQuality = ViewerConfig.lighting.shadowQuality;
        this.shadowSoftness = ViewerConfig.lighting.shadowSoftness;
        this.shadowIntensity = ViewerConfig.lighting.shadowIntensity;

        // Camera controls
        this.orbitControls = null;
        this.orbitEnabled = ViewerConfig.animation.orbitEnabled;

        // Animation
        this.animationEnabled = ViewerConfig.animation.animationEnabled;
        this.animationMode = ViewerConfig.animation.animationMode;

        // Turntable animation
        this.turntableSpeedX = ViewerConfig.animation.turntableSpeedX;
        this.turntableSpeedY = ViewerConfig.animation.turntableSpeedY;
        this.turntableSpeedZ = ViewerConfig.animation.turntableSpeedZ;

        // Sine wave animation
        this.sineAmplitudeX = ViewerConfig.animation.sineAmplitudeX;
        this.sineAmplitudeY = ViewerConfig.animation.sineAmplitudeY;
        this.sineAmplitudeZ = ViewerConfig.animation.sineAmplitudeZ;
        this.sineFrequencyX = ViewerConfig.animation.sineFrequencyX;
        this.sineFrequencyY = ViewerConfig.animation.sineFrequencyY;
        this.sineFrequencyZ = ViewerConfig.animation.sineFrequencyZ;
        this.sineTime = 0; // Time accumulator for sine wave

        this.animationFrameId = null;

        // Store initial rotation state for animation reset
        this.rotationBeforeAnimation = null;

        // Export state
        this.isRecording = false;

        // Debounce timer for HDRI rotation
        this.hdriRotationTimer = null;

        // Loaders
        this.gltfLoader = null;
        this.fbxLoader = null;
        this.rgbeLoader = null;
        this.textureLoader = null;

        // Path Tracing
        this.pathTracer = null;
        this.pathTracingEnabled = false;
        this.pathTracingQuality = 'medium';
        this.targetSamples = 200;
        this.pathTracingPresets = {
            fast: { bounces: 5, minSamples: 3, targetSamples: 50 },
            medium: { bounces: 10, minSamples: 5, targetSamples: 200 },
            high: { bounces: 15, minSamples: 10, targetSamples: 1000 },
            ultra: { bounces: 20, minSamples: 20, targetSamples: 5000 }
        };

        // Interactive path tracing state
        this.isInteracting = false;
        this.interactionTimeout = null;
        this.interactionDelay = 300; // ms to wait after interaction stops before resuming path tracing

        // Initialize
        this.init();
    }

    init() {
        console.log('🚀 Initializing 3D Model Viewer...');

        this.setupCanvasDimensions();
        this.setupScene();
        this.setupCamera();
        this.setupOrbitControls();
        this.setupRenderer();
        this.setupLights();
        this.setupLoaders();
        this.loadDefaultHDRI();
        this.animate();

        console.log('✅ 3D Model Viewer initialized successfully');
    }

    // ========== INITIALIZATION ==========

    setupCanvasDimensions() {
        // Set canvas dimensions to match user input exactly (no pixel ratio multiplier)
        this.canvas.width = ViewerConfig.canvas.width;
        this.canvas.height = ViewerConfig.canvas.height;
        console.log(`Canvas dimensions: ${this.canvas.width}×${this.canvas.height}`);
    }

    resizeCanvas(width, height) {
        // Update canvas dimensions exactly as specified (no pixel ratio multiplier)
        this.canvas.width = width;
        this.canvas.height = height;

        // Update foreground canvas
        if (this.foregroundCanvas) {
            this.foregroundCanvas.width = width;
            this.foregroundCanvas.height = height;
            this.updateForegroundCanvas(); // Redraw foreground image at new size
        }

        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Update renderer size (do NOT apply pixel ratio here - keep 1:1 mapping)
        this.renderer.setSize(width, height, false);
        this.renderer.setPixelRatio(1); // Force 1:1 ratio for exact dimensions

        // Update background
        this.updateCanvasBackground();

        console.log(`Canvas resized: ${width}×${height}`);
    }

    setupScene() {
        this.scene = new THREE.Scene();

        // Initialize default background color
        this.scene.background = new THREE.Color(this.backgroundColor);

        // Initialize rotation properties for HDRI (Three.js r162+)
        this.scene.environmentRotation = new THREE.Euler();
        this.scene.backgroundRotation = new THREE.Euler();

        // Create model container for transforms
        this.modelContainer = new THREE.Group();
        this.scene.add(this.modelContainer);

        // Create foreground canvas layer for PNG overlays
        this.setupForegroundCanvas();

        console.log('  ✓ Scene created with single Three.js canvas + foreground overlay');
    }

    setupForegroundCanvas() {
        // Use existing foreground canvas from HTML or create one
        this.foregroundCanvas = document.getElementById('foreground-canvas');
        if (!this.foregroundCanvas) {
            this.foregroundCanvas = document.createElement('canvas');
            this.foregroundCanvas.id = 'foreground-canvas';
            const container = this.canvas.parentNode;
            container.appendChild(this.foregroundCanvas);
        }

        // Match dimensions to main canvas
        this.foregroundCanvas.width = this.canvas.width;
        this.foregroundCanvas.height = this.canvas.height;

        this.foregroundCtx = this.foregroundCanvas.getContext('2d');

        console.log('  ✓ Foreground canvas layer created');
    }

    setupCamera() {
        const aspect = ViewerConfig.canvas.aspectRatio;
        this.camera = new THREE.PerspectiveCamera(
            ViewerConfig.camera.fov,
            aspect,
            ViewerConfig.camera.near,
            ViewerConfig.camera.far
        );

        this.camera.position.set(
            ViewerConfig.camera.position.x,
            ViewerConfig.camera.position.y,
            ViewerConfig.camera.position.z
        );
        this.camera.lookAt(0, 0, 0);

        console.log('  ✓ Camera initialized');
    }

    setupOrbitControls() {
        // Create OrbitControls for manual camera control
        if (!window.OrbitControls) {
            console.warn('⚠️ OrbitControls not available');
            return;
        }

        this.orbitControls = new window.OrbitControls(this.camera, this.canvas);

        // Configure controls
        this.orbitControls.enableDamping = true; // Smooth camera movement
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.enableZoom = true;
        this.orbitControls.enablePan = true;
        this.orbitControls.enableRotate = true;

        // Set initial state based on config
        this.orbitControls.enabled = this.orbitEnabled;

        // Add event listeners for path tracing interaction
        this.orbitControls.addEventListener('start', () => {
            if (this.pathTracingEnabled && this.pathTracer) {
                this.isInteracting = true;
                console.log('🎮 Orbit started - switching to standard render');

                // Clear any pending timeout
                if (this.interactionTimeout) {
                    clearTimeout(this.interactionTimeout);
                    this.interactionTimeout = null;
                }
            }
        });

        this.orbitControls.addEventListener('end', () => {
            if (this.pathTracingEnabled && this.pathTracer) {
                console.log('🎯 Orbit ended - preparing to resume path tracing');

                // Set timeout to resume path tracing after interaction stops
                this.interactionTimeout = setTimeout(() => {
                    this.isInteracting = false;
                    console.log('🎨 Orbit settled - resuming path tracing');

                    // Force scene update before updating path tracer
                    this.scene.updateMatrixWorld(true);

                    // Update path tracer with new camera position
                    this.pathTracer.setScene(this.scene, this.camera);

                    console.log('✅ Path tracer updated with new camera position');
                }, this.interactionDelay);
            }
        });

        console.log('  ✓ Orbit controls initialized with path tracing support');
    }

    setupRenderer() {
        // Try to get WebGL 2.0 context explicitly for path tracing support
        let gl = null;
        try {
            gl = this.canvas.getContext('webgl2', {
                antialias: ViewerConfig.renderer.antialias,
                alpha: ViewerConfig.renderer.alpha,
                preserveDrawingBuffer: ViewerConfig.renderer.preserveDrawingBuffer,
                powerPreference: 'high-performance'
            });
        } catch (e) {
            console.warn('⚠️ WebGL 2.0 context creation failed:', e);
        }

        if (gl) {
            console.log('  ✓ WebGL 2.0 context created (path tracing available)');
        } else {
            console.warn('⚠️ WebGL 2.0 not supported, falling back to WebGL 1.0');
            console.warn('  Path tracing features will not be available');
        }

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            context: gl || undefined, // Use WebGL 2.0 if available, fallback to WebGL 1.0
            antialias: ViewerConfig.renderer.antialias,
            alpha: ViewerConfig.renderer.alpha,
            preserveDrawingBuffer: ViewerConfig.renderer.preserveDrawingBuffer
        });

        this.renderer.setSize(this.canvas.width, this.canvas.height, false);
        this.renderer.setPixelRatio(1); // Always 1:1 for exact dimensions matching toolbar input

        // Color management (r162+)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping; // Default
        this.renderer.toneMappingExposure = 1.0;

        // Transparent clear color
        this.renderer.setClearColor(
            ViewerConfig.renderer.clearColor,
            ViewerConfig.renderer.clearAlpha
        );

        // Enable shadows with VSM for radius support
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;

        // Setup PMREMGenerator for IBL
        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        console.log('  ✓ Renderer initialized with IBL support');
        console.log(`  ✓ WebGL Version: ${this.renderer.capabilities.isWebGL2 ? '2.0' : '1.0'}`);
    }

    setupLights() {
        // Ambient light as fallback
        const ambientLight = new THREE.AmbientLight(0xffffff, ViewerConfig.lighting.ambientIntensity);
        this.scene.add(ambientLight);

        // Sun light (User-controlled directional light with shadows)
        const sunColor = new THREE.Color(this.sunColor);
        this.sunLight = new THREE.DirectionalLight(sunColor, this.sunIntensity);
        this.sunLight.castShadow = true;

        // Configure shadow camera
        this.sunLight.shadow.mapSize.width = this.shadowQuality;
        this.sunLight.shadow.mapSize.height = this.shadowQuality;
        this.sunLight.shadow.camera.near = 0.1;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.camera.left = -10;
        this.sunLight.shadow.camera.right = 10;
        this.sunLight.shadow.camera.top = 10;
        this.sunLight.shadow.camera.bottom = -10;

        // Shadow softness (VSM supports radius parameter)
        this.sunLight.shadow.radius = this.shadowSoftness;
        this.sunLight.shadow.blurSamples = 8; // Quality of blur for VSM

        // Shadow intensity control via bias (affects darkness/prevents shadow acne)
        this.sunLight.shadow.bias = -0.0001 * this.shadowIntensity;

        // Initial position from azimuth and elevation
        this.updateSunLightPosition();

        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        console.log('  ✓ Lighting system initialized (user-controlled sun + ambient)');
    }

    setupLoaders() {
        this.gltfLoader = new window.GLTFLoader();
        this.fbxLoader = new window.FBXLoader();
        this.rgbeLoader = new window.RGBELoader();
        this.rgbeLoader.setDataType(THREE.HalfFloatType);
        this.textureLoader = new THREE.TextureLoader();

        console.log('  ✓ Loaders initialized (GLTF, FBX, RGBE)');
    }

    // ========== HDRI SYSTEM ==========

    loadDefaultHDRI() {
        this.loadHDRI('studio');
    }

    loadHDRI(presetName) {
        const hdriUrl = ViewerConfig.hdriPresets[presetName];

        console.log(`🔄 Loading HDRI: ${presetName}...`);

        this.rgbeLoader.load(
            hdriUrl,
            (texture) => {
                console.log('  ✓ HDRI texture loaded, generating environment map...');

                // Set texture mapping
                texture.mapping = THREE.EquirectangularReflectionMapping;

                // Store original texture for rotation
                if (this.originalHDRITexture) {
                    this.originalHDRITexture.dispose();
                }
                this.originalHDRITexture = texture.clone();
                this.originalHDRITexture.mapping = THREE.EquirectangularReflectionMapping;

                // Generate environment with current rotation
                this.generateRotatedEnvironment(texture, this.hdriRotation * Math.PI / 180);

                // Apply to model if exists
                if (this.currentModel) {
                    this.applyEnvironmentToModel();
                }

                // Reset path tracing if active (new environment)
                if (this.pathTracingEnabled && this.pathTracer) {
                    this.pathTracer.reset();
                }

                console.log(`✅ HDRI loaded: ${presetName}`);
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`  Loading: ${percent}%`);
                }
            },
            (error) => {
                console.error('❌ Error loading HDRI:', error);
            }
        );
    }

    analyzeHDRIBrightestPoint(texture) {
        console.log('🔍 Analyzing HDRI for brightest point...');

        const sampleWidth = 512;
        const sampleHeight = 256;

        // Create temporary scene to render HDRI
        const tempScene = new THREE.Scene();
        const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            toneMapped: false
        });
        const plane = new THREE.Mesh(geometry, material);
        tempScene.add(plane);

        // Render to float buffer
        const renderTarget = new THREE.WebGLRenderTarget(sampleWidth, sampleHeight, {
            type: THREE.FloatType,
            format: THREE.RGBAFormat
        });

        this.renderer.setRenderTarget(renderTarget);
        this.renderer.render(tempScene, tempCamera);

        // Read pixels
        const pixelBuffer = new Float32Array(sampleWidth * sampleHeight * 4);
        this.renderer.readRenderTargetPixels(renderTarget, 0, 0, sampleWidth, sampleHeight, pixelBuffer);
        this.renderer.setRenderTarget(null);

        // Find brightest pixel
        let maxLuminance = 0;
        let brightestU = 0.5;
        let brightestV = 0.5;

        for (let y = 0; y < sampleHeight; y++) {
            for (let x = 0; x < sampleWidth; x++) {
                const idx = (y * sampleWidth + x) * 4;
                const r = pixelBuffer[idx];
                const g = pixelBuffer[idx + 1];
                const b = pixelBuffer[idx + 2];

                // Rec. 709 luminance
                const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

                if (luminance > maxLuminance) {
                    maxLuminance = luminance;
                    brightestU = x / sampleWidth;
                    brightestV = 1.0 - (y / sampleHeight);
                }
            }
        }

        console.log(`  ✓ Brightest point: UV(${brightestU.toFixed(3)}, ${brightestV.toFixed(3)})`);

        // Cleanup
        renderTarget.dispose();
        geometry.dispose();
        material.dispose();

        return this.equirectUVToDirection(brightestU, brightestV);
    }

    equirectUVToDirection(u, v) {
        const phi = (u - 0.5) * Math.PI * 2;
        const theta = (v - 0.5) * Math.PI;

        const x = Math.cos(theta) * Math.sin(phi);
        const y = Math.sin(theta);
        const z = Math.cos(theta) * Math.cos(phi);

        return new THREE.Vector3(x, y, z).normalize();
    }

    generateRotatedEnvironment(texture, rotationRadians) {
        console.log(`🔄 Generating environment (rotation: ${(rotationRadians * 180 / Math.PI).toFixed(1)}°)`);

        // Generate PMREM from equirectangular
        if (this.currentHDRI) {
            this.currentHDRI.dispose();
        }
        const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;

        // Apply to scene lighting
        this.scene.environment = envMap;
        this.currentHDRI = envMap;

        // Rotate using r162+ API
        if (this.scene.environmentRotation) {
            this.scene.environmentRotation.set(0, rotationRadians, 0);
        }
        if (this.scene.backgroundRotation) {
            this.scene.backgroundRotation.set(0, rotationRadians, 0);
        }

        // Update background rendering
        this.updateCanvasBackground();

        // Apply to model
        if (this.currentModel) {
            this.applyEnvironmentToModel();
        }

        console.log('  ✓ Environment applied');
    }

    updateHDRISettings(forceRegenerate = false) {
        const rotationRadians = this.hdriRotation * Math.PI / 180;

        console.log(`🔄 Updating HDRI settings (rotation: ${this.hdriRotation}°, intensity: ${this.hdriIntensity})`);

        // Rotate cube map
        if (this.scene.environmentRotation) {
            this.scene.environmentRotation.set(0, rotationRadians, 0);
        }
        if (this.scene.backgroundRotation) {
            this.scene.backgroundRotation.set(0, rotationRadians, 0);
        }

        // Optionally regenerate
        if (this.originalHDRITexture && forceRegenerate) {
            this.generateRotatedEnvironment(this.originalHDRITexture, rotationRadians);
        }

        // Update tone mapping if HDRI background visible
        if (this.hdriBackgroundVisible) {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = this.hdriIntensity;
        }

        // Update material env map intensities
        this.scene.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    mat.envMapIntensity = this.hdriIntensity;
                    mat.needsUpdate = true;
                });
            }
        });

        // Trigger interaction mode for path tracing
        if (this.pathTracingEnabled && this.pathTracer) {
            if (!this.isInteracting) {
                this.isInteracting = true;
            }

            if (this.interactionTimeout) {
                clearTimeout(this.interactionTimeout);
            }

            this.interactionTimeout = setTimeout(() => {
                this.isInteracting = false;
                this.scene.updateMatrixWorld(true);
                // Use updateEnvironment() instead of setScene() for better performance
                this.pathTracer.updateEnvironment();
                console.log('✅ Path tracer environment updated with new HDRI settings');
            }, this.interactionDelay);
        }

        console.log('  ✓ HDRI settings updated');
    }

    updateSunLightPosition() {
        if (!this.sunLight) return;

        // Calculate sun direction from azimuth and elevation (spherical coordinates)
        const azimuthRad = this.sunAzimuth * Math.PI / 180;
        const elevationRad = this.sunElevation * Math.PI / 180;

        // Convert spherical to Cartesian coordinates
        const x = Math.cos(elevationRad) * Math.sin(azimuthRad);
        const y = Math.sin(elevationRad);
        const z = Math.cos(elevationRad) * Math.cos(azimuthRad);

        // Position sun light at distance
        const distance = ViewerConfig.lighting.sunDistance;
        this.sunLight.position.set(x * distance, y * distance, z * distance);
        this.sunLight.target.position.set(0, 0, 0);
        this.sunLight.target.updateMatrixWorld();

        // Update color, intensity, and visibility
        this.sunLight.color.setStyle(this.sunColor);
        this.sunLight.intensity = this.sunIntensity;
        this.sunLight.visible = this.sunEnabled;

        // Update shadow properties (VSM supports radius for blur)
        this.sunLight.shadow.radius = this.shadowSoftness;
        this.sunLight.shadow.bias = -0.0001 * this.shadowIntensity;

        // Trigger interaction mode for path tracing
        if (this.pathTracingEnabled && this.pathTracer) {
            if (!this.isInteracting) {
                this.isInteracting = true;
            }

            if (this.interactionTimeout) {
                clearTimeout(this.interactionTimeout);
            }

            this.interactionTimeout = setTimeout(() => {
                this.isInteracting = false;
                this.scene.updateMatrixWorld(true);
                this.pathTracer.setScene(this.scene, this.camera);
                console.log('✅ Path tracer updated with new sun light settings');
            }, this.interactionDelay);
        }
    }

    // ========== MODEL LOADING ==========

    loadModel(file) {
        const fileName = file.name.toLowerCase();
        const fileURL = URL.createObjectURL(file);

        console.log(`📦 Loading model: ${file.name}...`);

        this.clearModel();

        if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
            this.loadGLTF(fileURL, file.name);
        } else if (fileName.endsWith('.fbx')) {
            this.loadFBX(fileURL, file.name);
        } else {
            console.error('❌ Unsupported file format');
            alert('Please upload a GLB, GLTF, or FBX file');
        }
    }

    loadGLTF(url, filename) {
        // Check if this is a GLTF (not GLB) which requires external files
        const isGLTF = filename.toLowerCase().endsWith('.gltf');

        if (isGLTF) {
            console.warn('⚠️ GLTF format detected - requires external texture/bin files');
            console.warn('💡 Recommendation: Convert to GLB format for single-file upload');
            console.warn('📝 Online converter: https://products.aspose.app/3d/conversion/gltf-to-glb');

            alert(
                '⚠️ GLTF Format Limitation\n\n' +
                'GLTF files reference external textures and binary data.\n' +
                'This viewer currently supports single-file uploads only.\n\n' +
                '✅ Solution: Convert to GLB format (binary GLTF)\n' +
                'GLB packages all resources into a single file.\n\n' +
                'Free converter: https://products.aspose.app/3d/conversion/gltf-to-glb'
            );
            return;
        }

        this.gltfLoader.load(
            url,
            (gltf) => {
                this.currentModel = gltf.scene;
                this.processLoadedModel();
                console.log(`✅ GLTF loaded: ${filename}`);
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`  Loading: ${percent}%`);
                }
            },
            (error) => {
                console.error('❌ Error loading GLTF:', error);
                alert('Failed to load model. Check console for details.');
            }
        );
    }

    loadFBX(url, filename) {
        this.fbxLoader.load(
            url,
            (fbx) => {
                this.currentModel = fbx;
                this.processLoadedModel();
                console.log(`✅ FBX loaded: ${filename}`);
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`  Loading: ${percent}%`);
                }
            },
            (error) => {
                console.error('❌ Error loading FBX:', error);
                alert('Failed to load model. Check console for details.');
            }
        );
    }

    processLoadedModel() {
        if (!this.currentModel) return;

        // Add to container
        this.modelContainer.add(this.currentModel);

        // Auto-center
        if (ViewerConfig.model.autoCenter) {
            this.centerModel();
        }

        // Auto-scale
        if (ViewerConfig.model.autoScale) {
            this.autoScaleModel();
        }

        // Enable shadows
        if (ViewerConfig.model.enableShadows) {
            this.enableModelShadows();
        }

        // Apply environment
        this.applyEnvironmentToModel();

        console.log('  ✓ Model processed (centered, scaled, shadows enabled)');
    }

    centerModel() {
        if (!this.currentModel) return;

        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());

        this.currentModel.position.x = -center.x;
        this.currentModel.position.y = -center.y;
        this.currentModel.position.z = -center.z;
    }

    autoScaleModel() {
        if (!this.currentModel) return;

        const box = new THREE.Box3().setFromObject(this.currentModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        const scale = ViewerConfig.model.targetSize / maxDim;
        this.modelContainer.scale.setScalar(scale);

        return scale;
    }

    enableModelShadows() {
        if (!this.currentModel) return;

        let meshCount = 0;
        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                meshCount++;
            }
        });

        console.log(`  ✓ Enabled shadows for ${meshCount} meshes`);
    }

    applyEnvironmentToModel() {
        if (!this.currentModel) return;

        this.currentModel.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach(mat => {
                    mat.envMapIntensity = this.hdriIntensity;
                    mat.needsUpdate = true;
                });
            }
        });
    }

    applyShaderPreset(presetName) {
        if (!this.currentModel) {
            console.warn('⚠️ No model loaded to apply shader preset');
            return;
        }

        const preset = ViewerConfig.shaderPresets[presetName];
        if (!preset) {
            console.error(`❌ Unknown shader preset: ${presetName}`);
            return;
        }

        console.log(`🎨 Applying shader preset: ${presetName}`);
        this.currentShaderPreset = presetName;

        this.currentModel.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach((mat, idx) => {
                    // Store original properties on first preset application
                    const matKey = `${child.uuid}_${idx}`;
                    if (!this.originalMaterials.has(matKey)) {
                        this.originalMaterials.set(matKey, {
                            roughness: mat.roughness,
                            metalness: mat.metalness,
                            transmission: mat.transmission || 0,
                            clearcoat: mat.clearcoat || 0,
                            color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
                            map: mat.map
                        });
                    }

                    // Apply preset or restore original
                    if (presetName === 'custom') {
                        // Restore original properties
                        const original = this.originalMaterials.get(matKey);
                        if (original) {
                            mat.roughness = original.roughness;
                            mat.metalness = original.metalness;
                            mat.transmission = original.transmission;
                            mat.clearcoat = original.clearcoat;
                            mat.color.copy(original.color);
                            mat.map = original.map;
                        }
                    } else {
                        // Apply preset properties (only if not null)
                        if (preset.roughness !== null) mat.roughness = preset.roughness;
                        if (preset.metalness !== null) mat.metalness = preset.metalness;
                        if (preset.transmission !== null) mat.transmission = preset.transmission;
                        if (preset.clearcoat !== null) mat.clearcoat = preset.clearcoat;

                        // Apply color override (for clay preset)
                        if (preset.color !== null) {
                            mat.color.setStyle(preset.color);
                            // Remove texture map to show solid color
                            mat.map = null;
                        } else {
                            // Restore original texture map if no color override
                            const original = this.originalMaterials.get(matKey);
                            if (original && original.map) {
                                mat.map = original.map;
                            }
                        }

                        // Enable transparency if using transmission
                        if (preset.transmission > 0) {
                            mat.transparent = true;
                            mat.opacity = 1.0;
                        }
                    }

                    mat.needsUpdate = true;
                });
            }
        });

        // Reset path tracing if active (material changed)
        if (this.pathTracingEnabled && this.pathTracer) {
            this.pathTracer.reset();
        }

        console.log(`  ✓ Shader preset applied: ${presetName}`);
    }

    clearModel() {
        if (this.currentModel) {
            this.modelContainer.remove(this.currentModel);

            // Dispose geometries and materials
            this.currentModel.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });

            this.currentModel = null;
            this.originalMaterials.clear(); // Clear stored original materials
            this.currentShaderPreset = 'custom'; // Reset preset
        }
    }

    // ========== TRANSFORMS ==========

    updateModelTransform(scale, position, rotation) {
        if (!this.modelContainer) return;

        // Scale
        this.modelContainer.scale.setScalar(scale);

        // Position
        this.modelContainer.position.set(position.x, position.y, 0);

        // Rotation (world-space to prevent gimbal lock)
        const radX = rotation.x * Math.PI / 180;
        const radY = rotation.y * Math.PI / 180;
        const radZ = rotation.z * Math.PI / 180;

        const rotMatrix = new THREE.Matrix4();
        const matX = new THREE.Matrix4().makeRotationX(radX);
        const matY = new THREE.Matrix4().makeRotationY(radY);
        const matZ = new THREE.Matrix4().makeRotationZ(radZ);

        rotMatrix.multiply(matY).multiply(matX).multiply(matZ);
        this.modelContainer.rotation.setFromRotationMatrix(rotMatrix);

        // Trigger interaction mode for path tracing
        if (this.pathTracingEnabled && this.pathTracer) {
            // Switch to interaction mode (standard rendering)
            if (!this.isInteracting) {
                this.isInteracting = true;
                console.log('🎮 Transform change - switching to standard render');
            }

            // Update the scene matrices immediately
            this.scene.updateMatrixWorld(true);

            // Clear existing timeout
            if (this.interactionTimeout) {
                clearTimeout(this.interactionTimeout);
            }

            // Set timeout to resume path tracing after interaction stops
            this.interactionTimeout = setTimeout(() => {
                this.isInteracting = false;
                console.log('🎨 Transform settled - resuming path tracing');

                // Force scene update before updating path tracer
                this.scene.updateMatrixWorld(true);

                // Update path tracer with new scene state
                this.pathTracer.setScene(this.scene, this.camera);

                console.log('✅ Path tracer updated with new transform state');
            }, this.interactionDelay);
        }
    }

    // ========== BACKGROUND ==========

    updateCanvasBackground() {
        const transparent = document.getElementById('bg-transparent')?.checked || false;

        if (this.hdriBackgroundVisible && this.currentHDRI) {
            // Show HDRI in Three.js
            this.scene.background = this.currentHDRI;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = this.hdriIntensity;
            console.log('  ✓ Background: HDRI');
        } else if (transparent) {
            // Transparent background
            this.scene.background = null;
            this.renderer.setClearColor(0x000000, 0);
            this.renderer.toneMapping = THREE.NoToneMapping;
            console.log('  ✓ Background: Transparent');
        } else if (this.backgroundVideo) {
            // Background video as texture (cached for performance)
            if (!this.backgroundVideoTexture) {
                this.backgroundVideoTexture = new THREE.VideoTexture(this.backgroundVideo);
                this.backgroundVideoTexture.colorSpace = THREE.SRGBColorSpace;
                console.log('  ✓ Created new video texture');
            }
            this.scene.background = this.backgroundVideoTexture;
            this.renderer.toneMapping = THREE.NoToneMapping;
            console.log('  ✓ Background: Custom video (cached texture)');
        } else if (this.backgroundImage) {
            // Background image as texture
            const texture = new THREE.CanvasTexture(this.createBackgroundImageCanvas());
            texture.colorSpace = THREE.SRGBColorSpace;
            this.scene.background = texture;
            this.renderer.toneMapping = THREE.NoToneMapping;
            console.log('  ✓ Background: Custom image');
        } else {
            // Solid color background
            const bgColor = document.getElementById('bg-color')?.value || this.backgroundColor;
            this.scene.background = new THREE.Color(bgColor);
            this.renderer.toneMapping = THREE.NoToneMapping;
            console.log('  ✓ Background: Solid color', bgColor);
        }
    }

    createBackgroundImageCanvas() {
        // Create a canvas with the background image rendered at the correct aspect ratio
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        const ctx = canvas.getContext('2d');

        const canvasAspect = canvas.width / canvas.height;
        const imageAspect = this.backgroundImage.width / this.backgroundImage.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (this.backgroundImageFit === 'cover') {
            if (canvasAspect > imageAspect) {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imageAspect;
                offsetX = 0;
                offsetY = (canvas.height - drawHeight) / 2;
            } else {
                drawHeight = canvas.height;
                drawWidth = drawHeight * imageAspect;
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = 0;
            }
        } else if (this.backgroundImageFit === 'contain') {
            if (canvasAspect > imageAspect) {
                drawHeight = canvas.height;
                drawWidth = drawHeight * imageAspect;
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imageAspect;
                offsetX = 0;
                offsetY = (canvas.height - drawHeight) / 2;
            }
        } else {
            // fill
            drawWidth = canvas.width;
            drawHeight = canvas.height;
            offsetX = 0;
            offsetY = 0;
        }

        // Fill background with solid color first (for contain mode)
        const bgColor = document.getElementById('bg-color')?.value || this.backgroundColor;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.drawImage(this.backgroundImage, offsetX, offsetY, drawWidth, drawHeight);

        return canvas;
    }

    setBackgroundImage(image) {
        this.backgroundImage = image;
        this.backgroundVideo = null; // Clear video if image is set
        this.updateCanvasBackground();
    }

    setBackgroundVideo(video) {
        this.backgroundVideo = video;
        this.backgroundImage = null; // Clear image if video is set

        // Dispose old video texture if it exists
        if (this.backgroundVideoTexture) {
            this.backgroundVideoTexture.dispose();
            this.backgroundVideoTexture = null;
        }

        this.updateCanvasBackground();
    }

    clearBackgroundImage() {
        this.backgroundImage = null;
        this.backgroundVideo = null;

        // Stop and clean up video if it exists
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = '';
        }

        // Dispose video texture
        if (this.backgroundVideoTexture) {
            this.backgroundVideoTexture.dispose();
            this.backgroundVideoTexture = null;
        }

        this.updateCanvasBackground();
    }

    setBackgroundImageFit(fit) {
        this.backgroundImageFit = fit;
        this.updateCanvasBackground();
    }

    setForegroundImage(image) {
        this.foregroundImage = image;
        this.updateForegroundCanvas();
    }

    clearForegroundImage() {
        this.foregroundImage = null;
        this.updateForegroundCanvas();
    }

    updateForegroundCanvas() {
        if (!this.foregroundCtx) return;

        // Clear foreground canvas
        this.foregroundCtx.clearRect(0, 0, this.foregroundCanvas.width, this.foregroundCanvas.height);

        // Draw foreground image if set (PNG with alpha transparency)
        if (this.foregroundImage) {
            // Always use 'cover' fit for foreground overlays
            const canvasAspect = this.foregroundCanvas.width / this.foregroundCanvas.height;
            const imageAspect = this.foregroundImage.width / this.foregroundImage.height;

            let drawWidth, drawHeight, offsetX, offsetY;

            // Cover: fill entire canvas, may crop image
            if (imageAspect > canvasAspect) {
                drawHeight = this.foregroundCanvas.height;
                drawWidth = drawHeight * imageAspect;
                offsetX = (this.foregroundCanvas.width - drawWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = this.foregroundCanvas.width;
                drawHeight = drawWidth / imageAspect;
                offsetX = 0;
                offsetY = (this.foregroundCanvas.height - drawHeight) / 2;
            }

            this.foregroundCtx.drawImage(
                this.foregroundImage,
                offsetX, offsetY,
                drawWidth, drawHeight
            );
        }
    }

    // ========== PATH TRACING ==========

    enablePathTracing() {
        // Check if path tracer library is loaded
        if (!window.WebGLPathTracer) {
            console.error('❌ Path tracer library not loaded yet');
            alert('Path tracing library is still loading. Please wait a moment and try again.');
            return false;
        }

        // Check WebGL 2.0 support
        if (!this.renderer.capabilities.isWebGL2) {
            console.error('❌ Path tracing requires WebGL 2.0 support');

            // Show helpful error message
            const errorMessage = `Path tracing requires WebGL 2.0 support.

Your browser: ${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown'}

Solutions:
• Update your browser to the latest version
• Enable hardware acceleration in browser settings
• Try Chrome, Firefox, or Edge (all support WebGL 2.0)

The standard renderer will continue to work normally.`;

            alert(errorMessage);
            return false;
        }

        console.log('🎨 Enabling path tracing...');

        // Initialize path tracer if not already created
        if (!this.pathTracer) {
            try {
                this.pathTracer = new window.WebGLPathTracer(this.renderer);

                // Configure path tracer for interactive live rendering
                this.pathTracer.renderToCanvas = true; // Automatically copy to canvas
                this.pathTracer.rasterizeScene = true; // Show rasterized preview while path tracing
                this.pathTracer.renderScale = 1.0;
                this.pathTracer.renderDelay = 0; // No delay for immediate feedback
                this.pathTracer.fadeDuration = 0; // No fade for immediate updates
                this.pathTracer.synchronizeRenderSize = true; // Keep render size synced
                this.pathTracer.pausePathTracing = false; // Never pause during interactions

                console.log('  ✓ Path tracer created');
            } catch (error) {
                console.error('❌ Failed to create path tracer:', error);
                alert('Failed to initialize path tracing. Check console for details.');
                return false;
            }
        }

        // Apply quality preset
        this.setPathTracingQuality(this.pathTracingQuality);

        // Path tracer needs the original equirectangular texture, not the PMREM cube map
        // Store PMREM for later restoration when disabling path tracing
        this.pmremEnvironment = this.scene.environment;

        if (this.originalHDRITexture) {
            // Set original HDRI as environment for both path tracing and rasterization
            this.scene.environment = this.originalHDRITexture;
            console.log('  ✓ Set original HDRI texture for path tracer');
        }

        // Set scene and camera
        if (this.scene && this.camera) {
            try {
                this.pathTracer.setScene(this.scene, this.camera);
                console.log('  ✓ Scene set for path tracing');
            } catch (error) {
                console.error('❌ Failed to set scene:', error);
                // Restore PMREM environment on failure
                this.scene.environment = this.pmremEnvironment;
                throw error;
            }
        }

        // Keep original HDRI as environment (rasterizeScene will use it)

        // Note: Interactions will reset path tracing accumulation, but this is expected behavior
        // The rasterized preview (rasterizeScene=true) provides immediate feedback
        console.log('  ℹ️ Interactive mode: Controls remain active, samples reset on changes');

        this.pathTracingEnabled = true;
        console.log('✅ Path tracing enabled (interactive mode)');
        return true;
    }

    disablePathTracing() {
        this.pathTracingEnabled = false;

        // Restore PMREM environment for rasterization
        if (this.pmremEnvironment) {
            this.scene.environment = this.pmremEnvironment;
        } else if (this.currentHDRI) {
            this.scene.environment = this.currentHDRI;
        }

        console.log('✅ Path tracing disabled');
    }

    setPathTracingQuality(preset) {
        if (!this.pathTracingPresets[preset]) {
            console.error(`Unknown quality preset: ${preset}`);
            return;
        }

        const config = this.pathTracingPresets[preset];
        this.pathTracingQuality = preset;
        this.targetSamples = config.targetSamples;

        if (this.pathTracer) {
            // Set configurable properties
            this.pathTracer.bounces = config.bounces;
            // Note: tiles is read-only, managed internally by the path tracer
            // this.pathTracer.minSamples is also read-only in some versions

            // Reset to apply new settings
            this.pathTracer.reset();

            console.log(`✅ Path tracing quality: ${preset} (${config.bounces} bounces, ${config.targetSamples} samples)`);
        }

        // Update UI target samples display
        const targetDisplay = document.getElementById('pathtracing-target');
        if (targetDisplay) {
            targetDisplay.textContent = config.targetSamples;
        }
    }

    resetPathTracing() {
        if (this.pathTracer) {
            this.pathTracer.reset();
            console.log('🔄 Path tracing reset');
        }
    }

    // ========== ANIMATION ==========

    setAnimationEnabled(enabled) {
        if (enabled && !this.animationEnabled) {
            // Starting animation - save current rotation state
            if (this.modelContainer) {
                this.rotationBeforeAnimation = {
                    x: this.modelContainer.rotation.x,
                    y: this.modelContainer.rotation.y,
                    z: this.modelContainer.rotation.z
                };
                this.sineTime = 0; // Reset sine wave time
                console.log('💾 Saved rotation state before animation');
            }
        } else if (!enabled && this.animationEnabled) {
            // Stopping animation - restore original rotation
            if (this.modelContainer && this.rotationBeforeAnimation) {
                this.modelContainer.rotation.x = this.rotationBeforeAnimation.x;
                this.modelContainer.rotation.y = this.rotationBeforeAnimation.y;
                this.modelContainer.rotation.z = this.rotationBeforeAnimation.z;
                console.log('🔄 Restored rotation state after animation');
                this.rotationBeforeAnimation = null;
            }
        }

        this.animationEnabled = enabled;
    }

    setAnimationMode(mode) {
        const wasEnabled = this.animationEnabled;

        // If switching modes while animation is running, reset rotation
        if (wasEnabled) {
            this.setAnimationEnabled(false);
        }

        this.animationMode = mode;
        this.sineTime = 0; // Reset sine wave time when switching modes

        // Re-enable animation if it was running
        if (wasEnabled) {
            this.setAnimationEnabled(true);
        }

        console.log(`🎬 Animation mode set to: ${mode}`);
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // Track if scene has changed for interaction detection
        let sceneChanged = false;

        // Update orbit controls if enabled (manual camera control)
        // Note: Interaction detection is handled via 'start' and 'end' events
        if (this.orbitControls && this.orbitControls.enabled) {
            this.orbitControls.update();
        }

        // Animation (turntable or sine wave)
        if (this.animationEnabled && this.currentModel && this.rotationBeforeAnimation) {
            if (this.animationMode === 'turntable') {
                // Turntable animation - continuous rotation
                const baseSpeed = ViewerConfig.animation.turntableRotationSpeed;

                // Apply rotation on each axis independently
                if (this.turntableSpeedX !== 0) {
                    this.modelContainer.rotateOnWorldAxis(
                        new THREE.Vector3(1, 0, 0),
                        baseSpeed * this.turntableSpeedX
                    );
                    sceneChanged = true;
                }
                if (this.turntableSpeedY !== 0) {
                    this.modelContainer.rotateOnWorldAxis(
                        new THREE.Vector3(0, 1, 0),
                        baseSpeed * this.turntableSpeedY
                    );
                    sceneChanged = true;
                }
                if (this.turntableSpeedZ !== 0) {
                    this.modelContainer.rotateOnWorldAxis(
                        new THREE.Vector3(0, 0, 1),
                        baseSpeed * this.turntableSpeedZ
                    );
                    sceneChanged = true;
                }
            } else if (this.animationMode === 'sine') {
                // Sine wave animation - oscillating rotation
                this.sineTime += 1 / 60; // Increment time (assuming 60fps)

                // Calculate sine wave rotation for each axis
                const rotX = this.rotationBeforeAnimation.x +
                    (Math.sin(this.sineTime * this.sineFrequencyX * Math.PI * 2) *
                    this.sineAmplitudeX * Math.PI / 180);

                const rotY = this.rotationBeforeAnimation.y +
                    (Math.sin(this.sineTime * this.sineFrequencyY * Math.PI * 2) *
                    this.sineAmplitudeY * Math.PI / 180);

                const rotZ = this.rotationBeforeAnimation.z +
                    (Math.sin(this.sineTime * this.sineFrequencyZ * Math.PI * 2) *
                    this.sineAmplitudeZ * Math.PI / 180);

                // Apply sine wave rotation
                this.modelContainer.rotation.x = rotX;
                this.modelContainer.rotation.y = rotY;
                this.modelContainer.rotation.z = rotZ;

                sceneChanged = true;
            }
        }

        // Handle animation path tracing: switch to standard render during animation
        if (this.pathTracingEnabled && this.pathTracer && sceneChanged) {
            // Switch to interaction mode (standard rendering)
            if (!this.isInteracting) {
                this.isInteracting = true;
                console.log('🎮 Animation active - switching to standard render');
            }

            // Update scene graph immediately
            this.scene.updateMatrixWorld(true);

            // Clear existing timeout
            if (this.interactionTimeout) {
                clearTimeout(this.interactionTimeout);
            }

            // Set timeout to resume path tracing after animation stops
            this.interactionTimeout = setTimeout(() => {
                this.isInteracting = false;
                console.log('🎨 Animation stopped - resuming path tracing');

                // Force scene update before updating path tracer
                this.scene.updateMatrixWorld(true);

                // Update path tracer scene and camera with current state
                this.pathTracer.setScene(this.scene, this.camera);

                console.log('✅ Path tracer updated with new scene state');
            }, this.interactionDelay);
        }

        this.render();
    }

    render() {
        if (this.pathTracingEnabled && this.pathTracer && !this.isInteracting) {
            // Path tracing mode (only when NOT interacting)
            // rasterizeScene=true shows immediate rasterized preview
            // renderToCanvas=true blends path traced samples on top

            try {
                // Render one path traced sample
                this.pathTracer.renderSample();

                // Update UI with sample count
                const samplesDisplay = document.getElementById('pathtracing-samples');
                if (samplesDisplay) {
                    samplesDisplay.textContent = this.pathTracer.samples;
                }
            } catch (error) {
                console.error('Path tracing render error:', error);
                // Fall back to standard rendering if path tracer fails
                this.renderer.render(this.scene, this.camera);
            }
        } else {
            // Standard rasterization mode (default OR during interaction)
            this.renderer.render(this.scene, this.camera);

            // Show "Interacting..." in sample display during interaction
            if (this.isInteracting && this.pathTracingEnabled) {
                const samplesDisplay = document.getElementById('pathtracing-samples');
                if (samplesDisplay) {
                    samplesDisplay.textContent = '—';
                }
            }
        }
    }

    // ========== EXPORT ==========

    exportPNG() {
        console.log('📸 Exporting PNG...');

        // Create temporary canvas for composite
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        const ctx = exportCanvas.getContext('2d');

        // Render background and Three.js scene
        this.renderToCanvas(exportCanvas);

        // Convert to PNG and download
        const dataURL = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `3d-render-${Date.now()}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ PNG export completed');
    }

    async exportMP4(duration) {
        console.log(`🎥 Exporting MP4 video (${duration}s)...`);

        const exportBtn = document.getElementById('export-btn');
        const originalText = exportBtn.textContent;

        try {
            exportBtn.textContent = 'Recording...';
            exportBtn.disabled = true;

            // Create offscreen composite canvas for recording
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = this.canvas.width;
            compositeCanvas.height = this.canvas.height;
            const compositeCtx = compositeCanvas.getContext('2d');

            // Set flag to enable compositing
            this.isRecording = true;
            this.recordingCanvas = compositeCanvas;
            this.recordingCtx = compositeCtx;

            // Start animation loop to update composite canvas
            const updateComposite = () => {
                if (!this.isRecording) return;

                // Three.js handles background directly via scene.background
                // Just copy the Three.js canvas to the composite canvas
                compositeCtx.drawImage(this.canvas, 0, 0);

                requestAnimationFrame(updateComposite);
            };
            updateComposite();

            // Capture composite canvas stream
            const stream = compositeCanvas.captureStream(30); // 30 FPS

            // Detect supported video format
            const formats = [
                { mimeType: 'video/mp4; codecs="avc1.42E01E"', extension: 'mp4' }, // H.264 baseline
                { mimeType: 'video/mp4; codecs="avc1.4D4028"', extension: 'mp4' }, // H.264 main
                { mimeType: 'video/mp4; codecs="avc1.640028"', extension: 'mp4' }, // H.264 high
                { mimeType: 'video/mp4', extension: 'mp4' },
                { mimeType: 'video/webm; codecs="vp9,opus"', extension: 'webm' },
                { mimeType: 'video/webm; codecs="vp8,opus"', extension: 'webm' },
                { mimeType: 'video/webm', extension: 'webm' }
            ];

            let selectedFormat = null;
            for (const format of formats) {
                if (MediaRecorder.isTypeSupported(format.mimeType)) {
                    selectedFormat = format;
                    console.log('Using format:', format.mimeType);
                    break;
                }
            }

            if (!selectedFormat) {
                throw new Error('No supported video format found');
            }

            const options = {
                mimeType: selectedFormat.mimeType
            };

            // Add bitrate for MP4
            if (selectedFormat.extension === 'mp4') {
                options.videoBitsPerSecond = 2500000; // 2.5 Mbps
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            const recordedChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                try {
                    const blob = new Blob(recordedChunks, {
                        type: selectedFormat.mimeType
                    });

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    const timestamp = Date.now();
                    const filename = `3d-animation-${timestamp}.${selectedFormat.extension}`;

                    link.download = filename;
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    setTimeout(() => URL.revokeObjectURL(url), 1000);

                    if (selectedFormat.extension === 'webm') {
                        setTimeout(() => {
                            alert(`Video saved as WebM format. Your browser doesn't support MP4 recording.\nFile: ${filename}`);
                        }, 100);
                    } else {
                        setTimeout(() => {
                            alert(`Video saved successfully!\nFile: ${filename}`);
                        }, 100);
                    }
                } catch (error) {
                    console.error('Error creating download:', error);
                    alert('Error saving video file. Please try again.');
                }

                exportBtn.textContent = originalText;
                exportBtn.disabled = false;
                this.isRecording = false;
                this.recordingCanvas = null;
                this.recordingCtx = null;
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                alert('Recording error occurred. Please try again.');
                exportBtn.textContent = originalText;
                exportBtn.disabled = false;
                this.isRecording = false;
                this.recordingCanvas = null;
                this.recordingCtx = null;
            };

            // Start recording
            mediaRecorder.start(200);

            // Progress indicator
            let countdown = duration;
            const progressInterval = setInterval(() => {
                countdown--;
                exportBtn.textContent = `Recording... ${countdown}s`;
                if (countdown <= 0) {
                    clearInterval(progressInterval);
                }
            }, 1000);

            // Stop recording after duration
            setTimeout(() => {
                clearInterval(progressInterval);
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    stream.getTracks().forEach(track => track.stop());
                }
            }, duration * 1000);

        } catch (error) {
            console.error('Video export failed:', error);
            alert(`Video export failed: ${error.message}\n\nTry using PNG Sequence export instead.`);
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
            this.isRecording = false;
            this.recordingCanvas = null;
            this.recordingCtx = null;
        }
    }

    async exportPNGSequence(duration) {
        console.log(`📦 Exporting PNG sequence (${duration}s)...`);

        const exportBtn = document.getElementById('export-btn');
        const originalText = exportBtn.textContent;

        try {
            const frameRate = 30;
            const totalFrames = Math.ceil(duration * frameRate);
            const frames = [];

            exportBtn.disabled = true;

            // Create export canvas
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = this.canvas.width;
            exportCanvas.height = this.canvas.height;

            // Store original rotation state
            const originalTurntableState = this.turntableEnabled;
            const originalRotationY = this.modelContainer ? this.modelContainer.rotation.y : 0;
            const shouldAnimate = duration > 0 && originalTurntableState;

            // Pre-calculate all rotation values for smooth animation
            const rotationValues = [];
            if (shouldAnimate && this.modelContainer) {
                const totalRotation = Math.PI * 2; // Full 360° rotation
                for (let frame = 0; frame < totalFrames; frame++) {
                    // Calculate precise rotation for this frame
                    const progress = frame / (totalFrames - 1); // 0 to 1
                    const rotation = originalRotationY + (progress * totalRotation);
                    rotationValues.push(rotation);
                }
            }

            for (let frame = 0; frame < totalFrames; frame++) {
                exportBtn.textContent = `Frame ${frame + 1}/${totalFrames}`;

                // Apply pre-calculated rotation for this specific frame
                if (shouldAnimate && this.modelContainer && rotationValues[frame] !== undefined) {
                    this.modelContainer.rotation.y = rotationValues[frame];
                }

                // Force Three.js to update the scene graph
                if (this.modelContainer) {
                    this.modelContainer.updateMatrixWorld(true);
                }

                // Render frame to canvas
                this.renderToCanvas(exportCanvas);

                // Capture frame as PNG
                const dataURL = exportCanvas.toDataURL('image/png');
                frames.push(dataURL);

                // Small delay for processing
                await new Promise(resolve => setTimeout(resolve, 16));
            }

            // Restore original rotation
            if (this.modelContainer) {
                this.modelContainer.rotation.y = originalRotationY;
                this.modelContainer.updateMatrixWorld(true);
            }

            exportBtn.textContent = 'Creating ZIP...';

            // Create ZIP archive
            const zip = new JSZip();
            const timestamp = Date.now();
            const bgTransparent = document.getElementById('bg-transparent');
            const isTransparent = bgTransparent && bgTransparent.checked;
            const folderName = isTransparent ?
                `3d-sequence-alpha-${timestamp}` :
                `3d-sequence-${timestamp}`;
            const folder = zip.folder(folderName);

            // Add frames to ZIP
            frames.forEach((frameData, index) => {
                const frameNumber = String(index + 1).padStart(4, '0');
                const fileName = `frame_${frameNumber}.png`;
                const base64Data = frameData.split(',')[1];
                folder.file(fileName, base64Data, { base64: true });
            });

            // Add README
            const readmeContent = `PNG Sequence Export - 3D Model Viewer
Generated: ${new Date().toISOString()}
Frames: ${totalFrames}
Duration: ${duration}s
Frame Rate: ${frameRate}fps
Alpha Channel: ${isTransparent ? 'Preserved' : 'Opaque'}
Canvas Size: ${this.canvas.width} × ${this.canvas.height}px

${isTransparent ?
'This sequence contains PNG files with alpha transparency.' :
'This sequence contains opaque PNG files.'}`;

            folder.file('README.txt', readmeContent);

            // Generate and download ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.download = `${folderName}.zip`;
            link.href = url;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            setTimeout(() => {
                const alphaInfo = isTransparent ? ' with alpha transparency' : '';
                alert(`PNG sequence exported successfully!\n${totalFrames} frames${alphaInfo}\nFile: ${folderName}.zip`);
            }, 100);

        } catch (error) {
            console.error('PNG sequence export failed:', error);
            alert('PNG sequence export failed. Please try again.');
        } finally {
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
        }
    }

    exportIframe() {
        console.log('📋 Generating iframe embed code...');

        // Collect current settings
        const settings = {
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            hdriPreset: document.getElementById('hdri-preset')?.value || 'studio',
            hdriIntensity: this.hdriIntensity,
            hdriRotation: this.hdriRotation,
            hdriShowBg: this.hdriBackgroundVisible,
            sunEnabled: this.sunEnabled,
            sunIntensity: this.sunIntensity,
            shadowQuality: this.shadowQuality,
            bgColor: document.getElementById('bg-color')?.value || '#1a1a1a',
            bgTransparent: document.getElementById('bg-transparent')?.checked || false,
            turntableEnabled: this.turntableEnabled,
            turntableSpeed: this.turntableSpeed,
            modelScale: this.modelContainer ? this.modelContainer.scale.x : 1,
            modelRotation: this.modelContainer ? {
                x: this.modelContainer.rotation.x,
                y: this.modelContainer.rotation.y,
                z: this.modelContainer.rotation.z
            } : { x: 0, y: 0, z: 0 }
        };

        // Generate iframe HTML
        const iframeCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Model Viewer</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: ${settings.bgTransparent ? 'transparent' : settings.bgColor};
        }
        canvas {
            display: block;
            width: 100%;
            height: 100vh;
        }
    </style>
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/"
        }
    }
    </script>
</head>
<body>
    <canvas id="viewer-canvas"></canvas>
    <script type="module">
        import * as THREE from 'three';
        import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

        const canvas = document.getElementById('viewer-canvas');
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: ${settings.bgTransparent}
        });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        ${settings.sunEnabled ? 'renderer.shadowMap.enabled = true;\nrenderer.shadowMap.type = THREE.PCFSoftShadowMap;' : ''}

        const scene = new THREE.Scene();
        ${settings.hdriShowBg ? '' : 'scene.background = new THREE.Color("' + settings.bgColor + '");'}

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);

        // Load HDRI
        const rgbeLoader = new RGBELoader();
        const hdriUrl = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/${settings.hdriPreset === 'studio' ? 'photo_studio_loft_hall_2k' : settings.hdriPreset === 'sunset' ? 'venice_sunset_2k' : settings.hdriPreset === 'outdoor' ? 'kloofendal_48d_partly_cloudy_puresky_2k' : settings.hdriPreset === 'warehouse' ? 'industrial_sunset_puresky_2k' : settings.hdriPreset === 'night' ? 'moonlit_golf_2k' : settings.hdriPreset === 'autumn' ? 'autumn_crossing_2k' : 'urban_alley_01_2k'}.hdr';

        rgbeLoader.load(hdriUrl, (texture) => {
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap;
            ${settings.hdriShowBg ? 'scene.background = envMap;' : ''}
            scene.environmentIntensity = ${settings.hdriIntensity};
            scene.environmentRotation.y = ${settings.hdriRotation * Math.PI / 180};
            texture.dispose();
            pmremGenerator.dispose();
        });

        ${settings.sunEnabled ? `
        // Sun light
        const sunLight = new THREE.DirectionalLight(0xffffff, ${settings.sunIntensity});
        sunLight.position.set(5, 10, 5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = ${settings.shadowQuality};
        sunLight.shadow.mapSize.height = ${settings.shadowQuality};
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;
        sunLight.shadow.camera.left = -10;
        sunLight.shadow.camera.right = 10;
        sunLight.shadow.camera.top = 10;
        sunLight.shadow.camera.bottom = -10;
        scene.add(sunLight);
        ` : ''}

        // NOTE: Model loading code would go here
        // You would need to either:
        // 1. Embed the GLB/GLTF data as base64
        // 2. Reference an external model URL
        // 3. Provide instructions for the user to add their model

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            ${settings.turntableEnabled ? 'if (scene.children.length > 0) { scene.rotation.y += 0.01 * ' + settings.turntableSpeed + '; }' : ''}
            renderer.render(scene, camera);
        }
        animate();

        // Handle resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>`;

        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(iframeCode).then(() => {
                alert('iframe embed code copied to clipboard!\n\nNote: You will need to add model loading code to display your 3D model.');
            }).catch(err => {
                console.error('Failed to copy:', err);
                prompt('Copy this iframe code:', iframeCode);
            });
        } else {
            prompt('Copy this iframe code:', iframeCode);
        }

        console.log('✅ iframe code generated');
    }

    // Helper method to render current view to a canvas
    renderToCanvas(targetCanvas) {
        const ctx = targetCanvas.getContext('2d');
        const width = targetCanvas.width;
        const height = targetCanvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Ensure video is playing before render (for exports)
        if (this.backgroundVideo && this.backgroundVideo.paused) {
            this.backgroundVideo.play().catch(() => {
                console.warn('⚠️ Video autoplay blocked during export');
            });
        }

        // Render Three.js scene (background is already handled by scene.background)
        this.renderer.render(this.scene, this.camera);

        // Composite Three.js canvas
        ctx.drawImage(this.canvas, 0, 0, width, height);

        // Composite foreground image (PNG overlay)
        if (this.foregroundImage) {
            // Always use 'cover' fit for foreground overlays
            const canvasAspect = width / height;
            const imageAspect = this.foregroundImage.width / this.foregroundImage.height;

            let drawWidth, drawHeight, offsetX, offsetY;

            // Cover: fill entire canvas, may crop image
            if (imageAspect > canvasAspect) {
                drawHeight = height;
                drawWidth = drawHeight * imageAspect;
                offsetX = (width - drawWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = width;
                drawHeight = drawWidth / imageAspect;
                offsetX = 0;
                offsetY = (height - drawHeight) / 2;
            }

            ctx.drawImage(
                this.foregroundImage,
                offsetX, offsetY,
                drawWidth, drawHeight
            );
        }
    }

    // ========== CLEANUP ==========

    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.clearModel();
        this.renderer.dispose();
        this.pmremGenerator.dispose();

        console.log('🗑️ Viewer disposed');
    }
}

// Global instance
let viewer = null;

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    viewer = new ModelViewer('three-canvas');
    window.viewer = viewer; // Expose globally for UI
});
