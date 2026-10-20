// ============================================================
// 設定ファイル（導入時に書き換えるのはここだけ）
// ============================================================

// Firebaseコンソール →「プロジェクトの設定」→「マイアプリ」の値を貼り付けます。
// apiKey が空のあいだは、自動的にデモモード（Firebaseなし）で動きます。
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const FIREBASE_SDK_VERSION = "13.0.0";

// 写真の保存先
//   "cloudflare" … Cloudflare KV（無料・カード登録不要。1日10万回まで）←初期設定
//   "firebase"   … Firebase Storage（Blazeプランが必要。上限で止まらず従量課金）
// 切り替えても、それまでに登録した写真はそのまま表示されます（新しい写真から保存先が変わります）。
export const PHOTO_BACKEND = "cloudflare";

// 制作者（あなた）のアカウントのUID。全店舗を編集できます。
// 画面表示の判定用です。実際の権限は firestore.rules / storage.rules 側の同じ値で決まります。
export const ADMIN_UIDS = [];

// 店IDの決め方
//  1. URLに ?shop=xxx があればそれを使う（ローカル確認用）
//  2. https://<店ID>.pages.dev なら、その <店ID> を使う
//     （プレビューURL https://abc123.<店ID>.pages.dev でも同じ店IDになる）
//  3. どちらでもなければ "demo"
//
// Cloudflare が希望の名前を使えず「shop-a-3xk.pages.dev」のような名前になった場合や、
// 独自ドメインに移した場合は、ここで「ホスト名の一部 → 店ID」を対応づけます。
//   例：{ "shop-a-3xk": "shop-a", "www.example-motors.jp": "shop-a" }
export const SHOP_ALIASES = {};

export function resolveShopId() {
  const p = new URLSearchParams(location.search);
  if (p.get("shop")) return p.get("shop");
  const host = location.hostname;
  if (SHOP_ALIASES[host]) return SHOP_ALIASES[host];
  const m = host.match(/([a-z0-9-]+)\.pages\.dev$/);
  if (m) return SHOP_ALIASES[m[1]] || m[1];
  return "demo";
}

// デモモード：?demo を付けたとき、または Firebase 未設定のとき
export function isDemo() {
  const p = new URLSearchParams(location.search);
  return p.has("demo") || !firebaseConfig.apiKey;
}
