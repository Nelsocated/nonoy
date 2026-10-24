import { afterEach, describe, expect, it, vi } from "vitest";
import { showDialog } from "./dialog";

const fakeDialog = (open = false) => {
  const target = { focus: vi.fn() };
  return {
    target,
    dialog: {
      open,
      showModal: vi.fn(),
      querySelector: vi.fn(() => target),
    } as unknown as HTMLDialogElement,
  };
};

describe("showDialog", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens the dialog, then focuses its [data-autofocus] element", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) =>
      frames.push(f),
    );
    const { dialog, target } = fakeDialog();
    showDialog(dialog);
    expect(dialog.showModal).toHaveBeenCalled();
    expect(target.focus).not.toHaveBeenCalled(); // waits for React's render
    frames.forEach((f) => f(0));
    expect(dialog.querySelector).toHaveBeenCalledWith("[data-autofocus]");
    expect(target.focus).toHaveBeenCalled();
  });

  it("doesn't reopen an open dialog (that would throw)", () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    const { dialog } = fakeDialog(true);
    showDialog(dialog);
    expect(dialog.showModal).not.toHaveBeenCalled();
  });
});
