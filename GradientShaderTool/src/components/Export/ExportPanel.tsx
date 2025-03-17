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
import { X, JS, HTML, OpenGL } from "../Icons";
import { useFacade } from "../../lib/facade/FacadeContext";

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
  const facade = useFacade();
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
      id: "html",
      name: "HTML Page",
      description: "HTML page with the scene",
      icon: <HTML height={16} width={16} />,
    },
    {
      id: "shader",
      name: "Shaders",
      description: "Export just the shader code",
      icon: <OpenGL height={16} width={16} />,
    },
  ];

  useEffect(() => {
    if (isOpen && facade && facade.isInitialized()) {
      loadCode(activeMethod);
    }
  }, [isOpen, activeMethod, facade]);

  const loadCode = async (methodId: string) => {
    if (!facade || !facade.isInitialized()) return;

    setIsLoading(true);
    setCodeSections([]);

    try {
      if (methodId === "js") {
        setCodeTitle("JavaScript Export");
        setCodeDescription(
          "Copy this code to use your gradient shader in an existing Three.js project."
        );

        const jsCode = await facade.exportAsCode({ format: "js" });
        setCodeSections([{ title: "", code: jsCode, language: "javascript" }]);
      } else if (methodId === "html") {
        setCodeTitle("HTML Page Export");
        setCodeDescription(
          "Copy this code to create a standalone HTML page with your gradient shader."
        );

        const htmlCode = await facade.exportAsCode({
          format: "js",
          includeLib: true,
        });
        setCodeSections([{ title: "", code: htmlCode, language: "html" }]);
      } else if (methodId === "shader") {
        setCodeTitle("Shaders only");
        setCodeDescription(
          "Copy just the shader code for use in your own Three.js setup."
        );

        const shaderCode = await facade.exportAsCode({ format: "glsl" });
        setCodeSections([{ title: "", code: shaderCode, language: "glsl" }]);
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

          {/* <div style={{ display: "flex", height: "100%", width: "100%" }}> */}
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
          {/* </div> */}
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
};
