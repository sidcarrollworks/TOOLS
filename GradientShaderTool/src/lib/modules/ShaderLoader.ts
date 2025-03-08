/**
 * ShaderLoader - Loads GLSL shader files from the server
 */
// Import shader files directly
import perlinNoiseShader from '../shaders/perlinNoise.glsl';
import vertexShader from '../shaders/vertexShader.glsl';
import fragmentShader from '../shaders/fragmentShader.glsl';

export class ShaderLoader {
  /**
   * Load shader files
   * @param {Object} shaders - Object to store shader content
   */
  async loadShaders(shaders: {
    perlinNoise: string;
    vertex: string;
    fragment: string;
  }): Promise<void> {
    try {
      // Store the raw shader content directly from imports
      shaders.perlinNoise = perlinNoiseShader;

      // Combine perlinNoise with vertex and fragment shaders
      // Look for the comment "// We'll include the Perlin noise code via JavaScript"
      // and replace it with the perlinNoise content
      shaders.vertex = vertexShader.replace(
        "// We'll include the Perlin noise code via JavaScript",
        perlinNoiseShader
      );

      shaders.fragment = fragmentShader.replace(
        "// We'll include the Perlin noise code via JavaScript",
        perlinNoiseShader
      );

      console.log("All shader files loaded and combined successfully");
    } catch (error) {
      console.error("Error loading shader files:", error);
      throw error; // Re-throw to allow caller to handle
    }
  }
}
