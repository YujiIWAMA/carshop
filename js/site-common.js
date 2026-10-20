// 公開サイトのヘッダー・フッター・共通部品
import { esc, link, CAR_SVG, fmtMan, fmtKm, fmtYear, fmtShaken, isNew } from "./util.js";
import { demoMode } from "./store.js";

export function telHref(tel) {
  return `tel:${String(tel || "").replace(/[^\d+]/g, "")}`;
}

export function applyTheme(shop) {
  if (shop.accent) document.documentElement.style.setProperty("--accent", shop.accent);
}

function brandMark(shop) {
  // ロゴ文字（設定がなければ店名の先頭1文字）
  if (shop.logoText) return esc(String(shop.logoText).slice(0, 2));
  const s = String(shop.name || "").replace(/[〇○◯\s]/g, "");
  return esc(s.slice(0, 1) || "車");
}

export function headerHTML(shop) {
  const line = shop.lineUrl
    ? `<a class="btn btn-line btn-pill" href="${esc(shop.lineUrl)}" target="_blank" rel="noopener">LINEで相談</a>`
    : "";
  return `
  ${demoMode ? `<div class="demo-flag">デモ表示中です（サンプルデータ）</div>` : ""}
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="${link("index.html")}">
        <span class="brand-mark" aria-hidden="true">${brandMark(shop)}</span>
        <span class="brand-text">
          <span class="brand-name">${esc(shop.name)}</span>
          ${shop.nameEn ? `<span class="brand-sub">${esc(shop.nameEn)}</span>` : ""}
        </span>
      </a>
      <nav class="gnav" aria-label="メインメニュー">
        <a href="${link("index.html")}#stock">在庫一覧</a>
        <a href="${link("index.html")}#service">買取・整備</a>
        <a href="${link("index.html")}#shop">店舗案内</a>
        <a href="${link("index.html")}#contact">お問い合わせ</a>
      </nav>
      <div class="header-cta">
        ${shop.tel ? `<a class="header-tel" href="${telHref(shop.tel)}"><small>お電話でのお問い合わせ</small><span>${esc(shop.tel)}</span></a>` : ""}
        ${line}
      </div>
    </div>
  </header>`;
}

export function footerHTML(shop) {
  const k = shop.kobutsu || {};
  return `
  <footer class="site-footer">
    <div class="wrap">
      <span>© ${esc(shop.name)}</span>
      <span>古物商許可：${esc(k.commission || "")} ${esc(k.number || "")}${k.holder ? `（${esc(k.holder)}）` : ""}</span>
      <span class="footer-links"><a href="${link("tokusho.html")}">特定商取引法に基づく表記</a></span>
    </div>
  </footer>`;
}

export function spBarHTML(shop) {
  const tel = shop.tel ? `<a class="btn btn-accent" href="${telHref(shop.tel)}">電話する</a>` : "";
  const line = shop.lineUrl
    ? `<a class="btn btn-line" href="${esc(shop.lineUrl)}" target="_blank" rel="noopener">LINEで相談</a>`
    : `<a class="btn btn-navy" href="${link("index.html")}#stock">在庫を見る</a>`;
  return `<div class="sp-bar">${tel}${line}</div>`;
}

export function mountChrome(shop) {
  applyTheme(shop);
  document.getElementById("site-header").outerHTML = headerHTML(shop);
  document.getElementById("site-footer").outerHTML = footerHTML(shop);
  document.body.insertAdjacentHTML("beforeend", spBarHTML(shop));
  document.body.classList.add("has-sp-bar");
}

export function photoOrIcon(car, which = "thumb") {
  const p = (car.photos || [])[0];
  if (p && (p[which] || p.full)) {
    return `<img src="${esc(p[which] || p.full)}" alt="${esc(car.maker)} ${esc(car.name)}" loading="lazy">`;
  }
  return `${CAR_SVG}<span>写真準備中</span>`;
}

export function carCardHTML(car) {
  const sold = car.status === "sold";
  const nego = car.status === "negotiating";
  return `
  <a class="car-card" href="${link("car.html", { id: car.id })}">
    <div class="car-photo">
      ${photoOrIcon(car)}
      ${isNew(car) && !sold ? `<span class="badge-new">NEW</span>` : ""}
      ${nego ? `<span class="badge-nego">商談中</span>` : ""}
      ${sold ? `<span class="sold-cover"><span>売約済</span></span>` : ""}
    </div>
    <div class="car-body">
      <div>
        <div class="car-maker">${esc(car.maker)}</div>
        <div class="car-name">${esc(car.name)}</div>
        <div class="car-grade">${esc(car.grade)}</div>
      </div>
      <div class="spec3">
        <div><small>年式</small><b>${esc(fmtYear(car.year))}</b></div>
        <div><small>走行距離</small><b>${esc(fmtKm(car.mileage))}</b></div>
        <div><small>車検</small><b>${esc(fmtShaken(car.shaken))}</b></div>
      </div>
      <div class="price-row">
        <div>
          <div class="price-label">支払総額</div>
          <div class="price"><span class="num">${esc(fmtMan(car.totalPrice))}</span><span class="unit">万円</span></div>
        </div>
        <span class="base-price">車両本体 ${esc(fmtMan(car.basePrice))}万円</span>
      </div>
    </div>
  </a>`;
}

export function showFatal(msg) {
  const main = document.querySelector("main");
  if (main) main.innerHTML = `<div class="wrap"><p class="loading">${esc(msg)}</p></div>`;
}
