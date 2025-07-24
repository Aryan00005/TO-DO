import { useEffect } from 'react';

interface KeyboardShortcuts {
  [key: string]: () => void;
}

export const useKeyboard = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = `${event.ctrlKey ? 'ctrl+' : ''}${event.key.toLowerCase()}`;
      
      if (shortcuts[key]) {
        event.preventDefault();
        shortcuts[key]();
      }
      
      if (event.key === 'Escape' && shortcuts['escape']) {
        shortcuts['escape']();
      }
      
      if (event.key === 'Delete' && shortcuts['delete']) {
        shortcuts['delete']();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};