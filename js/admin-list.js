// 管理画面：在庫一覧と状態の切り替え
import { getCars, updateCars, signOut, errMessage } from "./store.js";
import { esc, $, $$, link, toast, fmtMan, fmtKm, fmtYear, STATUSES, statusLabel, CAR_SVG } from "./util.js";
import { gate, shopId, canEdit, isAdminUser, demoFlagHTML, bindDemoReset, noPermissionHTML } from "./admin-common.js";

const root = $("#root");
let cars = [];
let filter = "all";
let query = "";

gate(root, async (user, shop) => {
  if (!canEdit(user, shop)) {
    root.innerHTML = noPermissionHTML(user);
    $("#logout2").onclick = () => signOut();
    return;
  }
  if (!shop) {
    // 店舗がまだ作られていない（制作者が初期設定する）
    location.href = link("settings.html");
    return;
  }
  document.title = `在庫管理｜${shop.name}`;
  renderShell(user, shop);
  try {
    cars = await getCars(shopId);
  } catch (e) {
    toast(errMessage(e), "err");
  }
  renderList();
});

function renderShell(user, shop) {
  root.innerHTML = `
  ${demoFlagHTML()}
  <header class="a-head">
    <div class="a-head-row">
      <div>
        <small>${esc(shop.name)} 管理画面</small>
        <h1>在庫管理</h1>
      </div>
      <button class="icon-btn" type="button" id="menu-btn" aria-label="メニュー" aria-expanded="false" aria-controls="menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
    <div class="stats">
      <div class="stat"><span>掲載中</span><b id="n-onsale">0<small> 台</small></b></div>
      <div class="stat"><span>商談中・売約済</span><b id="n-sold">0<small> 台</small></b></div>
      <div class="stat"><span>下書き</span><b id="n-draft">0<small> 台</small></b></div>
    </div>
  </header>
  <nav class="menu" id="menu" hidden aria-label="メニュー">
    <a href="${link("../index.html")}" target="_blank" rel="noopener">公開サイトを見る</a>
    <a href="${link("settings.html")}">店舗情報の設定</a>
    <hr>
    <span style="font-size:12px;color:#4B5563;padding:4px 14px">${esc(user.email || "")}${isAdminUser(user) ? "（制作者）" : ""}</span>
    <button type="button" id="logout">ログアウト</button>
  </nav>

  <div class="toolbar">
    <label class="searchbox">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <span class="sr-only">車両を検索</span>
      <input type="search" id="q" placeholder="車種名・管理番号で検索">
    </label>
    <div class="tabs" role="group" aria-label="状態で絞り込み">
      <button type="button" data-f="all" aria-pressed="true">すべて</button>
      ${STATUSES.map((s) => `<button type="button" data-f="${s.id}" aria-pressed="false">${s.label}</button>`).join("")}
    </div>
  </div>

  <ul class="car-list" id="list"><li class="list-empty">読み込み中…</li></ul>

  <div class="bottom-bar"><div class="bottom-bar-inner">
    <a class="btn btn-accent" href="${link("edit.html")}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>車両を追加
    </a>
  </div></div>`;

  bindDemoReset();
  const menuBtn = $("#menu-btn"), menu = $("#menu");
  menuBtn.onclick = (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    menuBtn.setAttribute("aria-expanded", String(!menu.hidden));
  };
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target)) {
      menu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
  $("#logout").onclick = async () => { await signOut(); location.reload(); };
  $("#q").addEventListener("input", (e) => { query = e.target.value.trim(); renderList(); });
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.f;
    $$(".tabs button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderList();
  }));
}

function renderList() {
  const count = (s) => cars.filter((c) => c.status === s).length;
  $("#n-onsale").innerHTML = `${count("onsale")}<small> 台</small>`;
  $("#n-sold").innerHTML = `${count("negotiating") + count("sold")}<small> 台</small>`;
  $("#n-draft").innerHTML = `${count("draft")}<small> 台</small>`;

  const q = query.toLowerCase();
  const list = cars
    .filter((c) => filter === "all" || c.status === filter)
    .filter((c) => !q || [c.maker, c.name, c.grade, c.stockNo].join(" ").toLowerCase().includes(q))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (!list.length) {
    $("#list").innerHTML = `<li class="list-empty">${cars.length ? "該当する車両がありません" : "まだ車両がありません。<br>下の「車両を追加」から登録してください。"}</li>`;
    return;
  }
  $("#list").innerHTML = list.map((c) => {
    const p = (c.photos || [])[0];
    return `
    <li class="car-item ${c.status === "sold" ? "is-sold" : ""}">
      <div class="car-thumb">${p ? `<img src="${esc(p.thumb || p.full)}" alt="" loading="lazy">` : CAR_SVG}</div>
      <a class="car-info" href="${link("edit.html", { id: c.id })}">
        <b>${esc(c.maker)} ${esc(c.name)} ${esc(c.grade || "")}</b>
        <span>${esc(fmtYear(c.year))}・${esc(fmtKm(c.mileage))}${c.stockNo ? `・${esc(c.stockNo)}` : ""}</span>
        <em>総額 ${esc(fmtMan(c.totalPrice))}万円</em>
      </a>
      <label class="sr-only" for="st-${esc(c.id)}">${esc(c.name)} の状態</label>
      <select class="status-select" id="st-${esc(c.id)}" data-id="${esc(c.id)}" data-s="${esc(c.status)}">
        ${STATUSES.map((s) => `<option value="${s.id}" ${s.id === c.status ? "selected" : ""}>${s.label}</option>`).join("")}
      </select>
    </li>`;
  }).join("");

  $$(".status-select").forEach((sel) => sel.addEventListener("change", () => changeStatus(sel)));
}

async function changeStatus(sel) {
  const id = sel.dataset.id, next = sel.value, prev = sel.dataset.s;
  sel.dataset.s = next;
  sel.disabled = true;
  try {
    cars = await updateCars(shopId, (list) =>
      list.map((c) => (c.id === id ? { ...c, status: next, updatedAt: Date.now() } : c))
    );
    toast(`「${statusLabel(next)}」にしました`);
    renderList();
  } catch (e) {
    sel.value = prev;
    sel.dataset.s = prev;
    toast(errMessage(e), "err");
  } finally {
    sel.disabled = false;
  }
}
