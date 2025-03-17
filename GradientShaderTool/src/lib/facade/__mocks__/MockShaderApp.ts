/**
 * Mock implementation of ShaderApp for testing purposes
 */
export class MockShaderApp {
  // Mock properties
  params: Record<string, any> = {
    // Default parameter values
    color1: "#000000",
    color2: "#ffffff",
    color3: "#ff0000",
    color4: "#00ff00",
    noiseScale: 1.0,
    gradientShiftX: 0,
    gradientShiftY: 0,
    gradientShiftSpeed: 0,
    // Add other default parameters as needed
  };

  // Constructor
  constructor(container: HTMLElement) {
    // Mock initialization
    console.log("MockShaderApp initialized with container:", container.id);
  }

  // Mock methods
  initialize(): Promise<void> {
    return Promise.resolve();
  }

  render(): void {
    // Mock render
    console.log("MockShaderApp.render() called");
  }

  updateParams(resetCamera: boolean = false): void {
    // Mock update params
    console.log(`MockShaderApp.updateParams(${resetCamera}) called`);
  }

  resetCamera(): void {
    // Mock reset camera
    console.log("MockShaderApp.resetCamera() called");
  }

  saveAsImage(options?: any): Promise<string> {
    // Mock save as image
    console.log("MockShaderApp.saveAsImage() called");
    return Promise.resolve("data:image/png;base64,mockImageData");
  }

  exportCode(options?: any): Promise<string> {
    // Mock export code
    console.log("MockShaderApp.exportCode() called");
    return Promise.resolve("// Mock shader code");
  }

  dispose(): void {
    // Mock cleanup
    console.log("MockShaderApp.dispose() called");
  }

  // Mock additional methods as needed
  setGeometryType(type: string): void {
    console.log(`MockShaderApp.setGeometryType(${type}) called`);
  }

  startAnimation(): void {
    console.log("MockShaderApp.startAnimation() called");
  }

  stopAnimation(): void {
    console.log("MockShaderApp.stopAnimation() called");
  }

  setCameraPosition(position: { x: number; y: number; z: number }): void {
    console.log(
      `MockShaderApp.setCameraPosition(${JSON.stringify(position)}) called`
    );
  }

  getCameraPosition(): { x: number; y: number; z: number } {
    return { x: 0, y: 0, z: 5 };
  }
}
