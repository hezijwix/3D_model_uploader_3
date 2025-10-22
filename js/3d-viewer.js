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

        // Background rendering
        this.backgroundCanvas = null;
        this.backgroundCtx = null;
        this.backgroundImage = null;
        this.backgroundImageFit = ViewerConfig.background.imageFit;

        // HDRI environment
        this.pmremGenerator = null;
        this.currentHDRI = null;
        this.originalHDRITexture = null;
        this.hdriIntensity = ViewerConfig.lighting.hdriIntensity;
        this.hdriRotation = ViewerConfig.lighting.hdriRotation;
        this.hdriBackgroundVisible = ViewerConfig.lighting.hdriBackgroundVisible;

        // Sun light system (HDRI + Sun rig like C4D/Redshift)
        this.sunLight = null;
        this.sunDirection = new THREE.Vector3(0, 1, 0); // Default: top-down
        this.sunIntensity = ViewerConfig.lighting.sunIntensity;
        this.sunEnabled = ViewerConfig.lighting.sunEnabled;
        this.shadowQuality = ViewerConfig.lighting.shadowQuality;

        // Animation
        this.turntableEnabled = ViewerConfig.animation.turntableEnabled;
        this.turntableSpeed = ViewerConfig.animation.turntableSpeed;
        this.animationFrameId = null;

        // Debounce timer for HDRI rotation
        this.hdriRotationTimer = null;

        // Loaders
        this.gltfLoader = null;
        this.fbxLoader = null;
        this.rgbeLoader = null;
        this.textureLoader = null;

        // Initialize
        this.init();
    }

    init() {
        console.log('🚀 Initializing 3D Model Viewer...');

        this.setupCanvasDimensions();
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupLoaders();
        this.updateCanvasBackground(); // Initialize background rendering
        this.loadDefaultHDRI();
        this.animate();

        console.log('✅ 3D Model Viewer initialized successfully');
    }

    // ========== INITIALIZATION ==========

    setupCanvasDimensions() {
        // Set canvas to Full HD (1920x1080) for high-quality rendering
        this.canvas.width = ViewerConfig.canvas.width;
        this.canvas.height = ViewerConfig.canvas.height;
        console.log(`Canvas dimensions: ${this.canvas.width}×${this.canvas.height}`);
    }

    resizeCanvas(width, height) {
        // Update canvas dimensions
        this.canvas.width = width;
        this.canvas.height = height;

        // Update background canvas
        if (this.backgroundCanvas) {
            this.backgroundCanvas.width = width;
            this.backgroundCanvas.height = height;
        }

        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Update renderer size
        this.renderer.setSize(width, height, false);

        // Redraw background
        this.updateCanvasBackground();

        console.log(`Canvas resized: ${width}×${height}`);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = null; // Always null - use separate background layer

        // Initialize rotation properties for HDRI (Three.js r162+)
        this.scene.environmentRotation = new THREE.Euler();
        this.scene.backgroundRotation = new THREE.Euler();

        // Create model container for transforms
        this.modelContainer = new THREE.Group();
        this.scene.add(this.modelContainer);

        // Create background canvas layer
        this.setupBackgroundCanvas();

        console.log('  ✓ Scene created with dual-canvas architecture');
    }

    setupBackgroundCanvas() {
        // Create background canvas that sits behind Three.js canvas
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.id = 'background-canvas';
        this.backgroundCanvas.width = this.canvas.width;
        this.backgroundCanvas.height = this.canvas.height;
        this.backgroundCanvas.style.position = 'absolute';
        this.backgroundCanvas.style.top = '50%';
        this.backgroundCanvas.style.left = '50%';
        this.backgroundCanvas.style.transform = 'translate(-50%, -50%)';
        this.backgroundCanvas.style.maxWidth = '100%';
        this.backgroundCanvas.style.maxHeight = '100%';
        this.backgroundCanvas.style.width = 'auto';
        this.backgroundCanvas.style.height = 'auto';
        this.backgroundCanvas.style.zIndex = '1';
        this.backgroundCanvas.style.pointerEvents = 'none';
        this.backgroundCanvas.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.5)';
        this.backgroundCanvas.style.borderRadius = '4px';

        this.backgroundCtx = this.backgroundCanvas.getContext('2d');

        // Insert background canvas into the container (not before the Three.js canvas)
        const container = this.canvas.parentNode;
        container.style.position = 'relative';
        container.insertBefore(this.backgroundCanvas, this.canvas);

        console.log('  ✓ Background canvas layer created');
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

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: ViewerConfig.renderer.antialias,
            alpha: ViewerConfig.renderer.alpha,
            preserveDrawingBuffer: ViewerConfig.renderer.preserveDrawingBuffer
        });

        this.renderer.setSize(this.canvas.width, this.canvas.height, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, ViewerConfig.renderer.pixelRatioMax));

        // Color management (r162+)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping; // Default
        this.renderer.toneMappingExposure = 1.0;

        // Transparent clear color
        this.renderer.setClearColor(
            ViewerConfig.renderer.clearColor,
            ViewerConfig.renderer.clearAlpha
        );

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Setup PMREMGenerator for IBL
        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        console.log('  ✓ Renderer initialized with IBL support');
    }

    setupLights() {
        // Ambient light as fallback
        const ambientLight = new THREE.AmbientLight(0xffffff, ViewerConfig.lighting.ambientIntensity);
        this.scene.add(ambientLight);

        // Sun light (HDRI-based directional light with shadows)
        this.sunLight = new THREE.DirectionalLight(0xffffff, this.sunIntensity);
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
        this.sunLight.shadow.bias = ViewerConfig.lighting.shadowBias;
        this.sunLight.shadow.radius = ViewerConfig.lighting.shadowRadius;

        // Initial position (will be updated when HDRI is analyzed)
        this.sunLight.position.set(5, 10, 5);
        this.sunLight.target.position.set(0, 0, 0);

        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        console.log('  ✓ Lighting system initialized (sun + ambient)');
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

                // Use calibrated sun position if available
                if (ViewerConfig.hdriSunPositions[presetName]) {
                    const calibratedData = ViewerConfig.hdriSunPositions[presetName];
                    this.sunDirection = new THREE.Vector3(
                        calibratedData.direction[0],
                        calibratedData.direction[1],
                        calibratedData.direction[2]
                    ).normalize();
                    console.log(`  ✓ Using calibrated sun position`);
                } else {
                    console.log(`  ⚠️ No calibration data, using automatic detection`);
                    this.sunDirection = this.analyzeHDRIBrightestPoint(texture);
                }

                // Generate environment with current rotation
                this.generateRotatedEnvironment(texture, this.hdriRotation * Math.PI / 180);

                // Update sun light position
                this.updateSunLightPosition();

                // Apply to model if exists
                if (this.currentModel) {
                    this.applyEnvironmentToModel();
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

        // Update sun light
        this.updateSunLightPosition();

        console.log('  ✓ HDRI settings updated');
    }

    updateSunLightPosition() {
        if (!this.sunLight) return;

        // Apply HDRI rotation to sun direction
        const rotationRadians = this.hdriRotation * Math.PI / 180;
        const rotatedDirection = this.sunDirection.clone();
        rotatedDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationRadians);

        // Position sun light
        const distance = ViewerConfig.lighting.sunDistance;
        this.sunLight.position.copy(rotatedDirection.multiplyScalar(distance));
        this.sunLight.target.position.set(0, 0, 0);
        this.sunLight.target.updateMatrixWorld();

        // Update intensity and visibility
        this.sunLight.intensity = this.sunIntensity;
        this.sunLight.visible = this.sunEnabled;
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
    }

    // ========== BACKGROUND ==========

    updateCanvasBackground() {
        if (this.hdriBackgroundVisible && this.currentHDRI) {
            // Show HDRI in Three.js
            this.scene.background = this.currentHDRI;
            this.renderer.setClearColor(0x000000, 1);
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = this.hdriIntensity;

            this.clearBackgroundCanvas();
            console.log('  ✓ Background: HDRI');
        } else {
            // Transparent Three.js + background canvas
            this.scene.background = null;
            this.renderer.setClearColor(0x000000, 0);
            this.renderer.toneMapping = THREE.NoToneMapping;
            this.renderer.toneMappingExposure = 1.0;

            this.renderBackgroundLayer();
            console.log('  ✓ Background: Canvas layer');
        }
    }

    clearBackgroundCanvas() {
        if (this.backgroundCtx) {
            this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        }
    }

    renderBackgroundLayer() {
        if (!this.backgroundCtx) return;

        const transparent = document.getElementById('bg-transparent')?.checked || false;

        if (transparent) {
            this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        } else if (this.backgroundImage) {
            this.renderBackgroundImage();
        } else {
            const bgColor = document.getElementById('bg-color')?.value || ViewerConfig.background.color;
            this.backgroundCtx.fillStyle = bgColor;
            this.backgroundCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        }
    }

    renderBackgroundImage() {
        if (!this.backgroundImage) return;

        const canvasAspect = this.backgroundCanvas.width / this.backgroundCanvas.height;
        const imageAspect = this.backgroundImage.width / this.backgroundImage.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (this.backgroundImageFit === 'cover') {
            if (canvasAspect > imageAspect) {
                drawWidth = this.backgroundCanvas.width;
                drawHeight = drawWidth / imageAspect;
                offsetX = 0;
                offsetY = (this.backgroundCanvas.height - drawHeight) / 2;
            } else {
                drawHeight = this.backgroundCanvas.height;
                drawWidth = drawHeight * imageAspect;
                offsetX = (this.backgroundCanvas.width - drawWidth) / 2;
                offsetY = 0;
            }
        } else if (this.backgroundImageFit === 'contain') {
            if (canvasAspect > imageAspect) {
                drawHeight = this.backgroundCanvas.height;
                drawWidth = drawHeight * imageAspect;
                offsetX = (this.backgroundCanvas.width - drawWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = this.backgroundCanvas.width;
                drawHeight = drawWidth / imageAspect;
                offsetX = 0;
                offsetY = (this.backgroundCanvas.height - drawHeight) / 2;
            }
        } else {
            // fill
            drawWidth = this.backgroundCanvas.width;
            drawHeight = this.backgroundCanvas.height;
            offsetX = 0;
            offsetY = 0;
        }

        this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        this.backgroundCtx.drawImage(this.backgroundImage, offsetX, offsetY, drawWidth, drawHeight);
    }

    setBackgroundImage(image) {
        this.backgroundImage = image;
        this.updateCanvasBackground();
    }

    clearBackgroundImage() {
        this.backgroundImage = null;
        this.updateCanvasBackground();
    }

    setBackgroundImageFit(fit) {
        this.backgroundImageFit = fit;
        this.updateCanvasBackground();
    }

    // ========== ANIMATION ==========

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        // Turntable animation
        if (this.turntableEnabled && this.currentModel) {
            this.modelContainer.rotateOnWorldAxis(
                new THREE.Vector3(0, 1, 0),
                ViewerConfig.animation.turntableRotationSpeed * this.turntableSpeed
            );
        }

        this.render();
    }

    render() {
        // Render background layer (if not using HDRI background)
        if (!this.hdriBackgroundVisible || !this.currentHDRI) {
            this.renderBackgroundLayer();
        }

        // Render Three.js scene
        this.renderer.render(this.scene, this.camera);
    }

    // ========== EXPORT ==========

    renderHighResolution(targetCanvas, scale) {
        console.log(`📸 Rendering high-resolution export (${scale}×)...`);

        const originalWidth = this.canvas.width;
        const originalHeight = this.canvas.height;
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;

        // Setup target canvas
        const ctx = targetCanvas.getContext('2d');
        targetCanvas.width = scaledWidth;
        targetCanvas.height = scaledHeight;
        ctx.save();
        ctx.scale(scale, scale);

        // STEP 1: Draw background FIRST
        if (!this.hdriBackgroundVisible) {
            if (this.backgroundImage) {
                this.renderBackgroundImage();
            } else {
                this.renderBackgroundLayer();
            }
            ctx.drawImage(this.backgroundCanvas, 0, 0, originalWidth, originalHeight);
        }

        ctx.restore();

        // STEP 2: Render Three.js at high resolution
        this.renderer.setSize(scaledWidth, scaledHeight, false);
        this.renderer.render(this.scene, this.camera);

        // STEP 3: Composite Three.js on top
        ctx.drawImage(this.canvas, 0, 0, scaledWidth, scaledHeight);

        // Restore original size
        this.renderer.setSize(originalWidth, originalHeight, false);

        console.log(`✅ Export completed (${scaledWidth}×${scaledHeight})`);
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
