/**
 * ShaderExporter - Handles shader code export functionality
 */
export class ShaderExporter {
  /**
   * Create a ShaderExporter
   * @param {Object} app - Reference to main app
   */
  constructor(app) {
    this.app = app;
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
} 