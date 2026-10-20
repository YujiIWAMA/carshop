// 管理画面の共通処理（ログイン画面の表示など）
import { resolveShopId, ADMIN_UIDS } from "./config.js";
import { watchAuth, signIn, sendReset, getShop, errMessage, demoMode, resetDemo } from "./store.js";
import { esc, $, link, toast } from "./util.js";

export const shopId = resolveShopId();

export function demoFlagHTML() {
  return demoMode
    ? `<div class="demo-flag">デモモード（変更はこの端末にだけ保存されます）<button type="button" id="demo-reset">最初の状態に戻す</button></div>`
    : "";
}

export function bindDemoReset() {
  const b = document.getElementById("demo-reset");
  if (b) b.addEventListener("click", () => {
    resetDemo(shopId);
    location.reload();
  });
}

function loginHTML(shopName) {
  return `
  ${demoFlagHTML()}
  <div class="login">
    <div class="login-brand">
      <b>${esc(shopName || "在庫管理")}</b>
      <span>在庫管理画面</span>
    </div>
    <form class="card" id="login-form" novalidate>
      <label class="f">メールアドレス
        <input type="email" name="email" autocomplete="username" inputmode="email" required ${demoMode ? 'value="demo@example.com"' : ""}>
      </label>
      <label class="f">パスワード
        <input type="password" name="password" autocomplete="current-password" required ${demoMode ? 'value="demo"' : ""}>
      </label>
      <p class="form-msg" id="login-msg" role="alert"></p>
      <button class="btn btn-accent" type="submit">ログイン</button>
      <button class="link-btn" type="button" id="reset-btn">パスワードを忘れた場合</button>
    </form>
  </div>`;
}

// ログインしていれば onReady(user, shop) を呼ぶ。していなければログイン画面を出す。
export async function gate(root, onReady) {
  let shop = null;
  try {
    shop = await getShop(shopId);
  } catch (e) {
    console.error(e);
  }
  await watchAuth((user) => {
    if (!user) {
      root.innerHTML = loginHTML(shop && shop.name);
      bindDemoReset();
      const form = $("#login-form");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        $("#login-msg").textContent = "";
        try {
          await signIn(form.email.value.trim(), form.password.value);
          if (demoMode) location.reload();
        } catch (err) {
          $("#login-msg").textContent = errMessage(err);
        } finally {
          btn.disabled = false;
        }
      });
      $("#reset-btn").addEventListener("click", async () => {
        const email = form.email.value.trim();
        if (!email) {
          $("#login-msg").textContent = "メールアドレスを入力してから押してください";
          return;
        }
        try {
          await sendReset(email);
          toast("パスワード再設定のメールを送りました");
        } catch (err) {
          $("#login-msg").textContent = errMessage(err);
        }
      });
      return;
    }
    onReady(user, shop);
  });
}

export function canEdit(user, shop) {
  if (demoMode) return true;
  if (ADMIN_UIDS.includes(user.uid)) return true;
  return !!(shop && (shop.owners || []).includes(user.uid));
}

export function isAdminUser(user) {
  return demoMode || ADMIN_UIDS.includes(user.uid);
}

export function noPermissionHTML(user) {
  return `
  ${demoFlagHTML()}
  <div class="login">
    <div class="card">
      <h2>この店舗を編集する権限がありません</h2>
      <p style="margin:0;font-size:14px;color:#4B5563">ログイン中：${esc(user.email || "")}<br>担当者にお問い合わせください。</p>
      <button class="btn btn-outline" type="button" id="logout2">ログアウト</button>
    </div>
  </div>`;
}

export { link };
