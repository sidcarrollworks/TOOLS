/**
 * ShaderLoader - Loads GLSL shader files from the server
 */
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
      // Load shader files
      const [perlinNoiseResponse, vertexResponse, fragmentResponse] =
        await Promise.all([
          fetch("/src/lib/shaders/perlinNoise.glsl"),
          fetch("/src/lib/shaders/vertexShader.glsl"),
          fetch("/src/lib/shaders/fragmentShader.glsl"),
        ]);

      // Check responses
      if (
        !perlinNoiseResponse.ok ||
        !vertexResponse.ok ||
        !fragmentResponse.ok
      ) {
        throw new Error("Failed to load one or more shader files");
      }

      // Get shader text content
      const [perlinNoiseText, vertexText, fragmentText] = await Promise.all([
        perlinNoiseResponse.text(),
        vertexResponse.text(),
        fragmentResponse.text(),
      ]);

      // Store the raw shader content
      shaders.perlinNoise = perlinNoiseText;

      // Combine perlinNoise with vertex and fragment shaders
      // Look for the comment "// We'll include the Perlin noise code via JavaScript"
      // and replace it with the perlinNoise content
      shaders.vertex = vertexText.replace(
        "// We'll include the Perlin noise code via JavaScript",
        perlinNoiseText
      );

      shaders.fragment = fragmentText.replace(
        "// We'll include the Perlin noise code via JavaScript",
        perlinNoiseText
      );

      console.log("All shader files loaded and combined successfully");
    } catch (error) {
      console.error("Error loading shader files:", error);
      throw error; // Re-throw to allow caller to handle
    }
  }
}
