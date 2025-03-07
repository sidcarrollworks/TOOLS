/**
 * UI - Handles export modal UI
 */
export class UI {
  /**
   * Create a UI manager for exports
   * @param {Object} app - Reference to main app
   */
  constructor(app) {
    this.app = app;
    this.modalElement = null;
  }
  
  /**
   * Create export modal
   * @returns {HTMLElement} Modal content element
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
    const htmlExporter = this.app.exportManager.htmlExporter;
    const shaderExporter = this.app.exportManager.shaderExporter;
    const jsExporter = this.app.exportManager.jsExporter;
    
    const htmlSetup = htmlExporter.generateHTMLSetup();
    const sceneSetup = htmlExporter.generateSceneSetup();
    const shaderCode = await shaderExporter.generateShaderCode();
    const geometryAndAnimation = htmlExporter.generateGeometryAndAnimation();
    const jsOnly = await jsExporter.generateJavaScriptOnly();
    
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
    this.createCodeSection(contentElement, '6. JavaScript Only (for existing projects)', jsOnly);
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