import type { FunctionComponent, JSX } from "preact";
import { useState, useEffect } from "preact/hooks";
import type { ShaderApp } from "../../lib/ShaderApp";
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
import { X, JS, HTML } from "../Icons";
interface ExportPanelProps {
  app: ShaderApp;
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
  app,
  isOpen,
  onOpenChange,
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
      name: "JavaScript",
      description: "Use in existing Three.js projects.",
      icon: <JS height={16} width={16} />,
    },
    {
      id: "html",
      name: "HTML Page",
      description: "HTML page with the scene",
      icon: <HTML height={16} width={16} />,
    },
    {
      id: "shader",
      name: "Shaders",
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
        setCodeSections([{ title: "", code: jsCode }]);
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

        setCodeSections([{ title: "", code: completeExample }]);
      } else if (methodId === "shader") {
        setCodeTitle("Shaders only");
        setCodeDescription(
          "Copy just the shader code for use in your own Three.js setup."
        );

        const shaderCode =
          await app.exportManager.shaderExporter.generateShaderCode();
        setCodeSections([{ title: "", code: shaderCode }]);
      }
    } catch (error) {
      console.error("Error loading code:", error);
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

          <div style={{ display: "flex", height: "100%" }}>
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
                  <Code key={index} title={section.title} code={section.code} />
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
};
