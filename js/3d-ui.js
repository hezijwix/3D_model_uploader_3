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

    // ========== ANIMATION CONTROLS ==========

    // Turntable Toggle
    const turntableEnabled = document.getElementById('turntable-enabled');
    if (turntableEnabled && window.viewer) {
        turntableEnabled.addEventListener('change', (e) => {
            window.viewer.turntableEnabled = e.target.checked;
        });
    }

    // Turntable Speed
    const turntableSpeed = document.getElementById('turntable-speed');
    const turntableSpeedValue = document.getElementById('turntable-speed-value');
    if (turntableSpeed && window.viewer) {
        turntableSpeed.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            turntableSpeedValue.textContent = value.toFixed(1);
            window.viewer.turntableSpeed = value;
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

    // ========== EXPORT CONTROLS ==========

    const exportBtn = document.getElementById('export-btn');
    const exportModal = document.getElementById('export-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const exportPreviewContainer = document.getElementById('export-preview-container');
    const exportPreviewCanvas = document.getElementById('export-preview-canvas');
    const downloadExportBtn = document.getElementById('download-export-btn');

    let currentExportScale = 1;
    let exportDataURL = null;

    if (exportBtn && exportModal) {
        exportBtn.addEventListener('click', () => {
            exportModal.style.display = 'flex';
            exportPreviewContainer.style.display = 'none';
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            exportModal.style.display = 'none';
            exportPreviewContainer.style.display = 'none';
        });
    }

    // Close modal on background click
    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                exportModal.style.display = 'none';
                exportPreviewContainer.style.display = 'none';
            }
        });
    }

    // Export resolution buttons
    const resolutionBtns = document.querySelectorAll('.export-resolution-btn');
    resolutionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!window.viewer) return;

            const scale = parseInt(btn.dataset.scale);
            currentExportScale = scale;

            console.log(`📸 Exporting at ${scale}× resolution...`);

            // Render high resolution
            window.viewer.renderHighResolution(exportPreviewCanvas, scale);

            // Convert to data URL
            exportDataURL = exportPreviewCanvas.toDataURL('image/png', 1.0);

            // Show preview
            exportPreviewContainer.style.display = 'block';

            console.log('✅ Export preview ready');
        });
    });

    // Download button
    if (downloadExportBtn) {
        downloadExportBtn.addEventListener('click', () => {
            if (!exportDataURL) return;

            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `3d-render-${currentExportScale}x-${timestamp}.png`;
            link.href = exportDataURL;
            link.click();

            console.log(`✅ Image downloaded (${currentExportScale}×)`);
        });
    }

    console.log('✅ UI controls initialized');
});
