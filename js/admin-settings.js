// 管理画面：店舗情報の設定（初期設定は制作者、文言の修正は店舗担当者も可）
import { saveShop, uploadPhoto, signOut, errMessage } from "./store.js";
import { esc, $, link, toast, resizeImage } from "./util.js";
import { gate, shopId, canEdit, isAdminUser, demoFlagHTML, bindDemoReset, noPermissionHTML } from "./admin-common.js";

const root = $("#root");

gate(root, (user, shop) => {
  const admin = isAdminUser(user);
  if (!shop && !admin) {
    root.innerHTML = `${demoFlagHTML()}<div class="login"><div class="card"><h2>この店舗はまだ準備中です</h2><p style="margin:0;font-size:14px">制作担当者による初期設定をお待ちください。</p></div></div>`;
    return;
  }
  if (shop && !canEdit(user, shop)) {
    root.innerHTML = noPermissionHTML(user);
    $("#logout2").onclick = () => signOut();
    return;
  }
  render(user, shop || {}, admin, !shop);
});

function field(label, name, value, { type = "text", ph = "", req = false, area = false, hint = "" } = {}) {
  const input = area
    ? `<textarea name="${name}" rows="3" placeholder="${esc(ph)}">${esc(value || "")}</textarea>`
    : `<input type="${type}" name="${name}" value="${esc(value || "")}" placeholder="${esc(ph)}" ${req ? "required" : ""}>`;
  return `<label class="f ${req ? "req" : ""}"><span>${esc(label)}</span>${input}</label>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}`;
}

function render(user, s, admin, isNew) {
  const k = s.kobutsu || {}, t = s.tokusho || {};
  root.innerHTML = `
  ${demoFlagHTML()}
  <header class="sub-head">
    ${isNew ? `<span style="width:12px"></span>` : `<a class="icon-btn" href="${link("index.html")}" aria-label="在庫一覧に戻る">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>`}
    <h1>${isNew ? "店舗の初期設定" : "店舗情報の設定"}</h1>
  </header>
  <form class="form" id="form" novalidate>
    ${isNew ? `<div class="calc">店舗ID「<b>${esc(shopId)}</b>」を新しく作成します。</div>` : ""}

    <section class="card">
      <h2>店舗の基本情報</h2>
      ${field("店名", "name", s.name, { req: true, ph: "例：〇〇モータース" })}
      ${field("店名の英字表記（ロゴ下の小さな文字）", "nameEn", s.nameEn, { ph: "例：USED CAR & SERVICE" })}
      ${field("ロゴの文字（2文字まで。空欄なら店名の1文字目）", "logoText", s.logoText, { ph: "例：MS" })}
      ${field("電話番号", "tel", s.tel, { type: "tel", req: true, ph: "例：03-1234-5678" })}
      ${field("LINE公式アカウントのURL", "lineUrl", s.lineUrl, { type: "url", ph: "https://lin.ee/xxxx", hint: "空欄ならLINEボタンは表示されません" })}
      ${field("住所", "address", s.address, { req: true, ph: "〒000-0000 〇〇県〇〇市…" })}
      ${field("地図の検索語（空欄なら住所で表示）", "mapQuery", s.mapQuery, { ph: "例：〇〇モータース 〇〇市" })}
      <div class="grid2">
        ${field("営業時間", "hours", s.hours, { ph: "10:00〜19:00" })}
        ${field("定休日", "holiday", s.holiday, { ph: "毎週水曜日" })}
        ${field("駐車場", "parking", s.parking, { ph: "10台" })}
        <label class="f"><span>アクセント色</span><input type="color" name="accent" value="${esc(s.accent || "#F2B705")}" style="padding:4px"></label>
      </div>
    </section>

    <section class="card">
      <h2>トップページの文章</h2>
      ${field("キャッチコピー（改行できます）", "catch", s.catch, { area: true, ph: "わかりやすい価格で、\n地元の中古車選びを。" })}
      ${field("紹介文", "lead", s.lead, { area: true })}
      ${field("オートローンの説明", "loanText", s.loanText, { area: true })}
      <div class="f"><span>トップの写真（店舗外観など）</span>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="ph" style="width:96px;flex:0 0 96px" id="hero-prev">${s.heroImage ? `<img src="${esc(s.heroImage)}" alt="">` : ""}</div>
          <button type="button" class="btn btn-outline" id="hero-btn" style="min-height:44px;font-size:14px">写真を選ぶ</button>
        </div>
        <input type="file" id="hero-file" accept="image/*" hidden>
        <input type="hidden" name="heroImage" value="${esc(s.heroImage || "")}">
      </div>
    </section>

    <section class="card">
      <h2>古物商許可（フッターに表示・必須）</h2>
      ${field("許可を受けた公安委員会", "k_commission", k.commission, { req: true, ph: "例：東京都公安委員会" })}
      ${field("許可証番号", "k_number", k.number, { req: true, ph: "例：第301234567890号" })}
      ${field("氏名又は名称（個人許可は本人の氏名）", "k_holder", k.holder, { req: true })}
    </section>

    <details class="card">
      <summary><h2 style="display:inline">特定商取引法に基づく表記</h2></summary>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:14px">
        ${field("販売業者（空欄なら店名）", "t_operator", t.operator)}
        ${field("運営責任者", "t_representative", t.representative)}
        ${field("メールアドレス", "t_email", t.email, { type: "email" })}
        ${field("お支払い方法", "t_payment", t.payment, { area: true, ph: "現金、銀行振込、オートローン" })}
        ${field("代金以外の必要料金", "t_extraFees", t.extraFees, { area: true, hint: "空欄なら標準の文章が表示されます" })}
        ${field("引渡し時期", "t_delivery", t.delivery, { area: true, hint: "空欄なら標準の文章が表示されます" })}
        ${field("返品・キャンセル", "t_returns", t.returns, { area: true, hint: "空欄なら標準の文章が表示されます" })}
      </div>
    </details>

    ${admin ? `
    <section class="card">
      <h2>編集できるアカウント（制作者のみ）</h2>
      ${field("担当者のUID（1行に1つ）", "owners", (s.owners || []).join("\n"), { area: true, hint: "Firebaseコンソール → Authentication で作成したユーザーのUIDを貼り付けます" })}
    </section>` : ""}

    <p class="form-msg" id="form-msg" role="alert"></p>
  </form>
  <div class="bottom-bar"><div class="bottom-bar-inner">
    <button class="btn btn-accent" type="submit" form="form" id="save-btn">${isNew ? "店舗を作成する" : "保存する"}</button>
  </div></div>`;

  bindDemoReset();
  const form = $("#form");
  $("#hero-btn").onclick = () => $("#hero-file").click();
  $("#hero-file").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $("#hero-btn").disabled = true;
    try {
      const blob = await resizeImage(file, 1600, 0.82);
      const r = await uploadPhoto(shopId, "_site", `hero-${Date.now().toString(36)}`, blob);
      form.heroImage.value = r.url;
      $("#hero-prev").innerHTML = `<img src="${esc(r.url)}" alt="">`;
    } catch (err) {
      toast(errMessage(err), "err");
    } finally {
      $("#hero-btn").disabled = false;
      e.target.value = "";
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (n) => (form[n] ? form[n].value.trim() : "");
    const data = {
      name: v("name"), nameEn: v("nameEn"), logoText: v("logoText"), tel: v("tel"), lineUrl: v("lineUrl"),
      address: v("address"), mapQuery: v("mapQuery"), hours: v("hours"), holiday: v("holiday"),
      parking: v("parking"), accent: v("accent"), catch: form.catch.value.trim(), lead: v("lead"),
      loanText: v("loanText"), heroImage: v("heroImage"),
      kobutsu: { commission: v("k_commission"), number: v("k_number"), holder: v("k_holder") },
      tokusho: {
        operator: v("t_operator"), representative: v("t_representative"), email: v("t_email"),
        payment: v("t_payment"), extraFees: v("t_extraFees"), delivery: v("t_delivery"), returns: v("t_returns")
      }
    };
    if (data.lineUrl && !/^https:\/\//.test(data.lineUrl)) {
      $("#form-msg").textContent = "LINEのURLは https:// から始まるものを入力してください";
      return;
    }
    const missing = [["name", "店名"], ["tel", "電話番号"], ["address", "住所"], ["k_commission", "公安委員会"], ["k_number", "許可証番号"], ["k_holder", "氏名又は名称"]]
      .filter(([n]) => !v(n)).map(([, l]) => l);
    if (missing.length) {
      $("#form-msg").textContent = `未入力の必須項目があります：${missing.join("、")}`;
      return;
    }
    if (admin) data.owners = v("owners").split(/\s+/).filter(Boolean);
    const btn = $("#save-btn");
    btn.disabled = true;
    try {
      await saveShop(shopId, data);
      toast("保存しました");
      setTimeout(() => { location.href = link("index.html"); }, 600);
    } catch (err) {
      $("#form-msg").textContent = errMessage(err);
      btn.disabled = false;
    }
  });
}
