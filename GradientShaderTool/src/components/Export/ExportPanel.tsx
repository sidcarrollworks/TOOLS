import type { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import type { ShaderApp } from "../../lib/ShaderApp";
import { Modal } from "./Modal";
import { CodeSection } from "./CodeSection";
import styles from "./Export.module.css";

interface ExportPanelProps {
  app: ShaderApp;
  isOpen: boolean;
  onClose: () => void;
}

interface ExportMethod {
  id: string;
  name: string;
  description: string;
}

export const ExportPanel: FunctionComponent<ExportPanelProps> = ({
  app,
  isOpen,
  onClose,
}) => {
  const [activeMethod, setActiveMethod] = useState<string>("js");
  const [codeTitle, setCodeTitle] = useState<string>("");
  const [codeDescription, setCodeDescription] = useState<string>("");
  const [codeSections, setCodeSections] = useState<
    { title: string; code: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const exportMethods: ExportMethod[] = [
    {
      id: "js",
      name: "JavaScript Only",
      description:
        "Export the Three.js scene and shaders for use in existing projects",
    },
    {
      id: "html",
      name: "HTML Page",
      description: "Export a complete HTML page with the scene",
    },
    {
      id: "shader",
      name: "Shader Code Only",
      description: "Export just the shader code",
    },
  ];

  useEffect(() => {
    if (isOpen && app) {
      loadCode(activeMethod);
    }
  }, [isOpen, activeMethod, app]);

  const loadCode = async (methodId: string) => {
    if (!app) return;

    setIsLoading(true);
    setCodeSections([]);

    try {
      if (methodId === "js") {
        setCodeTitle("JavaScript Export");
        setCodeDescription(
          "Copy this code to use your gradient shader in an existing Three.js project. The code creates a function that sets up the scene and returns a dispose method."
        );

        const jsCode =
          await app.exportManager.jsExporter.generateJavaScriptOnly();
        setCodeSections([{ title: "JavaScript Code", code: jsCode }]);
      } else if (methodId === "html") {
        setCodeTitle("HTML Page Export");
        setCodeDescription(
          "Copy this code to create a standalone HTML page with your gradient shader."
        );

        const htmlSetup = app.exportManager.htmlExporter.generateHTMLSetup();
        const sceneSetup = app.exportManager.htmlExporter.generateSceneSetup();
        const shaderCode =
          await app.exportManager.shaderExporter.generateShaderCode();
        const geometryAndAnimation =
          app.exportManager.htmlExporter.generateGeometryAndAnimation();

        // Combine all code for complete example
        const completeExample = `${htmlSetup.replace(
          "// Your shader code will go here",
          `
${sceneSetup}

${shaderCode}

${geometryAndAnimation}
        `
        )}`;

        setCodeSections([
          { title: "Complete HTML Page", code: completeExample },
        ]);
      } else if (methodId === "shader") {
        setCodeTitle("Shader Code Export");
        setCodeDescription(
          "Copy just the shader code for use in your own Three.js setup."
        );

        const shaderCode =
          await app.exportManager.shaderExporter.generateShaderCode();
        setCodeSections([{ title: "Shader Code", code: shaderCode }]);
      }
    } catch (error) {
      console.error("Error loading code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.leftColumn}>
        <h1 className={styles.title}>Export Options</h1>

        {exportMethods.map((method) => (
          <div
            key={method.id}
            className={`${styles.exportButton} ${
              activeMethod === method.id ? styles.active : ""
            }`}
            onClick={() => setActiveMethod(method.id)}
          >
            <div className={styles.exportButtonTitle}>{method.name}</div>
            <div className={styles.exportButtonDescription}>
              {method.description}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.rightColumn}>
        <h1 className={styles.title}>{codeTitle}</h1>
        <p className={styles.description}>{codeDescription}</p>

        {isLoading ? (
          <div>Loading code...</div>
        ) : (
          codeSections.map((section, index) => (
            <CodeSection
              key={index}
              title={section.title}
              code={section.code}
            />
          ))
        )}
      </div>
    </Modal>
  );
};
