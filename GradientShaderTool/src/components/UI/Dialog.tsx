import type { FunctionComponent, ComponentChildren, VNode } from "preact";
import { createContext } from "preact";
import { useContext, useEffect } from "preact/hooks";
import styles from "./Dialog.module.css";

// Context to manage dialog state
type DialogContextType = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

// Root component
interface DialogProps {
  children: ComponentChildren;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Dialog: FunctionComponent<DialogProps> = ({
  children,
  isOpen,
  onOpenChange,
}) => {
  return (
    <DialogContext.Provider value={{ isOpen, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

// Trigger component
interface DialogTriggerProps {
  children: ComponentChildren;
  asChild?: boolean;
}

export const DialogTrigger: FunctionComponent<DialogTriggerProps> = ({
  children,
  asChild = false,
}) => {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("DialogTrigger must be used within a Dialog");
  }

  const { onOpenChange } = context;

  const handleClick = () => {
    onOpenChange(true);
  };

  if (asChild) {
    return <div onClick={handleClick}>{children}</div>;
  }

  return <button onClick={handleClick}>{children}</button>;
};

// Portal/Overlay component
interface DialogOverlayProps {
  children?: ComponentChildren;
}

export const DialogOverlay: FunctionComponent<DialogOverlayProps> = ({
  children,
}) => {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("DialogOverlay must be used within a Dialog");
  }

  const { isOpen, onOpenChange } = context;

  // Handle escape key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent scrolling on body when dialog is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onOpenChange]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => onOpenChange(false)}>
      {children}
    </div>
  );
};

// Content component
interface DialogContentProps {
  children: ComponentChildren;
}

export const DialogContent: FunctionComponent<DialogContentProps> = ({
  children,
}) => {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("DialogContent must be used within a Dialog");
  }

  return (
    <div className={styles.content} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
};

// Close button component
interface DialogCloseProps {
  children?: ComponentChildren;
}

export const DialogClose: FunctionComponent<DialogCloseProps> = ({
  children = "Close",
}) => {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("DialogClose must be used within a Dialog");
  }

  const { onOpenChange } = context;

  return (
    <button className={styles.closeButton} onClick={() => onOpenChange(false)}>
      {children}
    </button>
  );
};

// Title component
interface DialogTitleProps {
  children: ComponentChildren;
}

export const DialogTitle: FunctionComponent<DialogTitleProps> = ({
  children,
}) => {
  return <h2 className={styles.title}>{children}</h2>;
};

// Description component
interface DialogDescriptionProps {
  children: ComponentChildren;
}

export const DialogDescription: FunctionComponent<DialogDescriptionProps> = ({
  children,
}) => {
  return <p className={styles.description}>{children}</p>;
};
