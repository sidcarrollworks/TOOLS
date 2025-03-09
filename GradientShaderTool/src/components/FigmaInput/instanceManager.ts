// Simple manager for tracking the active FigmaInput instance
// This prevents direct mutation of imported variables

let activeInstance: symbol | null = null;

export const setActiveInstance = (instance: symbol | null) => {
  activeInstance = instance;
};

export const getActiveInstance = (): symbol | null => {
  return activeInstance;
}; 