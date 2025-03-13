/**
 * ShaderExporter - Handles shader code export functionality
 */
import { ShaderApp } from "../../ShaderApp";

export class ShaderExporter {
  private app: ShaderApp;

  /**
   * Create a ShaderExporter
   * @param app - Reference to main app
   */
  constructor(app: ShaderApp) {
    this.app = app;
  }

  /**
   * Generate shader code
   * @returns Shader code as a string
   */
  async generateShaderCode(): Promise<string> {
    try {
      // Use the shader code already loaded in the app
      const perlinCode = this.app.shaders.perlinNoise;
      const vertexCode =
        this.app.params.geometryType === "sphere"
          ? this.app.shaders.sphereVertex
          : this.app.shaders.vertex;
      const fragmentCode = this.app.shaders.fragment;

      // Insert Perlin noise code into shaders if needed
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
  side: THREE.DoubleSide,
  wireframe: ${this.app.params.showWireframe}
});`;
    } catch (error) {
      console.error("Error generating shader code:", error);
      return "// Error loading shader code";
    }
  }
}
