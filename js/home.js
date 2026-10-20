// トップページ（在庫一覧）
import { resolveShopId } from "./config.js";
import { getShop, getCars } from "./store.js";
import { esc, $, isPublic, CAR_SVG } from "./util.js";
import { mountChrome, carCardHTML, telHref, showFatal } from "./site-common.js";
import { BODY_TYPES } from "./demo-data.js";

const FIRST_SHOW = 12;
const shopId = resolveShopId();
let allCars = [];
let showAll = false;

async function main() {
  let shop, cars;
  try {
    [shop, cars] = await Promise.all([getShop(shopId), getCars(shopId)]);
  } catch (e) {
    console.error(e);
    showFatal("読み込みに失敗しました。時間をおいて再度お試しください。");
    return;
  }
  if (!shop) {
    showFatal("このサイトは準備中です。");
    return;
  }
  document.title = `${shop.name}｜中古車在庫・買取・車検`;
  mountChrome(shop);
  renderShop(shop);

  // 公開対象のみ。新着順、売約済は後ろへ
  allCars = cars
    .filter(isPublic)
    .sort((a, b) => {
      const sa = a.status === "sold" ? 1 : 0, sb = b.status === "sold" ? 1 : 0;
      if (sa !== sb) return sa - sb;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  buildFilters(allCars);
  const last = Math.max(0, ...cars.map((c) => c.updatedAt || 0));
  if (last) {
    const d = new Date(last);
    $("#updated").innerHTML = `<span class="live-dot" aria-hidden="true"></span>最終更新 ${d.getMonth() + 1}/${d.getDate()}`;
  }
  render();
}

function renderShop(shop) {
  $("#hero-catch").textContent = shop.catch || "わかりやすい価格で、\n地元の中古車選びを。";
  $("#hero-lead").textContent = shop.lead || "";
  $("#hero-visual").innerHTML = shop.heroImage
    ? `<img src="${esc(shop.heroImage)}" alt="${esc(shop.name)} 店舗外観">`
    : `${CAR_SVG}<span>店舗外観・展示場の写真</span>`;
  if (shop.loanText) $("#loan-text").textContent = shop.loanText;

  const rows = [
    ["住所", shop.address],
    ["営業時間", shop.hours],
    ["定休日", shop.holiday],
    ["電話", shop.tel],
    ["駐車場", shop.parking]
  ].filter(([, v]) => v);
  $("#shop-dl").innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");

  const q = shop.mapQuery || shop.address;
  if (q) {
    $("#shop-map").innerHTML = `<iframe title="${esc(shop.name)}の地図" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed"></iframe>`;
  }

  const acts = [];
  if (shop.tel) acts.push(`<a class="btn btn-accent" href="${telHref(shop.tel)}">電話する ${esc(shop.tel)}</a>`);
  if (shop.lineUrl) acts.push(`<a class="btn btn-line" href="${esc(shop.lineUrl)}" target="_blank" rel="noopener">LINEで問い合わせ</a>`);
  $("#cta-actions").innerHTML = acts.join("");
}

function buildFilters(cars) {
  const form = $("#search");
  const makers = [...new Set(cars.map((c) => c.maker).filter(Boolean))];
  const bodies = BODY_TYPES.filter((b) => cars.some((c) => c.bodyType === b));
  form.maker.insertAdjacentHTML("beforeend", makers.map((m) => `<option>${esc(m)}</option>`).join(""));
  form.body.insertAdjacentHTML("beforeend", bodies.map((m) => `<option>${esc(m)}</option>`).join(""));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showAll = true;
    render();
    $("#stock").scrollIntoView({ behavior: "smooth" });
  });
  form.addEventListener("change", () => { showAll = true; render(); });
  $("#more-btn").addEventListener("click", () => { showAll = true; render(); });
}

function render() {
  const f = $("#search");
  const maker = f.maker.value, body = f.body.value, price = Number(f.price.value) || 0;
  const list = allCars.filter((c) =>
    (!maker || c.maker === maker) &&
    (!body || c.bodyType === body) &&
    (!price || Number(c.totalPrice) <= price)
  );
  $("#count").textContent = allCars.filter((c) => c.status !== "sold").length;
  const shown = showAll ? list : list.slice(0, FIRST_SHOW);
  $("#car-grid").innerHTML = shown.length
    ? shown.map(carCardHTML).join("")
    : `<p class="empty">${allCars.length ? "条件に合う車両がありません。条件を変えてお探しください。" : "現在、掲載中の車両はありません。お気軽にお問い合わせください。"}</p>`;
  $("#more").hidden = showAll || list.length <= FIRST_SHOW;
}

main();
