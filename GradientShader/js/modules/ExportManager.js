/**
 * ExportManager - Handles code export functionality
 */
export class ExportManager {
  /**
   * Create an ExportManager
   * @param {ShaderApp} app - Reference to main app
   */
  constructor(app) {
    this.app = app;
    this.modalElement = null;
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
   * Generate shader code
   * @returns {string} Shader code
   */
  async generateShaderCode() {
    // We'll need to fetch the shader files to include them in the export
    try {
      // Fetch shader files
      const perlinResponse = await fetch('js/shaders/perlinNoise.glsl');
      const vertexResponse = await fetch('js/shaders/vertexShader.glsl');
      const fragmentResponse = await fetch('js/shaders/fragmentShader.glsl');
      
      const perlinCode = await perlinResponse.text();
      const vertexCode = await vertexResponse.text();
      const fragmentCode = await fragmentResponse.text();
      
      // Insert Perlin noise code into shaders
      const processedVertexCode = vertexCode.replace(
        "// We'll include the Perlin noise code via JavaScript",
        perlinCode
      );
      
      const processedFragmentCode = fragmentCode.replace(
        "// We'll include the Perlin noise code via JavaScript",
        perlinCode
      );
      
      return `// Vertex Shader
const vertexShader = \`
${processedVertexCode}
\`;

// Fragment Shader
const fragmentShader = \`
${processedFragmentCode}
\`;

// Create material
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide
});`;
    } catch (error) {
      console.error("Error generating shader code:", error);
      return "// Error loading shader code";
    }
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
  
  /**
   * Create export modal
   */
  createExportModal() {
    // Remove existing modal if it exists
    if (this.modalElement) {
      document.body.removeChild(this.modalElement);
    }
    
    // Create modal container
    this.modalElement = document.createElement('div');
    this.modalElement.style.position = 'fixed';
    this.modalElement.style.top = '0';
    this.modalElement.style.left = '0';
    this.modalElement.style.width = '100%';
    this.modalElement.style.height = '100%';
    this.modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.modalElement.style.display = 'flex';
    this.modalElement.style.flexDirection = 'column';
    this.modalElement.style.alignItems = 'center';
    this.modalElement.style.justifyContent = 'center';
    this.modalElement.style.zIndex = '1000';
    this.modalElement.style.padding = '20px';
    this.modalElement.style.boxSizing = 'border-box';
    this.modalElement.style.overflow = 'auto';
    
    // Create modal content
    const contentElement = document.createElement('div');
    contentElement.style.backgroundColor = '#fff';
    contentElement.style.borderRadius = '5px';
    contentElement.style.width = '90%';
    contentElement.style.maxWidth = '1200px';
    contentElement.style.maxHeight = '90%';
    contentElement.style.overflow = 'auto';
    contentElement.style.padding = '20px';
    contentElement.style.boxSizing = 'border-box';
    contentElement.style.color = '#333';
    contentElement.style.fontFamily = 'Arial, sans-serif';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.style.padding = '8px 16px';
    closeButton.style.backgroundColor = '#f44336';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.onclick = () => {
      document.body.removeChild(this.modalElement);
      this.modalElement = null;
    };
    
    // Add close button to modal
    this.modalElement.appendChild(closeButton);
    
    // Add content to modal
    this.modalElement.appendChild(contentElement);
    
    // Add modal to body
    document.body.appendChild(this.modalElement);
    
    return contentElement;
  }
  
  /**
   * Create code section
   * @param {HTMLElement} container - Container element
   * @param {string} title - Section title
   * @param {string} code - Code content
   */
  createCodeSection(container, title, code) {
    // Create section container
    const sectionElement = document.createElement('div');
    sectionElement.style.marginBottom = '30px';
    
    // Create section title
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    titleElement.style.borderBottom = '1px solid #ddd';
    titleElement.style.paddingBottom = '10px';
    titleElement.style.marginBottom = '15px';
    titleElement.style.fontSize = '20px';
    
    // Create code container
    const codeContainer = document.createElement('div');
    codeContainer.style.position = 'relative';
    codeContainer.style.marginBottom = '10px';
    
    // Create code element
    const codeElement = document.createElement('pre');
    codeElement.style.backgroundColor = '#f5f5f5';
    codeElement.style.padding = '15px';
    codeElement.style.borderRadius = '4px';
    codeElement.style.overflow = 'auto';
    codeElement.style.fontSize = '14px';
    codeElement.style.fontFamily = 'Consolas, Monaco, "Andale Mono", monospace';
    codeElement.style.whiteSpace = 'pre-wrap';
    codeElement.style.maxHeight = '400px';
    codeElement.textContent = code;
    
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy';
    copyButton.style.position = 'absolute';
    copyButton.style.top = '10px';
    copyButton.style.right = '10px';
    copyButton.style.padding = '5px 10px';
    copyButton.style.backgroundColor = '#4CAF50';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    copyButton.onclick = () => {
      navigator.clipboard.writeText(code).then(() => {
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      });
    };
    
    // Add elements to container
    codeContainer.appendChild(codeElement);
    codeContainer.appendChild(copyButton);
    sectionElement.appendChild(titleElement);
    sectionElement.appendChild(codeContainer);
    container.appendChild(sectionElement);
  }
  
  /**
   * Show export modal with code
   */
  async showExportCode() {
    // Create modal
    const contentElement = this.createExportModal();
    
    // Add title
    const titleElement = document.createElement('h1');
    titleElement.textContent = 'Export Gradient Shader Code';
    titleElement.style.textAlign = 'center';
    titleElement.style.marginBottom = '20px';
    contentElement.appendChild(titleElement);
    
    // Add description
    const descriptionElement = document.createElement('p');
    descriptionElement.textContent = 'Copy and paste the following code to use your gradient shader in your own project.';
    descriptionElement.style.marginBottom = '30px';
    descriptionElement.style.textAlign = 'center';
    contentElement.appendChild(descriptionElement);
    
    // Generate code
    const htmlSetup = this.generateHTMLSetup();
    const sceneSetup = this.generateSceneSetup();
    const shaderCode = await this.generateShaderCode();
    const geometryAndAnimation = this.generateGeometryAndAnimation();
    
    // Combine all code for complete example
    const completeExample = `${htmlSetup.replace('// Your shader code will go here', `
${sceneSetup}

${shaderCode}

${geometryAndAnimation}
    `)}`;
    
    // Create code sections
    this.createCodeSection(contentElement, '1. HTML Setup', htmlSetup);
    this.createCodeSection(contentElement, '2. JavaScript Scene Setup', sceneSetup);
    this.createCodeSection(contentElement, '3. Shader Code', shaderCode);
    this.createCodeSection(contentElement, '4. Geometry and Animation', geometryAndAnimation);
    this.createCodeSection(contentElement, '5. Complete Example', completeExample);
  }
  
  /**
   * Export code
   */
  exportCode() {
    this.showExportCode();
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.modalElement && this.modalElement.parentElement) {
      this.modalElement.parentElement.removeChild(this.modalElement);
    }
    this.modalElement = null;
  }
} 