/**
 * HTMLExporter - Handles HTML export functionality
 */
export class HTMLExporter {
  /**
   * Create an HTMLExporter
   * @param {Object} app - Reference to main app
   */
  constructor(app) {
    this.app = app;
  }
  
  /**
   * Generate HTML setup code
   * @returns {string} HTML setup code
   */
  generateHTMLSetup() {
    const params = this.app.params;
    const transparentBg = params.exportTransparentBg;
    
    // Set appropriate background style based on transparency setting
    const bgStyle = transparentBg 
      ? 'background-color: transparent;' 
      : `background-color: ${params.backgroundColor};`;
    
    return `<!DOCTYPE html>
<html>
<head>
  <title>Gradient Shader</title>
  <style>
    body { margin: 0; overflow: hidden; ${bgStyle} }
    canvas { display: block; }
  </style>
</head>
<body>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script>
    // Your shader code will go here
  </script>
</body>
</html>`;
  }
  
  /**
   * Generate JavaScript scene setup code
   * @returns {string} Scene setup code
   */
  generateSceneSetup() {
    const params = this.app.params;
    const transparentBg = params.exportTransparentBg;
    
    // Create renderer options based on transparency setting
    const rendererOptions = transparentBg
      ? '{ antialias: true, alpha: true }'
      : '{ antialias: true }';
    
    // Set clear color based on transparency setting
    const clearColorCode = transparentBg
      ? 'renderer.setClearColor(0x000000, 0);' // Transparent
      : `renderer.setClearColor(new THREE.Color("${params.backgroundColor}"));`;
    
    return `// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(${params.cameraFov}, window.innerWidth / window.innerHeight, 0.1, 1000);

// Set camera position
camera.position.set(${params.cameraPosX.toFixed(4)}, ${params.cameraPosY.toFixed(4)}, ${params.cameraPosZ.toFixed(4)});

// Make camera look at the target point
camera.lookAt(${params.cameraTargetX.toFixed(4)}, ${params.cameraTargetY.toFixed(4)}, ${params.cameraTargetZ.toFixed(4)});

// Create renderer
const renderer = new THREE.WebGLRenderer(${rendererOptions});
renderer.setSize(window.innerWidth, window.innerHeight);
${clearColorCode}
document.body.appendChild(renderer.domElement);

// Create shader material with your custom parameters
const uniforms = {
  uTime: { value: 0.0 },
  uNoiseScaleX: { value: ${params.normalNoiseScaleX} },
  uNoiseScaleY: { value: ${params.normalNoiseScaleY} },
  uNoiseSpeed: { value: ${params.normalNoiseSpeed} },
  uNoiseStrength: { value: ${params.normalNoiseStrength} },
  uNoiseShiftX: { value: ${params.normalNoiseShiftX} },
  uNoiseShiftY: { value: ${params.normalNoiseShiftY} },
  uNoiseShiftSpeed: { value: ${params.normalNoiseShiftSpeed} },
  uColorNoiseScale: { value: ${params.colorNoiseScale} },
  uColorNoiseSpeed: { value: ${params.colorNoiseSpeed} },
  uGradientMode: { value: ${params.gradientMode} },
  uGradientShiftX: { value: ${params.gradientShiftX} },
  uGradientShiftY: { value: ${params.gradientShiftY} },
  uGradientShiftSpeed: { value: ${params.gradientShiftSpeed} },
  uColors: { 
    value: [
      new THREE.Vector3(${this.getRGBValues(params.color1)}),
      new THREE.Vector3(${this.getRGBValues(params.color2)}),
      new THREE.Vector3(${this.getRGBValues(params.color3)}),
      new THREE.Vector3(${this.getRGBValues(params.color4)})
    ] 
  },
  uLightDir: { 
    value: new THREE.Vector3(${params.lightDirX}, ${params.lightDirY}, ${params.lightDirZ}).normalize() 
  },
  uDiffuseIntensity: { value: ${params.diffuseIntensity} },
  uAmbientIntensity: { value: ${params.ambientIntensity} },
  uRimLightIntensity: { value: ${params.rimLightIntensity} },
  uShowWireframe: { value: ${params.showWireframe} },
  uWireframeColor: { value: new THREE.Color("${params.wireframeColor}") }
};`;
  }
  
  /**
   * Generate geometry and animation code
   * @returns {string} Geometry and animation code
   */
  generateGeometryAndAnimation() {
    const params = this.app.params;
    
    return `// Create geometry and mesh
const geometry = new THREE.PlaneGeometry(${params.planeWidth}, ${params.planeHeight}, ${params.planeSegments}, ${params.planeSegments});
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = ${params.rotationX};
plane.rotation.y = ${params.rotationY};
plane.rotation.z = ${params.rotationZ};
scene.add(plane);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update time uniform
  uniforms.uTime.value += ${params.animationSpeed};
  
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation loop
animate();`;
  }
  
  /**
   * Get RGB values from hex color
   * @param {string} hexColor - Hex color string
   * @returns {string} RGB values as comma-separated string
   */
  getRGBValues(hexColor) {
    const color = new THREE.Color(hexColor);
    return `${color.r}, ${color.g}, ${color.b}`;
  }
} 