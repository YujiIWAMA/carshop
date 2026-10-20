// 管理画面：車両の登録・編集
import { getCars, updateCars, uploadPhoto, deletePhoto, signOut, errMessage } from "./store.js";
import { esc, $, $$, link, param, toast, newId, resizeImage, STATUSES } from "./util.js";
import { gate, shopId, canEdit, demoFlagHTML, bindDemoReset, noPermissionHTML } from "./admin-common.js";
import { EQUIPMENT_LIST, MAKERS, BODY_TYPES } from "./demo-data.js";

const MAX_PHOTOS = 10;
const root = $("#root");
const editId = param("id");
const carId = editId || newId();

let original = null;      // 編集前の車両データ
let photos = [];          // [{ full, thumb, pathFull, pathThumb }]
let removed = [];         // 保存時に削除する写真のパス
let uploading = 0;
let dirty = false;

gate(root, async (user, shop) => {
  if (!canEdit(user, shop)) {
    root.innerHTML = noPermissionHTML(user);
    $("#logout2").onclick = () => signOut();
    return;
  }
  if (editId) {
    try {
      const cars = await getCars(shopId);
      original = cars.find((c) => c.id === editId) || null;
    } catch (e) {
      toast(errMessage(e), "err");
    }
    if (!original) {
      root.innerHTML = `${demoFlagHTML()}<div class="login"><div class="card"><h2>車両が見つかりません</h2><a class="btn btn-outline" href="${link("index.html")}">在庫一覧に戻る</a></div></div>`;
      return;
    }
    photos = structuredClone(original.photos || []);
  }
  render(original || { status: "onsale", repair: "なし", equipment: [] });
});

function opt(list, cur) {
  return list.map((v) => `<option ${v === cur ? "selected" : ""}>${esc(v)}</option>`).join("");
}

function render(car) {
  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear + 1; y >= 1985; y--) years.push(y);
  const shakenMode = !car.shaken ? "date" : /^\d{4}-\d{2}$/.test(car.shaken) ? "date" : car.shaken;
  const extraEquip = (car.equipment || []).filter((e) => !EQUIPMENT_LIST.includes(e));

  root.innerHTML = `
  ${demoFlagHTML()}
  <header class="sub-head">
    <a class="icon-btn" href="${link("index.html")}" aria-label="在庫一覧に戻る" id="back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
    </a>
    <h1>${editId ? "車両を編集" : "車両を登録"}</h1>
  </header>

  <form class="form" id="form" novalidate>
    <section class="card">
      <div class="card-head">
        <h2>写真</h2>
        <small id="ph-count"></small>
      </div>
      <div class="photos" id="photos"></div>
      <p class="hint">1枚目が一覧に表示されます。◀ ▶ で並べ替えできます。</p>
      <input type="file" id="file" accept="image/*" multiple hidden>
    </section>

    <section class="card">
      <h2>基本情報</h2>
      <label class="f req"><span>メーカー</span>
        <select name="maker" required>
          <option value="">選択してください</option>
          ${opt(MAKERS, car.maker)}
          ${car.maker && !MAKERS.includes(car.maker) ? `<option selected>${esc(car.maker)}</option>` : ""}
        </select>
      </label>
      <label class="f req"><span>車種名</span>
        <input type="text" name="name" value="${esc(car.name || "")}" placeholder="例：プリウス" required>
      </label>
      <label class="f"><span>グレード</span>
        <input type="text" name="grade" value="${esc(car.grade || "")}" placeholder="例：S セーフティプラス">
      </label>
      <div class="grid2">
        <label class="f req"><span>年式</span>
          <select name="year" required>
            <option value="">選択</option>
            ${years.map((y) => `<option value="${y}" ${Number(car.year) === y ? "selected" : ""}>${y}年</option>`).join("")}
          </select>
        </label>
        <label class="f req"><span>走行距離（km）</span>
          <input type="text" name="mileage" inputmode="numeric" value="${car.mileage != null ? Number(car.mileage).toLocaleString("ja-JP") : ""}" placeholder="例：42000" required>
        </label>
        <label class="f req"><span>車検</span>
          <select name="shakenMode">
            <option value="date" ${shakenMode === "date" ? "selected" : ""}>満了年月を入力</option>
            <option ${shakenMode === "車検整備付" ? "selected" : ""}>車検整備付</option>
            <option ${shakenMode === "車検整備別" ? "selected" : ""}>車検整備別</option>
          </select>
        </label>
        <label class="f" id="shaken-date-wrap"><span>満了年月</span>
          <input type="month" name="shakenDate" value="${shakenMode === "date" ? esc(car.shaken || "") : ""}">
        </label>
        <label class="f req"><span>修復歴</span>
          <select name="repair">${opt(["なし", "あり"], car.repair || "なし")}</select>
        </label>
        <label class="f"><span>ボディタイプ</span>
          <select name="bodyType"><option value="">選択</option>${opt(BODY_TYPES, car.bodyType)}</select>
        </label>
      </div>
    </section>

    <section class="card">
      <h2>価格</h2>
      <div class="grid2">
        <label class="f req"><span>支払総額（万円）</span>
          <input class="price-input" type="text" name="totalPrice" inputmode="decimal" value="${car.totalPrice ?? ""}" placeholder="例：189.8" required>
        </label>
        <label class="f req"><span>車両本体（万円）</span>
          <input type="text" name="basePrice" inputmode="decimal" value="${car.basePrice ?? ""}" placeholder="例：176" required>
        </label>
      </div>
      <div class="calc" id="calc" aria-live="polite">諸費用は自動で計算されます</div>
    </section>

    <fieldset class="card">
      <legend>装備（タップで選択）</legend>
      <div class="checks">
        ${EQUIPMENT_LIST.map((e) => `
          <label class="check"><input type="checkbox" name="equip" value="${esc(e)}" ${(car.equipment || []).includes(e) ? "checked" : ""}>${esc(e)}</label>`).join("")}
      </div>
      <label class="f" style="margin-top:12px"><span>その他の装備（読点「、」で区切る）</span>
        <input type="text" name="equipExtra" value="${esc(extraEquip.join("、"))}" placeholder="例：ルーフキャリア、寒冷地仕様">
      </label>
    </fieldset>

    <details class="card">
      <summary><h2 style="display:inline">詳細情報（任意）</h2></summary>
      <div class="grid2" style="margin-top:14px">
        <label class="f"><span>排気量</span><input type="text" name="displacement" value="${esc(car.displacement || "")}" placeholder="例：1,800cc"></label>
        <label class="f"><span>ミッション</span>
          <select name="transmission"><option value="">選択</option>${opt(["AT", "CVT", "MT", "その他"], car.transmission)}</select>
        </label>
        <label class="f"><span>燃料</span>
          <select name="fuel"><option value="">選択</option>${opt(["ガソリン", "ハイブリッド", "ディーゼル", "電気", "その他"], car.fuel)}</select>
        </label>
        <label class="f"><span>ボディ色</span><input type="text" name="color" value="${esc(car.color || "")}" placeholder="例：パールホワイト"></label>
        <label class="f"><span>保証</span><input type="text" name="warranty" value="${esc(car.warranty || "")}" placeholder="例：3か月・3,000km"></label>
        <label class="f"><span>管理番号</span><input type="text" name="stockNo" value="${esc(car.stockNo || "")}" placeholder="例：A-101"></label>
      </div>
    </details>

    <section class="card">
      <label class="f" style="font-size:15px;font-weight:900;color:#111827">スタッフコメント
        <textarea name="comment" rows="4" placeholder="おすすめポイントを自由に入力（詳細ページに表示されます）">${esc(car.comment || "")}</textarea>
      </label>
    </section>

    <fieldset class="card">
      <legend>掲載状態</legend>
      <div class="radios">
        ${STATUSES.map((s) => `
          <label class="radio"><input type="radio" name="status" value="${s.id}" ${car.status === s.id ? "checked" : ""}>${s.label}</label>`).join("")}
      </div>
      <p class="hint" style="margin-top:6px">「下書き」は公開サイトに表示されません。</p>
    </fieldset>

    <p class="form-msg" id="form-msg" role="alert"></p>
    ${editId ? `<button class="btn btn-danger" type="button" id="del-btn">この車両を削除</button>` : ""}
  </form>

  <div class="bottom-bar"><div class="bottom-bar-inner">
    <a class="btn btn-outline" href="${link("index.html")}" id="cancel">戻る</a>
    <button class="btn btn-accent" type="submit" form="form" id="save-btn">保存する</button>
  </div></div>`;

  bindDemoReset();
  const form = $("#form");
  renderPhotos();
  updateCalc();
  toggleShakenDate();

  form.addEventListener("input", (e) => {
    dirty = true;
    if (e.target.name === "totalPrice" || e.target.name === "basePrice") updateCalc();
    if (e.target.getAttribute("aria-invalid")) e.target.removeAttribute("aria-invalid");
  });
  form.shakenMode.addEventListener("change", toggleShakenDate);
  form.addEventListener("submit", (e) => { e.preventDefault(); save(); });
  $("#file").addEventListener("change", (e) => { addFiles([...e.target.files]); e.target.value = ""; });
  const del = $("#del-btn");
  if (del) del.addEventListener("click", removeCar);

  window.addEventListener("beforeunload", (e) => {
    if (dirty || uploading) { e.preventDefault(); e.returnValue = ""; }
  });
}

function toggleShakenDate() {
  const f = $("#form");
  $("#shaken-date-wrap").hidden = f.shakenMode.value !== "date";
}

function num(v) {
  const s = String(v ?? "").replace(/[,，\s万円km]/g, "").replace(/[０-９．]/g, (c) =>
    c === "．" ? "." : String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  if (s === "") return NaN;
  return Number(s);
}

function updateCalc() {
  const f = $("#form");
  const t = num(f.totalPrice.value), b = num(f.basePrice.value);
  const el = $("#calc");
  el.classList.remove("warn");
  if (!isFinite(t) || !isFinite(b)) {
    el.textContent = "諸費用は自動で計算されます（支払総額 − 車両本体）";
    return;
  }
  const fee = Math.round((t - b) * 10) / 10;
  if (fee < 0) {
    el.classList.add("warn");
    el.textContent = "支払総額が車両本体より小さくなっています。金額を確認してください。";
    return;
  }
  el.innerHTML = `諸費用 <b>${fee.toFixed(1)}万円</b>（自賠責保険料・税金・登録代行費用など）`;
}

// ---------- 写真 ----------
function renderPhotos() {
  const box = $("#photos");
  const items = photos.map((p, i) => `
    <div class="ph">
      ${p.loading ? `<div class="ph-loading">アップロード中</div>` : `<img src="${esc(p.thumb || p.full)}" alt="写真 ${i + 1}">`}
      ${i === 0 && !p.loading ? `<span class="ph-main">メイン</span>` : ""}
      ${p.loading ? "" : `
      <div class="ph-tools">
        <button type="button" data-act="left" data-i="${i}" aria-label="写真${i + 1}を前へ" ${i === 0 ? "disabled" : ""}>◀</button>
        <button type="button" data-act="del" data-i="${i}" aria-label="写真${i + 1}を削除">✕</button>
        <button type="button" data-act="right" data-i="${i}" aria-label="写真${i + 1}を後ろへ" ${i === photos.length - 1 ? "disabled" : ""}>▶</button>
      </div>`}
    </div>`);
  if (photos.length < MAX_PHOTOS) {
    items.push(`
    <button type="button" class="ph-add" id="ph-add">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg>
      撮影・追加
    </button>`);
  }
  box.innerHTML = items.join("");
  $("#ph-count").textContent = `${photos.filter((p) => !p.loading).length} / ${MAX_PHOTOS}枚`;
  const add = $("#ph-add");
  if (add) add.onclick = () => $("#file").click();
  $$(".ph-tools button", box).forEach((b) => b.addEventListener("click", () => photoAction(b.dataset.act, Number(b.dataset.i))));
}

function photoAction(act, i) {
  dirty = true;
  if (act === "del") {
    const [p] = photos.splice(i, 1);
    removed.push(p.pathFull, p.pathThumb);
  } else {
    const j = act === "left" ? i - 1 : i + 1;
    if (j < 0 || j >= photos.length) return;
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }
  renderPhotos();
}

async function addFiles(files) {
  const room = MAX_PHOTOS - photos.length;
  if (files.length > room) toast(`写真は${MAX_PHOTOS}枚までです。先頭の${room}枚を追加します`);
  files = files.slice(0, room);
  dirty = true;
  // 1枚ずつ（通信が細くても順番に確実に）
  for (const file of files) {
    const slot = { loading: true };
    photos.push(slot);
    uploading++;
    renderPhotos();
    try {
      const [full, thumb] = await Promise.all([resizeImage(file, 1600, 0.82), resizeImage(file, 480, 0.75)]);
      const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const [f, t] = await Promise.all([
        uploadPhoto(shopId, carId, name, full),
        uploadPhoto(shopId, carId, `${name}-t`, thumb)
      ]);
      Object.assign(slot, { loading: false, full: f.url, thumb: t.url, pathFull: f.path, pathThumb: t.path });
    } catch (e) {
      console.error(e);
      photos.splice(photos.indexOf(slot), 1);
      toast(errMessage(e), "err");
    } finally {
      uploading--;
      renderPhotos();
    }
  }
}

// ---------- 保存 ----------
function collect() {
  const f = $("#form");
  const v = (n) => f[n].value.trim();
  const equip = $$('input[name="equip"]:checked', f).map((x) => x.value);
  const extra = v("equipExtra").split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
  const shaken = f.shakenMode.value === "date" ? v("shakenDate") : f.shakenMode.value;
  return {
    maker: v("maker"), name: v("name"), grade: v("grade"),
    year: Number(v("year")) || null,
    mileage: num(v("mileage")),
    shaken, repair: v("repair"), bodyType: v("bodyType"),
    totalPrice: num(v("totalPrice")), basePrice: num(v("basePrice")),
    displacement: v("displacement"), transmission: v("transmission"), fuel: v("fuel"),
    color: v("color"), warranty: v("warranty"), stockNo: v("stockNo"),
    equipment: [...new Set([...equip, ...extra])],
    comment: f.comment.value.trim(),
    status: (f.querySelector('input[name="status"]:checked') || {}).value || "draft"
  };
}

function validate(d) {
  const f = $("#form");
  const errs = [];
  const bad = (name, msg) => { errs.push(msg); if (f[name]) f[name].setAttribute("aria-invalid", "true"); };
  $$("[aria-invalid]", f).forEach((el) => el.removeAttribute("aria-invalid"));
  if (!d.maker) bad("maker", "メーカー");
  if (!d.name) bad("name", "車種名");
  if (!d.year) bad("year", "年式");
  if (!isFinite(d.mileage) || d.mileage < 0) bad("mileage", "走行距離");
  if (!d.shaken) bad("shakenDate", "車検の満了年月");
  if (!isFinite(d.totalPrice) || d.totalPrice <= 0) bad("totalPrice", "支払総額");
  if (!isFinite(d.basePrice) || d.basePrice <= 0) bad("basePrice", "車両本体価格");
  const msgs = [];
  if (errs.length) msgs.push(`未入力・誤りがあります：${errs.join("、")}`);
  if (isFinite(d.totalPrice) && isFinite(d.basePrice) && d.totalPrice < d.basePrice) {
    msgs.push("支払総額が車両本体より小さくなっています");
    f.totalPrice.setAttribute("aria-invalid", "true");
  }
  if (d.status !== "draft" && !photos.filter((p) => !p.loading).length) {
    msgs.push("公開するには写真が1枚以上必要です（写真なしで保存する場合は「下書き」を選んでください）");
  }
  return msgs;
}

async function save() {
  if (uploading) { toast("写真のアップロードが終わるまでお待ちください"); return; }
  const d = collect();
  const msgs = validate(d);
  $("#form-msg").innerHTML = msgs.map(esc).join("<br>");
  if (msgs.length) {
    const first = $("#form [aria-invalid]");
    (first || $("#form-msg")).scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const btn = $("#save-btn");
  btn.disabled = true;
  const now = Date.now();
  const car = {
    ...(original || {}),
    ...d,
    id: carId,
    photos: photos.filter((p) => !p.loading).map(({ full, thumb, pathFull, pathThumb }) => ({ full, thumb, pathFull, pathThumb })),
    createdAt: (original && original.createdAt) || now,
    updatedAt: now
  };
  try {
    await updateCars(shopId, (list) => {
      const i = list.findIndex((c) => c.id === carId);
      if (i >= 0) list[i] = car; else list.push(car);
      return list;
    });
    // 外した写真を削除（保存が成功してから）
    await Promise.allSettled(removed.filter(Boolean).map(deletePhoto));
    dirty = false;
    toast(d.status === "draft" ? "下書きを保存しました" : "保存して公開しました");
    setTimeout(() => { location.href = link("index.html"); }, 700);
  } catch (e) {
    toast(errMessage(e), "err");
    btn.disabled = false;
  }
}

async function removeCar() {
  if (!confirm("この車両を削除します。写真も消え、元に戻せません。よろしいですか？\n（売れた車は「売約済」にするのがおすすめです）")) return;
  try {
    await updateCars(shopId, (list) => list.filter((c) => c.id !== carId));
    const paths = (original.photos || []).flatMap((p) => [p.pathFull, p.pathThumb]).concat(removed);
    await Promise.allSettled(paths.filter(Boolean).map(deletePhoto));
    dirty = false;
    toast("削除しました");
    setTimeout(() => { location.href = link("index.html"); }, 600);
  } catch (e) {
    toast(errMessage(e), "err");
  }
}
