// Opens a modal <dialog> and moves focus to its [data-autofocus] element
// (usually the safe choice, like Cancel).
//
// React's autoFocus isn't enough: it only focuses on mount and writes the
// `autofocus` attribute in server HTML, never in the browser — so a dialog drawn
// after data loads fell back to its first button (often the risky one).
// The focus waits a frame so content React swaps in on the same click is there.
export function showDialog(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() =>
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus(),
  );
}
