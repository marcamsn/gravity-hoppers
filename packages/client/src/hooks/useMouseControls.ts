import { useState, useEffect } from 'react';

export const useMouseControls = () => {
  const [mouseButtons, setMouseButtons] = useState({
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        setMouseButtons((m) => ({ ...m, left: true }));
      } else if (e.button === 2) { // Right click
        setMouseButtons((m) => ({ ...m, right: true }));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        setMouseButtons((m) => ({ ...m, left: false }));
      } else if (e.button === 2) {
        setMouseButtons((m) => ({ ...m, right: false }));
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent right-click menu
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return mouseButtons;
};
