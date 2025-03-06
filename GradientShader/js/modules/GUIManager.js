/**
 * GUIManager - Handles dat.GUI setup and event listeners
 */
export class GUIManager {
  /**
   * Create a GUIManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app) {
    this.app = app;
    this._resizeHandler = null;
  }
  
  /**
   * Update GUI controllers to match params
   */
  updateGUI() {
    // Update all controllers to match current params
    for (const controller of this.app.controllers) {
      controller.updateDisplay();
    }
  }
  
  /**
   * Set up dat.GUI controls
   */
  setupGUI() {
    // Create dat.GUI instance
    this.app.gui = new dat.GUI({ width: 300 });
    this.app.controllers = [];

    // Presets folder (moved to the top)
    const presetFolder = this.app.gui.addFolder("Presets");
    presetFolder.add(this.app.presets, "Default").name("Default");
    presetFolder.add(this.app.presets, "Ocean Waves").name("Ocean Waves");
    presetFolder.add(this.app.presets, "Lava Flow").name("Lava Flow");
    presetFolder.add(this.app.presets, "Abstract Art").name("Abstract Art");
    presetFolder.open();

    // Plane controls
    const planeFolder = this.app.gui.addFolder("Plane Controls");
    this.app.controllers.push(
      planeFolder
        .add(this.app.params, "planeWidth", 0.5, 5, 0.1)
        .name("Width")
        .onChange(() => this.app.recreatePlane())
    );
    this.app.controllers.push(
      planeFolder
        .add(this.app.params, "planeHeight", 0.5, 5, 0.1)
        .name("Height")
        .onChange(() => this.app.recreatePlane())
    );
    this.app.controllers.push(
      planeFolder
        .add(this.app.params, "planeSegments", 16, 256, 8)
        .name("Segments")
        .onChange(() => this.app.recreatePlane())
    );
    planeFolder.open();

    // Normal Displacement folder
    const normalFolder = this.app.gui.addFolder("Normal Displacement");
    this.app.controllers.push(
      normalFolder
        .add(this.app.params, "normalNoiseScaleX", 0.1, 10, 0.1)
        .name("Scale X")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      normalFolder
        .add(this.app.params, "normalNoiseScaleY", 0.1, 10, 0.1)
        .name("Scale Y")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      normalFolder
        .add(this.app.params, "normalNoiseSpeed", 0, 1, 0.01)
        .name("Speed")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      normalFolder
        .add(this.app.params, "normalNoiseStrength", 0, 1, 0.01)
        .name("Strength")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      normalFolder
        .add(this.app.params, "normalNoiseShiftX", -1, 1, 0.01)
        .name("Shift X")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      normalFolder
        .add(this.app.params, "normalNoiseShiftY", -1, 1, 0.01)
        .name("Shift Y")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      normalFolder
        .add(this.app.params, "normalNoiseShiftSpeed", 0, 1, 0.01)
        .name("Shift Speed")
        .onChange(() => this.app.updateParams())
    );
    normalFolder.open();

    // Color Parameters folder (including gradient shift and color noise)
    const colorFolder = this.app.gui.addFolder("Color Parameters");
    this.app.controllers.push(
      colorFolder
        .add(this.app.params, "gradientMode", {
          "B-Spline": 0,
          "Linear": 1,
          "Step": 2,
          "Smooth Step": 3,
          "Direct Mapping": 4
        })
        .name("Gradient Mode")
        .onChange(() => this.app.updateParams())
    );
    
    // Color pickers
    this.app.controllers.push(
      colorFolder
        .addColor(this.app.params, "color1")
        .name("Color 1")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      colorFolder
        .addColor(this.app.params, "color2")
        .name("Color 2")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      colorFolder
        .addColor(this.app.params, "color3")
        .name("Color 3")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      colorFolder
        .addColor(this.app.params, "color4")
        .name("Color 4")
        .onChange(() => this.app.updateParams())
    );
    
    // Color noise parameters
    this.app.controllers.push(
      colorFolder
        .add(this.app.params, "colorNoiseScale", 0.1, 10, 0.1)
        .name("Noise Scale")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      colorFolder
        .add(this.app.params, "colorNoiseSpeed", 0, 1, 0.01)
        .name("Noise Speed")
        .onChange(() => this.app.updateParams())
    );
    
    // Gradient shift parameters
    this.app.controllers.push(
      colorFolder
        .add(this.app.params, "gradientShiftX", -1, 1, 0.01)
        .name("Shift X")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      colorFolder
        .add(this.app.params, "gradientShiftY", -1, 1, 0.01)
        .name("Shift Y")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      colorFolder
        .add(this.app.params, "gradientShiftSpeed", 0, 0.5, 0.01)
        .name("Shift Speed")
        .onChange(() => this.app.updateParams())
    );
    
    colorFolder.open();

    // Camera Controls
    const cameraFolder = this.app.gui.addFolder("Camera Controls");
    this.app.controllers.push(
      cameraFolder
        .add(this.app.params, "cameraDistance", 0.5, 10, 0.1)
        .name("Distance")
        .onChange(() => this.app.updateParams(true))
    );
    this.app.controllers.push(
      cameraFolder
        .add(this.app.params, "cameraFov", 1, 120, 1)
        .name("FOV")
        .onChange(() => this.app.updateParams(true))
    );
    cameraFolder.open();

    // Lighting folder
    const lightFolder = this.app.gui.addFolder("Lighting");
    this.app.controllers.push(
      lightFolder
        .add(this.app.params, "lightDirX", -1, 1, 0.01)
        .name("Light X")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      lightFolder
        .add(this.app.params, "lightDirY", -1, 1, 0.01)
        .name("Light Y")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      lightFolder
        .add(this.app.params, "lightDirZ", -1, 1, 0.01)
        .name("Light Z")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      lightFolder
        .add(this.app.params, "diffuseIntensity", 0, 1, 0.01)
        .name("Diffuse")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      lightFolder
        .add(this.app.params, "ambientIntensity", 0, 1, 0.01)
        .name("Ambient")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      lightFolder
        .add(this.app.params, "rimLightIntensity", 0, 1, 0.01)
        .name("Rim Light")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      lightFolder
        .add(this.app.params, "showWireframe")
        .name("Show Wireframe")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      lightFolder
        .addColor(this.app.params, "wireframeColor")
        .name("Wireframe Color")
        .onChange(() => this.app.updateParams())
    );
    lightFolder.open();

    // Animation speed control
    const animationFolder = this.app.gui.addFolder("Animation");
    this.app.controllers.push(
      animationFolder
        .add(this.app.params, "animationSpeed", 0, 0.05, 0.001)
        .name("Speed")
        .onChange(() => this.app.updateParams())
    );
    this.app.controllers.push(
      animationFolder
        .add(this.app.params, "pauseAnimation")
        .name("Pause Animation")
        .onChange(() => this.app.updateParams())
    );
    animationFolder.open();

    // Visualization folder
    const visFolder = this.app.gui.addFolder("Visualization");
    this.app.controllers.push(
      visFolder
        .addColor(this.app.params, "backgroundColor")
        .name("Background")
        .onChange(() => {
          this.app.renderer.setClearColor(this.app.params.backgroundColor);
          this.app.updateParams();
        })
    );
    visFolder.open();
    
    // Export folder
    const exportFolder = this.app.gui.addFolder("Export");
    exportFolder.add(this.app, "saveAsImage").name("Save as Image");
    exportFolder.add(this.app, "exportCode").name("Export Code");
    exportFolder.add(this.app.params, "exportTransparentBg").name("Transparent Background");
    exportFolder.add(this.app.params, "exportHighQuality").name("High Quality");
    exportFolder.open();
    
    // Performance folder
    if (this.app.stats) {
      const perfFolder = this.app.gui.addFolder("Performance");
      const statsOptions = {
        panel: 0 // 0: FPS, 1: MS, 2: MB
      };
      
      perfFolder.add(statsOptions, 'panel', { 'FPS': 0, 'MS': 1, 'MB': 2 })
        .name('Stats Panel')
        .onChange((value) => {
          this.app.stats.showPanel(Number(value));
        });
      perfFolder.open();
    }
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Create a reference to the resize handler for later removal
    this._resizeHandler = () => {
      this.app.camera.aspect = window.innerWidth / window.innerHeight;
      this.app.camera.updateProjectionMatrix();
      this.app.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    // Handle window resize
    window.addEventListener("resize", this._resizeHandler);
    
    // Update camera distance parameter when controls change
    this.app.controls.addEventListener('change', () => {
      // Update the camera distance parameter to match the actual camera distance
      const distance = this.app.camera.position.distanceTo(this.app.controls.target);
      
      // Only update if the difference is significant to avoid feedback loops
      if (Math.abs(distance - this.app.params.cameraDistance) > 0.01) {
        this.app.params.cameraDistance = distance;
        
        // Update GUI without triggering camera updates
        this.updateGUI();
      }
      
      // Save camera position and target to params
      this.app.params.cameraPosX = this.app.camera.position.x;
      this.app.params.cameraPosY = this.app.camera.position.y;
      this.app.params.cameraPosZ = this.app.camera.position.z;
      
      this.app.params.cameraTargetX = this.app.controls.target.x;
      this.app.params.cameraTargetY = this.app.controls.target.y;
      this.app.params.cameraTargetZ = this.app.controls.target.z;
    });
  }
  
  /**
   * Clean up resources managed by GUIManager
   */
  dispose() {
    // Remove event listeners
    if (this._resizeHandler) {
      window.removeEventListener("resize", this._resizeHandler);
      this._resizeHandler = null;
    }
    
    // Cleanup GUI
    if (this.app.gui) {
      this.app.gui.destroy();
      this.app.gui = null;
    }
    
    console.log('GUIManager resources cleaned up');
  }
} 