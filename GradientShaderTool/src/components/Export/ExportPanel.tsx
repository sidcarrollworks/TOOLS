import type { FunctionComponent, JSX } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
  Code,
} from "../UI";
import styles from "./Export.module.css";
import { X, JS, OpenGL } from "../Icons";
import { getExportInitializer } from "../../lib/stores/ExportInitializer";
import { getUIStore } from "../../lib/stores/UIStore";
import { facadeSignal } from "../../app";

interface ExportPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportMethod {
  id: string;
  name: string;
  description: string;
  icon?: JSX.Element;
}

export const ExportPanel: FunctionComponent<ExportPanelProps> = ({
  isOpen,
  onOpenChange,
}) => {
  // Get the stores
  const initializer = getExportInitializer();
  const uiStore = getUIStore();

  const [activeMethod, setActiveMethod] = useState<string>("js");
  const [codeTitle, setCodeTitle] = useState<string>("");
  const [codeDescription, setCodeDescription] = useState<string>("");
  const [codeSections, setCodeSections] = useState<
    { title: string; code: string; language?: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const exportMethods: ExportMethod[] = [
    {
      id: "js",
      name: "JavaScript",
      description: "Use in existing Three.js projects.",
      icon: <JS height={16} width={16} />,
    },
    {
      id: "shader",
      name: "Shaders",
      description: "Export just the shader code",
      icon: <OpenGL height={16} width={16} />,
    },
  ];

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        loadCode(activeMethod);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isOpen, activeMethod]);

  const loadCode = async (methodId: string) => {
    setIsLoading(true);
    setCodeSections([]);

    try {
      const facade = facadeSignal.value;
      if (!facade) {
        throw new Error("Shader application not initialized");
      }

      if (methodId === "js") {
        setCodeTitle("JavaScript Export");
        setCodeDescription(
          "Complete Three.js implementation including scene, material, and camera setup. Add this to your project to recreate the gradient shader effect."
        );

        // Call the facade directly to export code
        const jsCode = await facade.exportAsCode({
          format: "js",
          includeLib: true,
        });

        // Add camera implementation to the code
        const cameraHelpers = `
// Camera helper functions
function setupCamera(container) {
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  return camera;
}

// Get the camera instance
GradientShader.getCamera = function() {
  return camera;
};

// Set camera field of view
GradientShader.setFOV = function(fov) {
  camera.fov = fov;
  camera.updateProjectionMatrix();
};

// Set camera position
GradientShader.setCameraPosition = function(x, y, z) {
  camera.position.set(x, y, z);
};

// Set camera target (lookAt point)
GradientShader.setCameraTarget = function(x, y, z) {
  camera.lookAt(x, y, z);
};`;

        // Create a complete code example with comments on usage
        const codeWithUsageInstructions = `// ===== GRADIENT SHADER THREE.JS IMPLEMENTATION =====
// To use this code:
// 1. Include Three.js in your project: <script src="https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js"></script>
// 2. Create a container element: <div id="gradient-container"></div>
// 3. Add this script to your page
// 4. The shader will automatically attach to the element with id="gradient-container"
//    or you can pass a different element selector to the init function

// ----- FULL IMPLEMENTATION WITH CAMERA SETUP -----
${jsCode}

${cameraHelpers}

// ----- USAGE EXAMPLES -----
// Initialize the shader in a specific container:
// GradientShader.init('#your-custom-container');
//
// Access the camera directly (if you need to customize it):
// const camera = GradientShader.getCamera();
// camera.position.set(x, y, z); // Set custom camera position
// 
// Adjust camera settings:
// GradientShader.setFOV(75); // Set field of view
// GradientShader.setCameraPosition(0, 0, 5); // Set position
// GradientShader.setCameraTarget(0, 0, 0); // Set look-at point`;

        setCodeSections([
          {
            title: "",
            code: codeWithUsageInstructions,
            language: "javascript",
          },
        ]);
      } else if (methodId === "shader") {
        setCodeTitle("Shaders only");
        setCodeDescription(
          "Copy just the shader code for use in your own Three.js setup."
        );

        // Call the facade directly to export code
        const shaderCode = await facade.exportAsCode({ format: "glsl" });
        setCodeSections([{ title: "", code: shaderCode, language: "glsl" }]);
      }
    } catch (error) {
      console.error("Error loading code:", error);
      uiStore.showToast("Failed to generate code.", "error");
      setCodeSections([
        { title: "Error", code: "Failed to generate code.", language: "text" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogOverlay>
        <DialogContent>
          <DialogClose>
            <X />
          </DialogClose>

          <div className={styles.leftColumn}>
            <DialogTitle>Export Options</DialogTitle>

            {exportMethods.map((method) => (
              <div
                key={method.id}
                className={`${styles.tab} ${
                  activeMethod === method.id ? styles.active : ""
                }`}
                onClick={() => setActiveMethod(method.id)}
              >
                {method.icon ? method.icon : ""}
                {method.name}
              </div>
            ))}
          </div>

          <div className={styles.rightColumn}>
            <DialogTitle>{codeTitle}</DialogTitle>
            <DialogDescription>{codeDescription}</DialogDescription>

            {isLoading ? (
              <div>Loading code...</div>
            ) : (
              codeSections.map((section, index) => (
                <Code
                  key={index}
                  code={section.code}
                  language={section.language}
                />
              ))
            )}
          </div>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
};
