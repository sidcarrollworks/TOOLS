/**
 * ShaderLoader - Module for loading and processing shader files
 */
export class ShaderLoader {
  constructor() {
    // No initialization needed
  }
  
  /**
   * Load shader files
   * @param {Object} shaders - Object to store loaded shader content
   */
  async loadShaders(shaders) {
    try {
      // Add random query parameter to force reload
      const timestamp = Date.now();
      
      // Add special cache prevention parameter
      const cacheParams = `?v=${timestamp}`;
      
      // Load Perlin noise code
      const perlinResponse = await fetch(`js/shaders/perlinNoise.glsl${cacheParams}`);
      shaders.perlinNoise = await perlinResponse.text();
      
      // Load vertex shader
      const vertexResponse = await fetch(`js/shaders/vertexShader.glsl${cacheParams}`);
      shaders.vertex = await vertexResponse.text();
      
      // Load fragment shader
      const fragmentResponse = await fetch(`js/shaders/fragmentShader.glsl${cacheParams}`);
      shaders.fragment = await fragmentResponse.text();
      
      // Insert Perlin noise code into both vertex and fragment shaders
      shaders.vertex = shaders.vertex.replace(
        "// We'll include the Perlin noise code via JavaScript",
        shaders.perlinNoise
      );
      
      shaders.fragment = shaders.fragment.replace(
        "// We'll include the Perlin noise code via JavaScript",
        shaders.perlinNoise
      );
      
      console.log("All shader files loaded successfully");
    } catch (error) {
      console.error("Error loading shader files:", error);
    }
  }
} 