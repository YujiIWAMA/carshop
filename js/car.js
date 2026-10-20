// 車両詳細ページ（在庫データから自動生成）
import { resolveShopId } from "./config.js";
import { getShop, getCars } from "./store.js";
import { esc, $, $$, link, param, isPublic, fmtMan, fmtKm, fmtYear, fmtShaken, fees, CAR_SVG } from "./util.js";
import { mountChrome, telHref, showFatal } from "./site-common.js";

const shopId = resolveShopId();

async function main() {
  let shop, cars;
  try {
    [shop, cars] = await Promise.all([getShop(shopId), getCars(shopId)]);
  } catch (e) {
    console.error(e);
    showFatal("読み込みに失敗しました。時間をおいて再度お試しください。");
    return;
  }
  if (!shop) return showFatal("このサイトは準備中です。");
  mountChrome(shop);

  const car = cars.find((c) => c.id === param("id"));
  if (!car || !isPublic(car)) {
    document.title = `${shop.name}｜車両が見つかりません`;
    $("main").innerHTML = `<div class="wrap"><div class="doc"><h1>この車両は掲載を終了しました</h1><p><a href="${link("index.html")}#stock">在庫一覧に戻る</a></p></div></div>`;
    return;
  }
  document.title = `${car.maker} ${car.name} ${car.grade || ""}｜${shop.name}`;
  render(shop, car);
}

function render(shop, car) {
  const photos = car.photos || [];
  const f = fees(car);
  const specs = [
    ["年式", fmtYear(car.year)],
    ["走行距離", fmtKm(car.mileage)],
    ["車検", fmtShaken(car.shaken)],
    ["修復歴", car.repair],
    ["ボディタイプ", car.bodyType],
    ["排気量", car.displacement],
    ["ミッション", car.transmission],
    ["燃料", car.fuel],
    ["ボディ色", car.color],
    ["保証", car.warranty],
    ["管理番号", car.stockNo]
  ].filter(([, v]) => v && v !== "—");

  const flag = car.status === "sold"
    ? `<span class="status-flag sold">この車両は売約済です</span>`
    : car.status === "negotiating" ? `<span class="status-flag nego">商談中</span>` : "";

  const acts = [];
  if (car.status !== "sold") {
    if (shop.tel) acts.push(`<a class="btn btn-accent btn-block" href="${telHref(shop.tel)}">電話で問い合わせる</a>`);
    if (shop.lineUrl) acts.push(`<a class="btn btn-line btn-block" href="${esc(shop.lineUrl)}" target="_blank" rel="noopener">LINEで在庫確認</a>`);
  } else {
    acts.push(`<a class="btn btn-navy btn-block" href="${link("index.html")}#stock">ほかの在庫を見る</a>`);
  }

  $("main").innerHTML = `
  <div class="wrap">
    <nav class="crumbs" aria-label="パンくずリスト">
      <a href="${link("index.html")}">トップ</a><span aria-hidden="true">›</span>
      <a href="${link("index.html")}#stock">在庫一覧</a><span aria-hidden="true">›</span>
      <span>${esc(car.maker)} ${esc(car.name)}</span>
    </nav>
    <div class="detail">
      <div class="detail-main">
        <div class="panel gallery-panel" style="padding:16px">
          <div class="gallery-main" id="gallery-main"></div>
          ${photos.length > 1 ? `<div class="thumbs">${photos.map((p, i) =>
            `<button type="button" data-i="${i}" aria-label="写真 ${i + 1}"><img src="${esc(p.thumb || p.full)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
        </div>

        <div class="panel">
          <h2>車両情報</h2>
          <dl class="spec-table">${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        </div>

        ${(car.equipment || []).length ? `
        <div class="panel">
          <h2>主な装備</h2>
          <div class="chips">${car.equipment.map((e) => `<span class="chip">✓ ${esc(e)}</span>`).join("")}</div>
        </div>` : ""}

        ${car.comment ? `
        <div class="panel">
          <h2>スタッフコメント</h2>
          <p class="comment">${esc(car.comment)}</p>
        </div>` : ""}
      </div>

      <aside class="detail-side">
        <div class="panel">
          ${flag}
          <div class="side-name">
            <small>${esc(car.maker)}</small>
            <h1>${esc(car.name)}</h1>
            <small>${esc(car.grade)}</small>
          </div>
          <div class="price-box">
            <span class="price-label">支払総額（税込）</span>
            <span class="price"><span class="num">${esc(fmtMan(car.totalPrice))}</span><span class="unit">万円</span></span>
            <div class="price-line first"><span>車両本体価格</span><span>${esc(fmtMan(car.basePrice))}万円</span></div>
            ${f !== null ? `<div class="price-line"><span>諸費用</span><span>${esc(fmtMan(f))}万円</span></div>` : ""}
          </div>
          <div class="side-actions">${acts.join("")}</div>
          ${car.stockNo && car.status !== "sold" ? `<p class="side-note">お問い合わせ時は「管理番号 ${esc(car.stockNo)}」とお伝えください</p>` : ""}
        </div>
        <a href="${link("index.html")}#stock" style="font-weight:700;font-size:14px;padding:8px 0">← 在庫一覧に戻る</a>
      </aside>
    </div>
  </div>`;

  setupGallery(car);
}

function setupGallery(car) {
  const photos = car.photos || [];
  const main = $("#gallery-main");
  let idx = 0;
  const show = (i) => {
    if (!photos.length) {
      main.innerHTML = `${CAR_SVG}<span>写真準備中</span>`;
      return;
    }
    idx = (i + photos.length) % photos.length;
    const p = photos[idx];
    main.innerHTML = `
      <img src="${esc(p.full || p.thumb)}" alt="${esc(car.maker)} ${esc(car.name)} 写真${idx + 1}">
      ${photos.length > 1 ? `
        <button class="gallery-nav prev" type="button" aria-label="前の写真">‹</button>
        <button class="gallery-nav next" type="button" aria-label="次の写真">›</button>` : ""}
      <span class="gallery-count">${idx + 1} / ${photos.length}</span>`;
    $$(".thumbs button").forEach((b) => b.setAttribute("aria-current", String(Number(b.dataset.i) === idx)));
    const prev = main.querySelector(".prev"), next = main.querySelector(".next");
    if (prev) prev.onclick = () => show(idx - 1);
    if (next) next.onclick = () => show(idx + 1);
  };
  $$(".thumbs button").forEach((b) => b.addEventListener("click", () => show(Number(b.dataset.i))));

  // スワイプで写真送り
  let x0 = null;
  main.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  main.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  show(0);
}

main();
