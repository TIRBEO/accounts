export function initA11yDevTools() {
  if (import.meta.env.DEV) {
    Promise.all([
      import('react'),
      import('react-dom'),
      import('@axe-core/react'),
    ]).then(([react, reactDom, axe]) => {
      axe.default(react.default, reactDom, 1000, {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: true },
          { id: 'aria-roles', enabled: true },
          { id: 'button-name', enabled: true },
          { id: 'link-name', enabled: true },
        ],
      });
    }).catch(() => {});
  }
}
