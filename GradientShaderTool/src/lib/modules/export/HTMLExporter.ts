/**
 * HTMLExporter - Handles HTML export functionality
 */
import * as THREE from "three";
import { ShaderApp } from "../../ShaderApp";

export class HTMLExporter {
  private app: ShaderApp;

  /**
   * Create an HTMLExporter
   * @param app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
  }

  /**
   * Generate HTML setup code
   * @returns HTML setup code
   */
  generateHTMLSetup(): string {
    const params = this.app.params;
    const transparentBg = params.exportTransparentBg;

    // Set appropriate background style based on transparency setting
    const bgStyle = transparentBg
      ? "background-color: transparent;"
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
   * @returns Scene setup code
   */
  generateSceneSetup(): string {
    const params = this.app.params;
    const transparentBg = params.exportTransparentBg;

    // Create renderer options based on transparency setting
    const rendererOptions = transparentBg
      ? "{ antialias: true, alpha: true }"
      : "{ antialias: true }";

    // Set clear color based on transparency setting
    const clearColorCode = transparentBg
      ? "renderer.setClearColor(0x000000, 0);" // Transparent
      : `renderer.setClearColor(new THREE.Color("${params.backgroundColor}"));`;

    // Default wireframe color if not defined in params
    const wireframeColor = (params as any).wireframeColor || "#ffffff";

    return `// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(${
      params.cameraFov
    }, window.innerWidth / window.innerHeight, 0.1, 1000);

// Set camera position
camera.position.set(${params.cameraPosX.toFixed(
      4
    )}, ${params.cameraPosY.toFixed(4)}, ${params.cameraPosZ.toFixed(4)});

// Make camera look at the target point
camera.lookAt(${params.cameraTargetX.toFixed(
      4
    )}, ${params.cameraTargetY.toFixed(4)}, ${params.cameraTargetZ.toFixed(4)});

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
  uGeometryType: { value: ${params.geometryType === "sphere" ? 1.0 : 0.0} },
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
    value: new THREE.Vector3(${params.lightDirX}, ${params.lightDirY}, ${
      params.lightDirZ
    }).normalize() 
  },
  uDiffuseIntensity: { value: ${params.diffuseIntensity} },
  uAmbientIntensity: { value: ${params.ambientIntensity} },
  uRimLightIntensity: { value: ${params.rimLightIntensity} }
};`;
  }

  /**
   * Generate geometry and animation code
   * @returns Geometry and animation code
   */
  generateGeometryAndAnimation(): string {
    const params = this.app.params;

    // Generate geometry creation code based on the selected type
    let geometryCode = "";

    switch (params.geometryType) {
      case "sphere":
        geometryCode = `const geometry = new THREE.SphereGeometry(${params.sphereRadius}, ${params.sphereWidthSegments}, ${params.sphereHeightSegments});`;
        break;
      case "plane":
      default:
        geometryCode = `const geometry = new THREE.PlaneGeometry(${params.planeWidth}, ${params.planeHeight}, ${params.planeSegments}, ${params.planeSegments});`;
        break;
    }

    return `// Create geometry and mesh
${geometryCode}

// Set material wireframe property
material.wireframe = ${params.showWireframe};

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = ${params.rotationX};
plane.rotation.y = ${params.rotationY};
plane.rotation.z = ${params.rotationZ};
scene.add(plane);

// Animation loop
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  // Get delta time for frame-rate independent animation
  const delta = clock.getDelta();
  // Maximum delta to prevent huge jumps if the tab loses focus
  const maxDelta = 1/30;
  const cappedDelta = Math.min(delta, maxDelta);
  
  // Update time uniform using delta time for frame-rate independence
  uniforms.uTime.value += ${params.animationSpeed} * cappedDelta * 60.0;
  
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
   * @param hexColor - Hex color string
   * @returns RGB values as comma-separated string
   */
  private getRGBValues(hexColor: string): string {
    const color = new THREE.Color(hexColor);
    return `${color.r}, ${color.g}, ${color.b}`;
  }
}
