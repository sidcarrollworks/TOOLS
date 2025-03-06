/**
 * ShaderApp - Main application class for the GLSL Gradient Shader Generator
 */
class ShaderApp {
  constructor() {
    // Initialize properties
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null; // OrbitControls
    this.plane = null;
    this.geometry = null;
    this.material = null;
    this.gui = null;
    this.controllers = [];
    this.time = 0;
    this.stats = null; // Performance stats
    this.shaders = {
      perlinNoise: '',
      vertex: '',
      fragment: ''
    };
    
    // Track if we're currently interacting with GUI
    this.isInteractingWithGUI = false;
    
    // Default parameters
    this.params = {
      // Plane geometry
      planeWidth: 2,
      planeHeight: 2,
      segments: 128,
      
      // Rotation
      rotationX: -Math.PI / 4, // 45 degrees
      rotationY: 0,
      rotationZ: 0,
      
      // Camera
      cameraDistance: 2,
      cameraFov: 90,
      
      // Normal noise
      normalNoiseScaleX: 3.0,
      normalNoiseScaleY: 3.0,
      normalNoiseSpeed: 0.2,
      normalNoiseStrength: 0.15,
      normalNoiseShiftSpeed: 0.0,
      
      // Color noise
      colorNoiseScale: 2.0,
      colorNoiseSpeed: 0.3,
      
      // Gradient shift parameters
      gradientShiftX: 0.2,
      gradientShiftY: 0.1,
      gradientShiftSpeed: 0.05,
      
      // Colors
      gradientMode: 0, // 0: B-spline, 1: Linear, 2: Step, 3: Smooth step, 4: Direct mapping
      color1: "#ff0000",
      color2: "#00ff00",
      color3: "#0000ff",
      color4: "#ffff00",
      
      // Lighting
      lightX: 0.5,
      lightY: 0.8,
      lightZ: 1.0,
      diffuseIntensity: 0.5,
      ambientIntensity: 0.5,
      rimLightIntensity: 0.3,
      
      // Visualization
      backgroundColor: "#111111",
      showWireframe: false,
      wireframeColor: "#ffffff",
      
      // Animation
      animationSpeed: 0.01,
      pauseAnimation: false,
    };
    
    // Uniforms for the shader
    this.uniformColors = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, 1, 0),
    ];
    
    this.uniforms = {
      uTime: { value: 0.0 },
      uNoiseScaleX: { value: this.params.normalNoiseScaleX },
      uNoiseScaleY: { value: this.params.normalNoiseScaleY },
      uNoiseSpeed: { value: this.params.normalNoiseSpeed },
      uNoiseStrength: { value: this.params.normalNoiseStrength },
      uNoiseShiftSpeed: { value: this.params.normalNoiseShiftSpeed },
      uColorNoiseScale: { value: this.params.colorNoiseScale },
      uColorNoiseSpeed: { value: this.params.colorNoiseSpeed },
      uGradientMode: { value: this.params.gradientMode },
      
      // Gradient shift uniforms
      uGradientShiftX: { value: this.params.gradientShiftX },
      uGradientShiftY: { value: this.params.gradientShiftY },
      uGradientShiftSpeed: { value: this.params.gradientShiftSpeed },
      
      uColors: { value: this.uniformColors },

      uLightDir: {
        value: new THREE.Vector3(
          this.params.lightX,
          this.params.lightY,
          this.params.lightZ
        ).normalize(),
      },
      uDiffuseIntensity: { value: this.params.diffuseIntensity },
      uAmbientIntensity: { value: this.params.ambientIntensity },
      uRimLightIntensity: { value: this.params.rimLightIntensity },
      uShowWireframe: { value: this.params.showWireframe },
      uWireframeColor: { value: new THREE.Color(this.params.wireframeColor) },
    };
    
    // Preset functions
    this.presets = {
      Default: this.presetDefault.bind(this),
      "Ocean Waves": this.presetOceanWaves.bind(this),
      "Lava Flow": this.presetLavaFlow.bind(this),
      "Abstract Art": this.presetAbstractArt.bind(this),
    };
  }
  
  /**
   * Initialize the application
   */
  async init() {
    // Check for WebGL support
    if (!this.isWebGLAvailable()) {
      alert("Your browser or device doesn't seem to support WebGL. This demo may not function correctly.");
      return;
    }
    
    // Load shader files
    await this.loadShaders();
    
    // Set up Three.js scene
    this.setupScene();
    
    // Set up performance stats
    this.setupStats();
    
    // Set up GUI
    this.setupGUI();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load default preset
    this.presets.Default();
    
    // Start animation loop
    this.animate();
  }
  
  /**
   * Set up performance stats
   */
  setupStats() {
    try {
      // Check if Stats is defined
      if (typeof Stats === 'undefined') {
        console.warn('Stats.js library not loaded. Performance monitoring will be disabled.');
        return;
      }
      
      // Create Stats.js instance
      this.stats = new Stats();
      
      // Configure stats panel
      this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      
      // Position the stats panel at the bottom left and add ID for styling
      this.stats.dom.style.position = 'absolute';
      this.stats.dom.style.left = '0px';
      this.stats.dom.style.bottom = '0px'; // Position at bottom instead of top
      this.stats.dom.style.top = 'auto'; // Remove top positioning
      this.stats.dom.id = 'stats';
      
      // Add stats to the document
      document.body.appendChild(this.stats.dom);
      
      console.log('Performance monitoring enabled with Stats.js');
    } catch (error) {
      console.error('Error setting up Stats.js:', error);
      this.stats = null;
    }
  }
  
  /**
   * Check if WebGL is available
   */
  isWebGLAvailable() {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Load shader files
   */
  async loadShaders() {
    try {
      // Add random query parameter to force reload
      const timestamp = Date.now();
      
      // Add special cache prevention parameter
      const cacheParams = `?v=${timestamp}`;
      
      // Load Perlin noise code
      const perlinResponse = await fetch(`js/shaders/perlinNoise.glsl${cacheParams}`);
      this.shaders.perlinNoise = await perlinResponse.text();
      
      // Load vertex shader
      const vertexResponse = await fetch(`js/shaders/vertexShader.glsl${cacheParams}`);
      this.shaders.vertex = await vertexResponse.text();
      
      // Load fragment shader
      const fragmentResponse = await fetch(`js/shaders/fragmentShader.glsl${cacheParams}`);
      this.shaders.fragment = await fragmentResponse.text();
      
      // Insert Perlin noise code into both vertex and fragment shaders
      this.shaders.vertex = this.shaders.vertex.replace(
        "// We'll include the Perlin noise code via JavaScript",
        this.shaders.perlinNoise
      );
      
      this.shaders.fragment = this.shaders.fragment.replace(
        "// We'll include the Perlin noise code via JavaScript",
        this.shaders.perlinNoise
      );
      
      console.log("All shader files loaded successfully");
    } catch (error) {
      console.error("Error loading shader files:", error);
    }
  }
  
  /**
   * Set up Three.js scene
   */
  setupScene() {
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      this.params.cameraFov,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = this.params.cameraDistance;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(new THREE.Color(this.params.backgroundColor));
    document.body.appendChild(this.renderer.domElement);
    
    // Setup OrbitControls
    this.setupOrbitControls();
    
    // Create material
    this.material = new THREE.ShaderMaterial({
      vertexShader: this.shaders.vertex,
      fragmentShader: this.shaders.fragment,
      uniforms: this.uniforms,
      side: THREE.DoubleSide,
    });
    
    // Create plane
    this.recreatePlane();
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
  }
  
  /**
   * Set up OrbitControls
   */
  setupOrbitControls() {
    // Create OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    
    // Configure controls
    this.controls.enableDamping = true; // Add smooth damping
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.5;
    this.controls.panSpeed = 0.5;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = Math.PI / 1.5; // Limit vertical rotation
    
    // Set initial position
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, this.params.cameraDistance);
    this.controls.update();
    
    // Add event listener for GUI interaction
    this.setupGUIInteractionDetection();
  }
  
  /**
   * Recreate the plane with current parameters
   */
  recreatePlane() {
    if (this.plane) {
      this.scene.remove(this.plane);
    }
    
    if (this.geometry) {
      this.geometry.dispose();
    }
    
    this.geometry = new THREE.PlaneGeometry(
      this.params.planeWidth,
      this.params.planeHeight,
      this.params.segments,
      this.params.segments
    );
    
    this.plane = new THREE.Mesh(this.geometry, this.material);
    
    this.plane.rotation.x = this.params.rotationX;
    this.plane.rotation.y = this.params.rotationY;
    this.plane.rotation.z = this.params.rotationZ;
    
    this.scene.add(this.plane);
  }
  
  /**
   * Update shader parameters
   */
  updateParams(updateCamera = false) {
    // Update noise parameters
    this.uniforms.uNoiseScaleX.value = this.params.normalNoiseScaleX;
    this.uniforms.uNoiseScaleY.value = this.params.normalNoiseScaleY;
    this.uniforms.uNoiseSpeed.value = this.params.normalNoiseSpeed;
    this.uniforms.uNoiseStrength.value = this.params.normalNoiseStrength;
    this.uniforms.uNoiseShiftSpeed.value = this.params.normalNoiseShiftSpeed;
    
    // Update color noise parameters
    this.uniforms.uColorNoiseScale.value = this.params.colorNoiseScale;
    this.uniforms.uColorNoiseSpeed.value = this.params.colorNoiseSpeed;
    
    // Update gradient shift parameters
    this.uniforms.uGradientShiftX.value = this.params.gradientShiftX;
    this.uniforms.uGradientShiftY.value = this.params.gradientShiftY;
    this.uniforms.uGradientShiftSpeed.value = this.params.gradientShiftSpeed;
    
    // Update gradient mode
    this.uniforms.uGradientMode.value = this.params.gradientMode;
    
    // Convert each color param (hex) to a Three.js Color => Vector3
    const c1 = new THREE.Color(this.params.color1);
    const c2 = new THREE.Color(this.params.color2);
    const c3 = new THREE.Color(this.params.color3);
    const c4 = new THREE.Color(this.params.color4);
    
    this.uniforms.uColors.value[0].set(c1.r, c1.g, c1.b);
    this.uniforms.uColors.value[1].set(c2.r, c2.g, c2.b);
    this.uniforms.uColors.value[2].set(c3.r, c3.g, c3.b);
    this.uniforms.uColors.value[3].set(c4.r, c4.g, c4.b);
    
    // Update lighting
    this.uniforms.uLightDir.value
      .set(this.params.lightX, this.params.lightY, this.params.lightZ)
      .normalize();
    this.uniforms.uDiffuseIntensity.value = this.params.diffuseIntensity;
    this.uniforms.uAmbientIntensity.value = this.params.ambientIntensity;
    this.uniforms.uRimLightIntensity.value = this.params.rimLightIntensity;
    
    // Update wireframe
    this.uniforms.uShowWireframe.value = this.params.showWireframe;
    this.uniforms.uWireframeColor.value.set(this.params.wireframeColor);
    
    // Update plane transform
    if (this.plane) {
      this.plane.rotation.x = this.params.rotationX;
      this.plane.rotation.y = this.params.rotationY;
      this.plane.rotation.z = this.params.rotationZ;
    }
    
    // Update camera parameters only if explicitly requested
    if (updateCamera && this.camera) {
      // Update camera FOV
      if (this.camera.fov !== this.params.cameraFov) {
        this.camera.fov = this.params.cameraFov;
        this.camera.updateProjectionMatrix();
      }
      
      // Update camera distance if using OrbitControls
      if (this.controls) {
        const currentDistance = this.camera.position.distanceTo(this.controls.target);
        if (Math.abs(currentDistance - this.params.cameraDistance) > 0.01) {
          // Calculate new position while maintaining direction
          const direction = this.camera.position.clone().sub(this.controls.target).normalize();
          const newPosition = direction.multiplyScalar(this.params.cameraDistance).add(this.controls.target);
          this.camera.position.copy(newPosition);
          this.controls.update();
        }
      }
    }
    
    // Update background
    this.renderer.setClearColor(new THREE.Color(this.params.backgroundColor));
  }
  
  /**
   * Update GUI controllers to match params
   */
  updateGUI() {
    // Update all controllers to match current params
    for (const controller of this.controllers) {
      controller.updateDisplay();
    }
  }
  
  /**
   * Set up dat.GUI controls
   */
  setupGUI() {
    this.gui = new dat.GUI({ width: 300 });
    
    // Presets folder
    const presetFolder = this.gui.addFolder("Presets");
    for (const name in this.presets) {
      presetFolder.add(this.presets, name).name(name);
    }
    presetFolder.open();
    
    // Performance folder
    if (this.stats) {
      const perfFolder = this.gui.addFolder("Performance");
      const statsOptions = {
        panel: 0 // 0: FPS, 1: MS, 2: MB
      };
      
      perfFolder.add(statsOptions, 'panel', { 'FPS': 0, 'MS': 1, 'MB': 2 })
        .name('Stats Panel')
        .onChange((value) => {
          this.stats.showPanel(Number(value));
        });
    }
    
    // Plane folder (combining geometry and rotation)
    const planeFolder = this.gui.addFolder("Plane");
    this.controllers.push(
      planeFolder
        .add(this.params, "planeWidth", 0.5, 5)
        .name("Width")
        .onChange(() => this.recreatePlane())
    );
    this.controllers.push(
      planeFolder
        .add(this.params, "planeHeight", 0.5, 5)
        .name("Height")
        .onChange(() => this.recreatePlane())
    );
    this.controllers.push(
      planeFolder
        .add(this.params, "segments", 16, 256, 8)
        .name("Segments")
        .onChange(() => this.recreatePlane())
    );
    this.controllers.push(
      planeFolder
        .add(this.params, "rotationX", -Math.PI, Math.PI, 0.01)
        .name("Rotation X")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      planeFolder
        .add(this.params, "rotationY", -Math.PI, Math.PI, 0.01)
        .name("Rotation Y")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      planeFolder
        .add(this.params, "rotationZ", -Math.PI, Math.PI, 0.01)
        .name("Rotation Z")
        .onChange(() => this.updateParams())
    );
    planeFolder.open();
    
    // Camera folder
    const cameraFolder = this.gui.addFolder("Camera");
    this.controllers.push(
      cameraFolder
        .add(this.params, "cameraDistance", 0.5, 10)
        .name("Camera Distance")
        .onChange(() => this.updateParams(true))
    );
    this.controllers.push(
      cameraFolder
        .add(this.params, "cameraFov", 1, 120)
        .name("FOV")
        .onChange(() => this.updateParams(true))
    );
    
    // Normal Noise folder (for vertex displacement only)
    const normalNoiseFolder = this.gui.addFolder("Normal Displacement");
    this.controllers.push(
      normalNoiseFolder
        .add(this.params, "normalNoiseScaleX", 0.1, 10)
        .name("Scale X")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      normalNoiseFolder
        .add(this.params, "normalNoiseScaleY", 0.1, 10)
        .name("Scale Y")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      normalNoiseFolder
        .add(this.params, "normalNoiseSpeed", 0, 1)
        .name("Speed")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      normalNoiseFolder
        .add(this.params, "normalNoiseStrength", 0, 1)
        .name("Strength")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      normalNoiseFolder
        .add(this.params, "normalNoiseShiftSpeed", -1, 1)
        .name("Shift Speed")
        .onChange(() => this.updateParams())
    );
    normalNoiseFolder.open();
    
    // Color Parameters folder (including gradient shift and color noise)
    const colorFolder = this.gui.addFolder("Color Parameters");
    this.controllers.push(
      colorFolder
        .add(this.params, "gradientMode", {
          "B-Spline": 0,
          "Linear": 1,
          "Step": 2,
          "Smooth Step": 3,
          "Direct Mapping": 4
        })
        .name("Gradient Mode")
        .onChange(() => this.updateParams())
    );

    // Color pickers
    this.controllers.push(
      colorFolder
        .addColor(this.params, "color1")
        .name("Color 1")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      colorFolder
        .addColor(this.params, "color2")
        .name("Color 2")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      colorFolder
        .addColor(this.params, "color3")
        .name("Color 3")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      colorFolder
        .addColor(this.params, "color4")
        .name("Color 4")
        .onChange(() => this.updateParams())
    );
    
    // Color noise parameters
    this.controllers.push(
      colorFolder
        .add(this.params, "colorNoiseScale", 0.1, 10)
        .name("Noise Scale")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      colorFolder
        .add(this.params, "colorNoiseSpeed", 0, 1)
        .name("Noise Speed")
        .onChange(() => this.updateParams())
    );
    
    // Gradient shift parameters
    this.controllers.push(
      colorFolder
        .add(this.params, "gradientShiftX", -1, 1, 0.01)
        .name("Shift X")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      colorFolder
        .add(this.params, "gradientShiftY", -1, 1, 0.01)
        .name("Shift Y")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      colorFolder
        .add(this.params, "gradientShiftSpeed", 0, 0.5, 0.01)
        .name("Shift Speed")
        .onChange(() => this.updateParams())
    );
    
    
    colorFolder.open();
    
    // Lighting folder
    const lightFolder = this.gui.addFolder("Lighting");
    this.controllers.push(
      lightFolder
        .add(this.params, "lightX", -1, 1)
        .name("Light X")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      lightFolder
        .add(this.params, "lightY", -1, 1)
        .name("Light Y")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      lightFolder
        .add(this.params, "lightZ", -1, 1)
        .name("Light Z")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      lightFolder
        .add(this.params, "diffuseIntensity", 0, 1)
        .name("Diffuse")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      lightFolder
        .add(this.params, "ambientIntensity", 0, 1)
        .name("Ambient")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      lightFolder
        .add(this.params, "rimLightIntensity", 0, 1)
        .name("Rim Light")
        .onChange(() => this.updateParams())
    );
    
    // Visualization folder
    const visFolder = this.gui.addFolder("Visualization");
    this.controllers.push(
      visFolder
        .addColor(this.params, "backgroundColor")
        .name("Background")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      visFolder
        .add(this.params, "showWireframe")
        .name("Show Wireframe")
        .onChange(() => this.updateParams())
    );
    this.controllers.push(
      visFolder
        .addColor(this.params, "wireframeColor")
        .name("Wireframe Color")
        .onChange(() => this.updateParams())
    );
    
    // Animation folder
    const animFolder = this.gui.addFolder("Animation");
    this.controllers.push(
      animFolder.add(this.params, "animationSpeed", 0, 0.05).name("Speed")
    );
    this.controllers.push(
      animFolder.add(this.params, "pauseAnimation").name("Pause")
    );
    animFolder.open();
  }
  
  /**
   * Set up GUI interaction detection
   */
  setupGUIInteractionDetection() {
    // Get all GUI elements
    const guiElements = document.querySelectorAll('.dg');
    
    // Add event listeners to each GUI element
    guiElements.forEach(element => {
      // Mouse enter GUI
      element.addEventListener('mouseenter', () => {
        this.isInteractingWithGUI = true;
        if (this.controls) {
          this.controls.enabled = false;
        }
      });
      
      // Mouse leave GUI
      element.addEventListener('mouseleave', () => {
        this.isInteractingWithGUI = false;
        if (this.controls) {
          this.controls.enabled = true;
        }
      });
    });
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Handle window resize
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Handle wheel events for zooming
    window.addEventListener('wheel', (event) => {
      // Skip if interacting with GUI
      if (this.isInteractingWithGUI || this.isMouseOverGUI(event)) {
        return;
      }
      
      // Let OrbitControls handle zooming
      // The controls will update camera position automatically
    });
    
    // Update camera distance parameter when controls change
    this.controls.addEventListener('change', () => {
      // Update the camera distance parameter to match the actual camera distance
      const distance = this.camera.position.distanceTo(this.controls.target);
      
      // Only update if the difference is significant to avoid feedback loops
      if (Math.abs(distance - this.params.cameraDistance) > 0.01) {
        this.params.cameraDistance = distance;
        
        // Update GUI without triggering camera updates
        this.updateGUI();
      }
    });
  }
  
  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    // Begin stats measurement
    if (this.stats) this.stats.begin();
    
    if (!this.params.pauseAnimation) {
      // Update time for shader uniforms
      this.time += this.params.animationSpeed;
    }
    
    // Always update the time uniform
    this.uniforms.uTime.value = this.time;
    
    // Update OrbitControls
    if (this.controls) {
      this.controls.update();
    }
    
    this.renderer.render(this.scene, this.camera);
    
    // End stats measurement
    if (this.stats) this.stats.end();
  }
  
  /**
   * Preset: Default
   */
  presetDefault() {
    this.params.planeWidth = 3.8;
    this.params.planeHeight = 3.2;
    this.params.normalNoiseScaleX = 1.7;
    this.params.normalNoiseScaleY = 3.5;
    this.params.normalNoiseSpeed = 0.08;
    this.params.normalNoiseStrength = 0.15;
    this.params.normalNoiseShiftSpeed = 0.0;
    this.params.colorNoiseScale = 2.0;
    this.params.colorNoiseSpeed = 0.3;
    this.params.gradientMode = 0; // B-spline
    this.params.color1 = "#fff";
    this.params.color2 = "#fff";
    this.params.color3 = "#fff";
    this.params.color4 = "#fff";

    this.params.rotationX = -1.1;
    this.params.rotationY = 0;
    this.params.rotationZ = 0;
    this.params.cameraDistance = 0.9;
    this.params.cameraFov = 30;
    this.params.backgroundColor = "#fcfcfc";
    
    this.updateParams(true);
    this.updateGUI();
    this.recreatePlane();
    
    // Reset camera position
    if (this.controls) {
      this.controls.reset();
      this.camera.position.set(0, 0, this.params.cameraDistance);
      this.controls.update();
    }
  }
  
  /**
   * Preset: Ocean Waves
   */
  presetOceanWaves() {
    this.params.normalNoiseScaleX = 5.0;
    this.params.normalNoiseScaleY = 5.0;
    this.params.normalNoiseSpeed = 0.3;
    this.params.normalNoiseStrength = 0.1;
    this.params.normalNoiseShiftSpeed = 0.1;
    this.params.colorNoiseScale = 3.0;
    this.params.colorNoiseSpeed = 0.2;
    this.params.gradientMode = 1; // Linear interpolation
    this.params.color1 = "#006994";
    this.params.color2 = "#0099cc";
    this.params.color3 = "#00ffcc";
    this.params.color4 = "#0080ff";

    // Set up gradient shift for wave-like movement
    this.params.gradientShiftX = 0.5;  // Horizontal wave movement
    this.params.gradientShiftY = 0.2;  // Slight vertical movement
    this.params.gradientShiftSpeed = 0.08;  // Moderate speed

    this.params.backgroundColor = "#001030";
    this.params.rotationX = -Math.PI / 3;
    
    this.updateParams(true);
    this.updateGUI();
    this.recreatePlane();
    
    // Reset camera position
    if (this.controls) {
      this.controls.reset();
      this.camera.position.set(0, 0, this.params.cameraDistance);
      this.controls.update();
    }
  }
  
  /**
   * Preset: Lava Flow
   */
  presetLavaFlow() {
    this.params.normalNoiseScaleX = 1.6;
    this.params.normalNoiseScaleY = 3.7;
    this.params.normalNoiseSpeed = 0.1;
    this.params.normalNoiseStrength = 0.2;
    this.params.normalNoiseShiftSpeed = -0.05;
    this.params.colorNoiseScale = 6.1;
    this.params.colorNoiseSpeed = 0.15;
    this.params.gradientMode = 3; // Smooth step
    this.params.color1 = "#9f0000";
    this.params.color2 = "#ff3000";
    this.params.color3 = "#ff6633";
    this.params.color4 = "#ff9900";

    this.params.backgroundColor = "#1A0000";
    this.params.lightY = 0.5;
    
    this.updateParams(true);
    this.updateGUI();
    this.recreatePlane();
    
    // Reset camera position
    if (this.controls) {
      this.controls.reset();
      this.camera.position.set(0, 0, this.params.cameraDistance);
      this.controls.update();
    }
  }
  
  
  /**
   * Preset: Abstract Art
   */
  presetAbstractArt() {
    this.params.normalNoiseScaleX = 1.7;
    this.params.normalNoiseScaleY = 3.5;
    this.params.normalNoiseSpeed = 0.08;
    this.params.normalNoiseStrength = 0.15;
    this.params.normalNoiseShiftSpeed = 0.09;
    this.params.colorNoiseScale = 4.9;
    this.params.colorNoiseSpeed = 0.08;
    this.params.gradientMode = 3; // Smooth step function
    this.params.color1 = "#fffd82";
    this.params.color2 = "#e84855";
    this.params.color3 = "#2b3a67";
    this.params.color4 = "#20ffe8";
    this.params.planeHeight = 3.2;
    this.params.planeWidth = 3.8;

    this.params.lightY = 0.8;
    this.params.lightX = 0.5;
    this.params.lightZ = 1.0;
    this.params.diffuseIntensity = 0.91;
    this.params.ambientIntensity = 0.65;
    this.params.rimLightIntensity = 0.49;

    this.params.rotationX = -Math.PI / 2.854;
    this.params.rotationY = 0;
    this.params.backgroundColor = "#000000";
    
    this.updateParams(true);
    this.updateGUI();
    this.recreatePlane();
    
    // Reset camera position
    if (this.controls) {
      this.controls.reset();
      this.camera.position.set(0, 0, this.params.cameraDistance);
      this.controls.update();
    }
  }

  // Helper function to check if mouse is over a GUI element
  isMouseOverGUI(event) {
    // Get the GUI container element
    const guiContainer = document.querySelector('.dg.main.a');

    if (!guiContainer) return false;
    
    // Check if the mouse is over the GUI container
    const rect = guiContainer.getBoundingClientRect();
    return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
    );
  }
}

// Export the class
window.ShaderApp = ShaderApp; 