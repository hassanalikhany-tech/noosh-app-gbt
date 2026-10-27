import { useEffect, useRef } from 'react';
const dialogStack: HTMLElement[] = [];
export const useDialogFocus = (onClose: () => void) => {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog: HTMLElement | null = ref.current;
    if (!dialog) return;
    dialogStack.push(dialog);
    dialog.focus();
    const handler = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])')).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]'));
      const first = elements[0], last = elements[elements.length-1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => { document.removeEventListener('keydown', handler, true); const index = dialogStack.indexOf(dialog); if (index >= 0) dialogStack.splice(index, 1); if (previous?.isConnected) previous.focus(); };
  }, []);
  return ref;
};
