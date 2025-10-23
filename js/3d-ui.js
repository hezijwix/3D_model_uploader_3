/**
 * 3D Model Viewer - UI Controllers
 *
 * Handles all UI interactions and connects controls to the viewer
 */

// Wait for viewer to be initialized
window.addEventListener('DOMContentLoaded', () => {
    console.log('🎛️ Initializing UI controls...');

    // ========== CANVAS SIZE CONTROLS ==========

    const canvasWidthInput = document.getElementById('canvas-width');
    const canvasHeightInput = document.getElementById('canvas-height');
    const presetButtons = document.querySelectorAll('.preset-btn');

    // Handle manual input changes
    if (canvasWidthInput && canvasHeightInput) {
        const updateCanvasSize = () => {
            if (!window.viewer) return;
            const width = parseInt(canvasWidthInput.value);
            const height = parseInt(canvasHeightInput.value);
            if (width > 0 && height > 0) {
                window.viewer.resizeCanvas(width, height);
            }
        };

        canvasWidthInput.addEventListener('change', updateCanvasSize);
        canvasHeightInput.addEventListener('change', updateCanvasSize);
    }

    // Handle preset buttons
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            presetButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const [width, height] = btn.dataset.size.split(',').map(Number);
            canvasWidthInput.value = width;
            canvasHeightInput.value = height;

            if (window.viewer) {
                window.viewer.resizeCanvas(width, height);
            }
        });
    });

    // ========== MODEL UPLOAD ==========

    const modelUploadBtn = document.getElementById('model-upload-btn');
    const modelUploadInput = document.getElementById('model-upload-input');
    const modelRemoveBtn = document.getElementById('model-remove-btn');
    const modelUploadText = document.getElementById('model-upload-text');

    if (modelUploadBtn && modelUploadInput) {
        modelUploadBtn.addEventListener('click', (e) => {
            if (e.target === modelRemoveBtn) return; // Let remove button handle its own click
            modelUploadInput.click();
        });

        modelUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && window.viewer) {
                window.viewer.loadModel(file);
                modelUploadText.textContent = file.name.length > 20
                    ? file.name.substring(0, 20) + '...'
                    : file.name;
                modelRemoveBtn.style.display = 'block';
            }
        });

        modelRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.viewer) {
                window.viewer.clearModel();
                modelUploadInput.value = '';
                modelUploadText.textContent = 'Upload 3D Model';
                modelRemoveBtn.style.display = 'none';
            }
        });
    }

    // ========== SHADER PRESET CONTROLS ==========

    // Shader Preset
    const shaderPreset = document.getElementById('shader-preset');
    if (shaderPreset && window.viewer) {
        shaderPreset.addEventListener('change', (e) => {
            console.log(`🎨 Changing shader preset to: ${e.target.value}`);
            window.viewer.applyShaderPreset(e.target.value);
        });
    }

    // ========== TRANSFORM CONTROLS ==========

    // Scale
    const scaleSlider = document.getElementById('model-scale');
    const scaleValue = document.getElementById('model-scale-value');
    if (scaleSlider && window.viewer) {
        scaleSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            scaleValue.textContent = value.toFixed(1);
            updateTransform();
        });
    }

    // Position X
    const posXSlider = document.getElementById('model-pos-x');
    const posXValue = document.getElementById('model-pos-x-value');
    if (posXSlider && window.viewer) {
        posXSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            posXValue.textContent = value.toFixed(1);
            updateTransform();
        });
    }

    // Position Y
    const posYSlider = document.getElementById('model-pos-y');
    const posYValue = document.getElementById('model-pos-y-value');
    if (posYSlider && window.viewer) {
        posYSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            posYValue.textContent = value.toFixed(1);
            updateTransform();
        });
    }

    // Rotation X
    const rotXSlider = document.getElementById('model-rot-x');
    const rotXValue = document.getElementById('model-rot-x-value');
    if (rotXSlider && window.viewer) {
        rotXSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            rotXValue.textContent = value.toFixed(0) + '°';
            updateTransform();
        });
    }

    // Rotation Y
    const rotYSlider = document.getElementById('model-rot-y');
    const rotYValue = document.getElementById('model-rot-y-value');
    if (rotYSlider && window.viewer) {
        rotYSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            rotYValue.textContent = value.toFixed(0) + '°';
            updateTransform();
        });
    }

    // Rotation Z
    const rotZSlider = document.getElementById('model-rot-z');
    const rotZValue = document.getElementById('model-rot-z-value');
    if (rotZSlider && window.viewer) {
        rotZSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            rotZValue.textContent = value.toFixed(0) + '°';
            updateTransform();
        });
    }

    function updateTransform() {
        if (!window.viewer) return;

        const scale = parseFloat(scaleSlider.value);
        const position = {
            x: parseFloat(posXSlider.value),
            y: parseFloat(posYSlider.value)
        };
        const rotation = {
            x: parseFloat(rotXSlider.value),
            y: parseFloat(rotYSlider.value),
            z: parseFloat(rotZSlider.value)
        };

        window.viewer.updateModelTransform(scale, position, rotation);
    }

    // ========== HDRI CONTROLS ==========

    // HDRI Preset
    const hdriPreset = document.getElementById('hdri-preset');
    if (hdriPreset && window.viewer) {
        hdriPreset.addEventListener('change', (e) => {
            console.log(`🎨 Changing HDRI to: ${e.target.value}`);
            window.viewer.loadHDRI(e.target.value);
        });
    }

    // Show HDRI Background
    const hdriShowBg = document.getElementById('hdri-show-bg');
    if (hdriShowBg && window.viewer) {
        hdriShowBg.addEventListener('change', (e) => {
            window.viewer.hdriBackgroundVisible = e.target.checked;
            window.viewer.updateCanvasBackground();
        });
    }

    // HDRI Intensity
    const hdriIntensity = document.getElementById('hdri-intensity');
    const hdriIntensityValue = document.getElementById('hdri-intensity-value');
    if (hdriIntensity && window.viewer) {
        hdriIntensity.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            hdriIntensityValue.textContent = value.toFixed(1);
            window.viewer.hdriIntensity = value;
            window.viewer.updateHDRISettings();
        });
    }

    // HDRI Rotation (with debouncing)
    const hdriRotation = document.getElementById('hdri-rotation');
    const hdriRotationValue = document.getElementById('hdri-rotation-value');
    let hdriRotationTimer = null;

    if (hdriRotation && window.viewer) {
        hdriRotation.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            hdriRotationValue.textContent = value.toFixed(0) + '°';
            window.viewer.hdriRotation = value;

            // Update preview immediately
            window.viewer.updateHDRISettings(false);

            // Debounce regeneration
            if (hdriRotationTimer) {
                clearTimeout(hdriRotationTimer);
            }
            hdriRotationTimer = setTimeout(() => {
                console.log('⚡ Regenerating environment with rotation...');
                window.viewer.updateHDRISettings(true);
            }, ViewerConfig.performance.hdriRotationDebounce);
        });
    }

    // Sun Light Toggle
    const sunEnabled = document.getElementById('sun-enabled');
    if (sunEnabled && window.viewer) {
        sunEnabled.addEventListener('change', (e) => {
            window.viewer.sunEnabled = e.target.checked;
            window.viewer.updateSunLightPosition();
        });
    }

    // Sun Intensity
    const sunIntensity = document.getElementById('sun-intensity');
    const sunIntensityValue = document.getElementById('sun-intensity-value');
    if (sunIntensity && window.viewer) {
        sunIntensity.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sunIntensityValue.textContent = value.toFixed(1);
            window.viewer.sunIntensity = value;
            window.viewer.updateSunLightPosition();
        });
    }

    // Sun Azimuth (Horizontal Rotation)
    const sunAzimuth = document.getElementById('sun-azimuth');
    const sunAzimuthValue = document.getElementById('sun-azimuth-value');
    if (sunAzimuth && window.viewer) {
        sunAzimuth.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sunAzimuthValue.textContent = value.toFixed(0) + '°';
            window.viewer.sunAzimuth = value;
            window.viewer.updateSunLightPosition();
        });
    }

    // Sun Elevation (Vertical Angle)
    const sunElevation = document.getElementById('sun-elevation');
    const sunElevationValue = document.getElementById('sun-elevation-value');
    if (sunElevation && window.viewer) {
        sunElevation.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sunElevationValue.textContent = value.toFixed(0) + '°';
            window.viewer.sunElevation = value;
            window.viewer.updateSunLightPosition();
        });
    }

    // Sun Color
    const sunColor = document.getElementById('sun-color');
    if (sunColor && window.viewer) {
        sunColor.addEventListener('input', (e) => {
            window.viewer.sunColor = e.target.value;
            window.viewer.updateSunLightPosition();
        });
    }

    // Shadow Softness
    const shadowSoftness = document.getElementById('shadow-softness');
    const shadowSoftnessValue = document.getElementById('shadow-softness-value');
    if (shadowSoftness && window.viewer) {
        shadowSoftness.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            shadowSoftnessValue.textContent = value.toFixed(0);
            window.viewer.shadowSoftness = value;
            window.viewer.updateSunLightPosition();
        });
    }

    // Shadow Intensity
    const shadowIntensity = document.getElementById('shadow-intensity');
    const shadowIntensityValue = document.getElementById('shadow-intensity-value');
    if (shadowIntensity && window.viewer) {
        shadowIntensity.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            shadowIntensityValue.textContent = value.toFixed(2);
            window.viewer.shadowIntensity = value;
            window.viewer.updateSunLightPosition();
        });
    }

    // Shadow Quality
    const shadowQuality = document.getElementById('shadow-quality');
    if (shadowQuality && window.viewer) {
        shadowQuality.addEventListener('change', (e) => {
            const quality = parseInt(e.target.value);
            window.viewer.shadowQuality = quality;

            // Update shadow map resolution
            if (window.viewer.sunLight) {
                window.viewer.sunLight.shadow.mapSize.width = quality;
                window.viewer.sunLight.shadow.mapSize.height = quality;
                if (window.viewer.sunLight.shadow.map) {
                    window.viewer.sunLight.shadow.map.dispose();
                    window.viewer.sunLight.shadow.map = null;
                }
                console.log(`  ✓ Shadow quality: ${quality}×${quality}`);
            }
        });
    }

    // ========== PATH TRACING CONTROLS ==========

    // Path Tracing Toggle
    const pathtracingEnabled = document.getElementById('pathtracing-enabled');
    const pathtracingStats = document.getElementById('pathtracing-stats');
    const pathtracingWarning = document.getElementById('pathtracing-warning');

    // Track if path tracer library is loaded
    let isPathtracerLoaded = !!window.WebGLPathTracer;

    // Listen for path tracer ready event
    window.addEventListener('pathtracerReady', () => {
        isPathtracerLoaded = true;
        console.log('🎨 Path tracer is now ready for use');
    });

    if (pathtracingEnabled && window.viewer) {
        pathtracingEnabled.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Check if library is loaded
                if (!isPathtracerLoaded && !window.WebGLPathTracer) {
                    alert('Path tracing library is still loading. Please wait a moment and try again.\n\nCheck the browser console for loading progress.');
                    e.target.checked = false;
                    return;
                }

                const success = window.viewer.enablePathTracing();

                if (success) {
                    // Show stats panel
                    if (pathtracingStats) pathtracingStats.style.display = 'block';
                    if (pathtracingWarning) pathtracingWarning.style.display = 'none';
                } else {
                    // Failed to enable - show warning and uncheck
                    e.target.checked = false;
                    if (pathtracingWarning) pathtracingWarning.style.display = 'block';
                    if (pathtracingStats) pathtracingStats.style.display = 'none';
                }
            } else {
                window.viewer.disablePathTracing();
                // Hide stats panel
                if (pathtracingStats) pathtracingStats.style.display = 'none';
            }
        });
    }

    // Path Tracing Quality
    const pathtracingQuality = document.getElementById('pathtracing-quality');
    if (pathtracingQuality && window.viewer) {
        pathtracingQuality.addEventListener('change', (e) => {
            window.viewer.setPathTracingQuality(e.target.value);
        });
    }

    // Path Tracing Reset Button
    const pathtracingResetBtn = document.getElementById('pathtracing-reset-btn');
    if (pathtracingResetBtn && window.viewer) {
        pathtracingResetBtn.addEventListener('click', () => {
            window.viewer.resetPathTracing();
        });
    }

    // ========== ANIMATION CONTROLS ==========

    // Camera Orbit Toggle
    const orbitEnabled = document.getElementById('orbit-enabled');
    if (orbitEnabled && window.viewer) {
        orbitEnabled.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            window.viewer.orbitEnabled = enabled;

            // Enable/disable OrbitControls
            if (window.viewer.orbitControls) {
                window.viewer.orbitControls.enabled = enabled;
                console.log(`🎥 Camera orbit controls ${enabled ? 'enabled' : 'disabled'}`);
            }

            // If enabling orbit while path tracing is active, warn user
            if (enabled && window.viewer.pathTracingEnabled) {
                console.warn('⚠️ Camera movement will reset path tracing');
                alert('Warning: Moving the camera will reset the path tracing render. Consider disabling path tracing or keeping the camera still.');
            }
        });
    }

    // Turntable Toggle
    const turntableEnabled = document.getElementById('turntable-enabled');
    if (turntableEnabled && window.viewer) {
        turntableEnabled.addEventListener('change', (e) => {
            window.viewer.turntableEnabled = e.target.checked;

            // If enabling turntable while path tracing is active, warn user
            if (e.target.checked && window.viewer.pathTracingEnabled) {
                console.warn('⚠️ Turntable animation will constantly reset path tracing');
                alert('Warning: Turntable animation will constantly reset the path tracing render. Consider disabling path tracing for smooth animation.');
            }
        });
    }

    // Turntable X-Axis Speed
    const turntableSpeedX = document.getElementById('turntable-speed-x');
    const turntableSpeedXValue = document.getElementById('turntable-speed-x-value');
    if (turntableSpeedX && window.viewer) {
        turntableSpeedX.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            turntableSpeedXValue.textContent = value.toFixed(1);
            window.viewer.turntableSpeedX = value;
        });
    }

    // Turntable Y-Axis Speed
    const turntableSpeedY = document.getElementById('turntable-speed-y');
    const turntableSpeedYValue = document.getElementById('turntable-speed-y-value');
    if (turntableSpeedY && window.viewer) {
        turntableSpeedY.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            turntableSpeedYValue.textContent = value.toFixed(1);
            window.viewer.turntableSpeedY = value;
        });
    }

    // Turntable Z-Axis Speed
    const turntableSpeedZ = document.getElementById('turntable-speed-z');
    const turntableSpeedZValue = document.getElementById('turntable-speed-z-value');
    if (turntableSpeedZ && window.viewer) {
        turntableSpeedZ.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            turntableSpeedZValue.textContent = value.toFixed(1);
            window.viewer.turntableSpeedZ = value;
        });
    }

    // ========== BACKGROUND CONTROLS ==========

    // Background Color
    const bgColor = document.getElementById('bg-color');
    if (bgColor && window.viewer) {
        bgColor.addEventListener('input', (e) => {
            window.viewer.updateCanvasBackground();
        });
    }

    // Transparent Background
    const bgTransparent = document.getElementById('bg-transparent');
    if (bgTransparent && window.viewer) {
        bgTransparent.addEventListener('change', (e) => {
            window.viewer.updateCanvasBackground();
        });
    }

    // Background Image Upload
    const bgImageBtn = document.getElementById('bg-image-btn');
    const bgImageInput = document.getElementById('bg-image-input');
    const bgImageRemoveBtn = document.getElementById('bg-image-remove-btn');
    const bgImageText = document.getElementById('bg-image-text');
    const bgFitGroup = document.getElementById('bg-fit-group');

    if (bgImageBtn && bgImageInput) {
        bgImageBtn.addEventListener('click', (e) => {
            if (e.target === bgImageRemoveBtn) return;
            bgImageInput.click();
        });

        bgImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && window.viewer) {
                const img = new Image();
                img.onload = () => {
                    window.viewer.setBackgroundImage(img);
                    bgImageText.textContent = file.name.length > 20
                        ? file.name.substring(0, 20) + '...'
                        : file.name;
                    bgImageRemoveBtn.style.display = 'block';
                    bgFitGroup.style.display = 'block';
                    console.log('✅ Background image loaded');
                };
                img.onerror = () => {
                    console.error('❌ Failed to load background image');
                    alert('Failed to load image');
                };
                img.src = URL.createObjectURL(file);
            }
        });

        bgImageRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.viewer) {
                window.viewer.clearBackgroundImage();
                bgImageInput.value = '';
                bgImageText.textContent = 'Upload Background Image';
                bgImageRemoveBtn.style.display = 'none';
                bgFitGroup.style.display = 'none';
            }
        });
    }

    // Background Image Fit
    const bgFit = document.getElementById('bg-fit');
    if (bgFit && window.viewer) {
        bgFit.addEventListener('change', (e) => {
            window.viewer.setBackgroundImageFit(e.target.value);
        });
    }

    // Foreground Image Upload
    const fgImageBtn = document.getElementById('fg-image-btn');
    const fgImageInput = document.getElementById('fg-image-input');
    const fgImageRemoveBtn = document.getElementById('fg-image-remove-btn');
    const fgImageText = document.getElementById('fg-image-text');

    if (fgImageBtn && fgImageInput) {
        fgImageBtn.addEventListener('click', (e) => {
            if (e.target === fgImageRemoveBtn) return;
            fgImageInput.click();
        });

        fgImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && window.viewer) {
                const img = new Image();
                img.onload = () => {
                    window.viewer.setForegroundImage(img);
                    fgImageText.textContent = file.name.length > 20
                        ? file.name.substring(0, 20) + '...'
                        : file.name;
                    fgImageRemoveBtn.style.display = 'block';
                    console.log('✅ Foreground image loaded');
                };
                img.onerror = () => {
                    console.error('❌ Failed to load foreground image');
                    alert('Failed to load foreground image. Please use a valid PNG file.');
                };
                img.src = URL.createObjectURL(file);
            }
        });

        fgImageRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.viewer) {
                window.viewer.clearForegroundImage();
                fgImageInput.value = '';
                fgImageText.textContent = 'Upload Foreground Image';
                fgImageRemoveBtn.style.display = 'none';
            }
        });
    }

    // ========== EXPORT CONTROLS ==========

    const exportBtn = document.getElementById('export-btn');
    const exportModal = document.getElementById('exportModal');
    const closeExportModal = document.getElementById('closeExportModal');
    const cancelExport = document.getElementById('cancelExport');
    const startExport = document.getElementById('startExport');
    const exportSizeDisplay = document.getElementById('exportSizeDisplay');

    // Open export modal
    if (exportBtn && exportModal) {
        exportBtn.addEventListener('click', () => {
            exportModal.style.display = 'flex';
            // Update canvas size display
            if (exportSizeDisplay && window.viewer) {
                exportSizeDisplay.textContent = `${window.viewer.canvas.width} × ${window.viewer.canvas.height}`;
            }
        });
    }

    // Close modal handlers
    if (closeExportModal) {
        closeExportModal.addEventListener('click', () => {
            exportModal.style.display = 'none';
        });
    }

    if (cancelExport) {
        cancelExport.addEventListener('click', () => {
            exportModal.style.display = 'none';
        });
    }

    // Close modal on background click
    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                exportModal.style.display = 'none';
            }
        });
    }

    // Start export handler
    if (startExport) {
        startExport.addEventListener('click', () => {
            if (!window.viewer) return;

            const format = document.getElementById('exportFormat')?.value || 'png';
            const duration = parseInt(document.getElementById('exportDuration')?.value) || 5;

            // Close modal
            exportModal.style.display = 'none';

            // Route to appropriate export method
            if (format === 'png') {
                window.viewer.exportPNG();
            } else if (format === 'mp4') {
                window.viewer.exportMP4(duration);
            } else if (format === 'png-sequence') {
                window.viewer.exportPNGSequence(duration);
            } else if (format === 'iframe') {
                window.viewer.exportIframe();
            }
        });
    }

    console.log('✅ UI controls initialized');
});
