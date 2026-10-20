// データの読み書き（Firebase 版とデモ版を同じ使い方で切り替える）
//
// データ構造（Firestore）
//   shops/{店ID}                 店舗情報（誰でも読める／書けるのは店の担当者と管理者）
//     owners: [uid, ...]         この店を編集できるアカウント
//   shops/{店ID}/data/inventory  在庫すべてを1つのドキュメントに格納
//     cars: [ {...}, ... ]       閲覧1回 = 読み取り1回で済むようにまとめている
//
// 写真（config.js の PHOTO_BACKEND で切り替え）
//   cloudflare: /img/{店ID}/{車ID}/{名前}.jpg（functions/img/ が KV に保存・配信）
//   firebase:   Cloud Storage の shops/{店ID}/cars/{車ID}/{名前}.jpg
// 車両データには写真のURLとパスをそのまま保存するので、保存先を切り替えても古い写真は表示され続ける

import { firebaseConfig, FIREBASE_SDK_VERSION, PHOTO_BACKEND, isDemo } from "./config.js";
import { DEMO_SHOP, DEMO_CARS } from "./demo-data.js";
import { blobToDataURL } from "./util.js";

const DEMO = isDemo();
let fbPromise = null; // 読み込みは1回だけ（同時に呼ばれても初期化が重複しないように）

function loadFirebase() {
  if (!fbPromise) fbPromise = initFirebase();
  return fbPromise;
}

async function initFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appMod, fsMod, authMod] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-firestore.js`),
    import(`${base}/firebase-auth.js`)
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  return {
    app,
    db: fsMod.getFirestore(app),
    auth: authMod.getAuth(app),
    fs: fsMod,
    au: authMod
  };
}

// Firebase Storage は使うときだけ読み込む（無料プランでは使わない）
let stPromise = null;
function loadStorage() {
  if (!stPromise) {
    stPromise = (async () => {
      const { app } = await loadFirebase();
      const st = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-storage.js`);
      return { storage: st.getStorage(app), st };
    })();
  }
  return stPromise;
}

// Cloudflare 側（functions/img/）への送信。ログイン中のIDトークンを付ける
async function cfFetch(path, init) {
  const { auth } = await loadFirebase();
  if (!auth.currentUser) throw new Error("ログインが必要です");
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(path, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const msg = (await res.text().catch(() => "")) || `エラー（${res.status}）`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res;
}

// ---------- デモ版（ブラウザ内に保存。Firebase 不要） ----------
const DKEY = (shopId) => `kuruma-demo-${shopId}`;
function demoLoad(shopId) {
  try {
    const raw = localStorage.getItem(DKEY(shopId));
    if (raw) return JSON.parse(raw);
  } catch (_) { /* 使えない環境ではサンプルのまま */ }
  return { shop: structuredClone(DEMO_SHOP), cars: structuredClone(DEMO_CARS) };
}
function demoSave(shopId, data) {
  try {
    localStorage.setItem(DKEY(shopId), JSON.stringify(data));
  } catch (_) { /* 容量不足などは無視（デモなので） */ }
}
// デモのログイン状態はタブを閉じるまで保持
let demoUser = (() => {
  try { return JSON.parse(sessionStorage.getItem("kuruma-demo-user")); } catch (_) { return null; }
})();
function setDemoUser(u) {
  demoUser = u;
  try {
    if (u) sessionStorage.setItem("kuruma-demo-user", JSON.stringify(u));
    else sessionStorage.removeItem("kuruma-demo-user");
  } catch (_) {}
}

// ---------- 公開 API ----------
export const demoMode = DEMO;

export async function getShop(shopId) {
  if (DEMO) return demoLoad(shopId).shop;
  const { db, fs } = await loadFirebase();
  const snap = await fs.getDoc(fs.doc(db, "shops", shopId));
  return snap.exists() ? snap.data() : null;
}

export async function getCars(shopId) {
  if (DEMO) return demoLoad(shopId).cars;
  const { db, fs } = await loadFirebase();
  const snap = await fs.getDoc(fs.doc(db, "shops", shopId, "data", "inventory"));
  return snap.exists() ? snap.data().cars || [] : [];
}

// 在庫配列を書き換える。fn(cars) が新しい配列を返す。
// 同時に2人が更新しても上書きし合わないよう、トランザクションで実行する。
export async function updateCars(shopId, fn) {
  if (DEMO) {
    const d = demoLoad(shopId);
    d.cars = fn(structuredClone(d.cars));
    demoSave(shopId, d);
    return d.cars;
  }
  const { db, fs } = await loadFirebase();
  const ref = fs.doc(db, "shops", shopId, "data", "inventory");
  return await fs.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cars = snap.exists() ? snap.data().cars || [] : [];
    const next = fn(cars);
    tx.set(ref, { cars: next, updatedAt: Date.now() });
    return next;
  });
}

export async function saveShop(shopId, data) {
  if (DEMO) {
    const d = demoLoad(shopId);
    d.shop = { ...d.shop, ...data };
    demoSave(shopId, d);
    return;
  }
  const { db, fs } = await loadFirebase();
  await fs.setDoc(fs.doc(db, "shops", shopId), data, { merge: true });
}

// 写真アップロード。{ url, path } を返す
export async function uploadPhoto(shopId, carId, name, blob) {
  if (DEMO) {
    return { url: await blobToDataURL(blob), path: `demo/${carId}/${name}` };
  }
  if (PHOTO_BACKEND === "cloudflare") {
    const res = await cfFetch(`/img/${shopId}/${carId}/${name}.jpg`, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob
    });
    return await res.json(); // { url: "/img/...", path: "img/..." }
  }
  const { storage, st } = await loadStorage();
  const path = `shops/${shopId}/cars/${carId}/${name}.jpg`;
  const r = st.ref(storage, path);
  await st.uploadBytes(r, blob, {
    contentType: "image/jpeg",
    cacheControl: "public, max-age=31536000"
  });
  return { url: await st.getDownloadURL(r), path };
}

// 写真の削除。パスの形で保存先を判断する（切り替え前の古い写真も消せる）
export async function deletePhoto(path) {
  if (DEMO || !path) return;
  if (path.startsWith("img/")) {
    try {
      await cfFetch(`/${path}`, { method: "DELETE" });
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    return;
  }
  const { storage, st } = await loadStorage();
  try {
    await st.deleteObject(st.ref(storage, path));
  } catch (e) {
    if (e.code !== "storage/object-not-found") throw e;
  }
}

// ---------- ログイン ----------
export async function watchAuth(cb) {
  if (DEMO) {
    cb(demoUser);
    return;
  }
  const { auth, au } = await loadFirebase();
  au.onAuthStateChanged(auth, cb);
}

export async function signIn(email, password) {
  if (DEMO) {
    setDemoUser({ uid: "demo-user", email: email || "demo@example.com" });
    return demoUser;
  }
  const { auth, au } = await loadFirebase();
  const cred = await au.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOut() {
  if (DEMO) {
    setDemoUser(null);
    return;
  }
  const { auth, au } = await loadFirebase();
  await au.signOut(auth);
}

export async function sendReset(email) {
  if (DEMO) return;
  const { auth, au } = await loadFirebase();
  await au.sendPasswordResetEmail(auth, email);
}

// デモのデータを最初の状態に戻す
export function resetDemo(shopId) {
  try { localStorage.removeItem(DKEY(shopId)); } catch (_) {}
}

// エラーを日本語にする
export function errMessage(e) {
  const c = e && e.code;
  const map = {
    "auth/invalid-credential": "メールアドレスまたはパスワードが違います",
    "auth/invalid-email": "メールアドレスの形式が正しくありません",
    "auth/too-many-requests": "試行回数が多すぎます。しばらく待ってからお試しください",
    "auth/network-request-failed": "通信できませんでした。電波の良い場所でお試しください",
    "permission-denied": "この店舗を編集する権限がありません",
    "storage/unauthorized": "写真をアップロードする権限がありません",
    "storage/quota-exceeded": "写真の保存容量を超えました。管理者に連絡してください",
    "unavailable": "通信できませんでした。電波の良い場所でお試しください"
  };
  return map[c] || (e && e.message) || "エラーが発生しました";
}
