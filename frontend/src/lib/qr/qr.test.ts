import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { qrSvgPath, readQr, showQrState } from "./qr";

// draw a QR as RGBA pixels (4 px per module, 4-module white margin)
function pixels(text: string, { invert = false } = {}) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const scale = 4;
  const size = (modules.size + 8) * scale;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - 4;
      const my = Math.floor(y / scale) - 4;
      const inside =
        mx >= 0 && my >= 0 && mx < modules.size && my < modules.size;
      const dark = inside && modules.data[my * modules.size + mx] === 1;
      const v = dark !== invert ? 0 : 255;
      data.set([v, v, v, 255], (y * size + x) * 4);
    }
  return { data, size };
}

const GCASH =
  "00020101021127830012com.p2pqrpay0111GXCHPHM2XXX02089996440303152170200000006560417DWQM4TK3JDO83CHRH5204601653036085802PH5913MANG FRITO6011Quezon City6304ABCD";

describe("readQr", () => {
  it("reads the text inside a QR image", () => {
    const { data, size } = pixels(GCASH);
    expect(readQr(data, size, size)).toBe(GCASH);
  });

  it("reads a dark-mode (inverted) QR too", () => {
    const { data, size } = pixels("https://example.com/pay", { invert: true });
    expect(readQr(data, size, size)).toBe("https://example.com/pay");
  });

  it("returns null when there's no QR", () => {
    const size = 64;
    const blank = new Uint8ClampedArray(size * size * 4).fill(255);
    expect(readQr(blank, size, size)).toBeNull();
  });
});

describe("qrSvgPath", () => {
  it("draws one square per dark module inside a 4-module margin", () => {
    const { modules } = QRCode.create(GCASH, { errorCorrectionLevel: "M" });
    const { size, d } = qrSvgPath(GCASH);
    expect(size).toBe(modules.size + 8);
    const dark = Array.from(modules.data).filter((v) => v === 1).length;
    expect(d.match(/M/g)).toHaveLength(dark);
    expect(d.startsWith("M")).toBe(true);
  });
});

describe("showQrState", () => {
  it("ready with a total and at least one code", () => {
    expect(showQrState("1890.00", false, 1)).toEqual({
      ready: true,
      hint: null,
    });
  });
  it("no codes on the phone → ask the owner", () => {
    expect(showQrState("1890.00", false, 0)).toEqual({
      ready: false,
      hint: "No QR codes yet — ask the owner.",
    });
  });
  it("no valid total yet (or too large) → enter kilos and price first", () => {
    const hint = "Enter the kilos and price first.";
    expect(showQrState(null, false, 2)).toEqual({ ready: false, hint });
    expect(showQrState("123456789012.00", true, 2)).toEqual({
      ready: false,
      hint,
    });
  });
});
