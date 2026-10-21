// 共通の小さな道具
 
// HTMLエスケープ（店が入力した文字は必ずこれを通して表示する）
export function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
 
// 現在の ?demo / ?shop を引き継いだリンクを作る
export function link(path, extra = {}) {
  const cur = new URLSearchParams(location.search);
  const p = new URLSearchParams();
  if (cur.has("demo")) p.set("demo", "");
  if (cur.has("live")) p.set("live", "");
  if (cur.get("shop")) p.set("shop", cur.get("shop"));
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  const s = p.toString().replace(/(demo|live)=(&|$)/g, "$1$2");
  return s ? `${path}?${s}` : path;
}
 
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
 
export function param(name) {
  return new URLSearchParams(location.search).get(name);
}
 
// 表示用フォーマット
export function fmtMan(n) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toFixed(1);
}
export function fmtKm(km) {
  const v = Number(km);
  if (!isFinite(v) || v <= 0) return "—";
  if (v < 10000) return `${v.toLocaleString("ja-JP")}km`;
  return `${(v / 10000).toFixed(1)}万km`;
}
export function fmtShaken(s) {
  if (!s) return "—";
  const m = String(s).match(/^(\d{4})-(\d{2})$/);
  return m ? `${m[1]}/${m[2]}` : String(s);
}
export function fmtYear(y) {
  return y ? `${y}年` : "—";
}
export function fees(car) {
  const t = Number(car.totalPrice), b = Number(car.basePrice);
  if (!isFinite(t) || !isFinite(b)) return null;
  return Math.round((t - b) * 10) / 10;
}
 
export const STATUSES = [
  { id: "draft", label: "下書き" },
  { id: "onsale", label: "掲載中" },
  { id: "negotiating", label: "商談中" },
  { id: "sold", label: "売約済" }
];
export const statusLabel = (id) => (STATUSES.find((s) => s.id === id) || {}).label || id;
 
// 公開サイトに出すのは下書き以外
export const isPublic = (car) => car.status && car.status !== "draft";
 
// 新着判定（登録から14日以内）
export function isNew(car) {
  if (!car.createdAt) return false;
  return Date.now() - Number(car.createdAt) < 14 * 24 * 60 * 60 * 1000;
}
 
export function newId() {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return "c" + [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
 
// 写真を縮小して JPEG Blob にする（長辺 max px）
export async function resizeImage(file, max, quality = 0.82) {
  const bmp = await loadBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  return await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("画像の変換に失敗しました"))), "image/jpeg", quality)
  );
}
 
async function loadBitmap(file) {
  if ("createImageBitmap" in window) {
    try {
      // スマホ写真の向き（EXIF）を反映
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (_) { /* 下のフォールバックへ */ }
  }
  return await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(
      /\.(heic|heif)$/i.test(file.name || "")
        ? "この写真形式（HEIC）はこの端末では読み込めません。スマホから直接選ぶか、JPEGに変換してから選んでください"
        : "画像を読み込めませんでした。別の写真でお試しください"
    ));
    img.src = URL.createObjectURL(file);
  });
}
 
export function blobToDataURL(blob) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}
 
// 画面下に短いメッセージを出す
export function toast(msg, kind = "ok") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.dataset.kind = kind;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}
 
// 車のアイコン（写真がないときの代わり）
export const CAR_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/><path d="M4 12h16"/></svg>`;
 
