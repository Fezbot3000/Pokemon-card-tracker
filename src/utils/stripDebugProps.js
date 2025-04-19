// Utility to strip all data-component-* props from a props object
export function stripDebugProps(props) {
  const cleaned = { ...props };
  Object.keys(cleaned).forEach(key => {
    if (key.startsWith('data-component-')) {
      delete cleaned[key];
    }
  });
  return cleaned;
}
