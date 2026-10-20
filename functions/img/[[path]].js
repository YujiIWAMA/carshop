// 写真の配信・アップロード・削除（Cloudflare Pages Functions）
//
//   GET    /img/{店ID}/{車ID}/{名前}.jpg   誰でも（写真を返す）
//   PUT    /img/{店ID}/{車ID}/{名前}.jpg   店の担当者・制作者のみ（本文＝JPEG）
//   DELETE /img/{店ID}/{車ID}/{名前}.jpg   店の担当者・制作者のみ
//
// Cloudflare の Pages プロジェクトに設定が必要なもの
//   KV バインディング  PHOTOS             … 写真を保存する KV 名前空間（全店で共通）
//   環境変数           FIREBASE_PROJECT_ID … Firebase のプロジェクトID
//   環境変数           ADMIN_UIDS          … 制作者のUID（複数はカンマ区切り）

const MAX_BYTES = 3 * 1024 * 1024;
const SEG = /^[A-Za-z0-9_-]{1,64}$/;
const FILE = /^[A-Za-z0-9_-]{1,80}\.jpg$/;
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export async function onRequest(context) {
  const { request, env, params } = context;
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);

  // パスの形を厳密に確認（想定外の文字は受け付けない）
  if (parts.length !== 3 || !SEG.test(parts[0]) || !SEG.test(parts[1]) || !FILE.test(parts[2])) {
    return text("Not found", 404);
  }
  const [shopId] = parts;
  const key = parts.join("/");

  if (!env.PHOTOS) return text("PHOTOS (KV) が設定されていません", 500);

  switch (request.method) {
    case "GET":
    case "HEAD":
      return serve(context, key);
    case "PUT":
    case "DELETE": {
      const auth = await authorize(request, env, shopId);
      if (!auth.ok) return text(auth.message, auth.status);
      return request.method === "PUT" ? put(request, env, key) : del(request, env, key);
    }
    case "OPTIONS":
      return new Response(null, { status: 204, headers: { Allow: "GET, HEAD, PUT, DELETE" } });
    default:
      return text("Method not allowed", 405);
  }
}

// ---------- 配信 ----------
async function serve(context, key) {
  const { request, env } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });

  let res = await cache.match(cacheKey);
  if (!res) {
    const { value, metadata } = await env.PHOTOS.getWithMetadata(key, { type: "arrayBuffer" });
    if (!value) return text("Not found", 404);
    res = new Response(value, {
      headers: {
        "Content-Type": (metadata && metadata.contentType) || "image/jpeg",
        // 写真は名前ごとに中身が変わらないので長期キャッシュ
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff"
      }
    });
    context.waitUntil(cache.put(cacheKey, res.clone()));
  }
  return request.method === "HEAD" ? new Response(null, { headers: res.headers }) : res;
}

// ---------- アップロード・削除 ----------
async function put(request, env, key) {
  const type = (request.headers.get("Content-Type") || "").toLowerCase();
  if (type !== "image/jpeg") return text("JPEG 画像のみアップロードできます", 415);
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BYTES) return text("ファイルが大きすぎます（3MBまで）", 413);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return text("空のファイルです", 400);
  if (body.byteLength > MAX_BYTES) return text("ファイルが大きすぎます（3MBまで）", 413);
  // JPEG の先頭バイト（FF D8 FF）を確認
  const head = new Uint8Array(body, 0, 3);
  if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) return text("JPEG 画像ではありません", 415);

  await env.PHOTOS.put(key, body, { metadata: { contentType: "image/jpeg", size: body.byteLength, at: Date.now() } });
  return json({ path: `img/${key}`, url: `/img/${key}` }, 201);
}

async function del(request, env, key) {
  await env.PHOTOS.delete(key);
  // この拠点のキャッシュも消す（写真名は毎回新しく付けるので、他拠点に残っても表示されることはない）
  await caches.default.delete(new Request(new URL(request.url).toString(), { method: "GET" })).catch(() => {});
  return new Response(null, { status: 204 });
}

// ---------- 権限確認 ----------
// Firebase のログイン（IDトークン）を検証し、その人が店の担当者か制作者かを確かめる
async function authorize(request, env, shopId) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) return { ok: false, status: 500, message: "FIREBASE_PROJECT_ID が設定されていません" };
  const m = (request.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/);
  if (!m) return { ok: false, status: 401, message: "ログインが必要です" };

  let claims;
  try {
    claims = await verifyFirebaseToken(m[1], projectId);
  } catch (e) {
    return { ok: false, status: 401, message: "ログインの有効期限が切れています。再度ログインしてください" };
  }
  const uid = claims.sub;
  const admins = String(env.ADMIN_UIDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.includes(uid)) return { ok: true, uid };

  const owners = await fetchOwners(projectId, shopId);
  if (owners.includes(uid)) return { ok: true, uid };
  return { ok: false, status: 403, message: "この店舗の写真を変更する権限がありません" };
}

// 店舗ドキュメントの owners を Firestore REST API で取得（店舗情報は公開読み取り可）
async function fetchOwners(projectId, shopId) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/shops/${encodeURIComponent(shopId)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const doc = await res.json();
  const values = (((doc.fields || {}).owners || {}).arrayValue || {}).values || [];
  return values.map((v) => v.stringValue).filter(Boolean);
}

let jwksCache = { keys: null, exp: 0 };
async function getJwks() {
  if (jwksCache.keys && Date.now() < jwksCache.exp) return jwksCache.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error("jwks fetch failed");
  const data = await res.json();
  const maxAge = Number(((res.headers.get("Cache-Control") || "").match(/max-age=(\d+)/) || [])[1] || 3600);
  jwksCache = { keys: data.keys || [], exp: Date.now() + maxAge * 1000 };
  return jwksCache.keys;
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verifyFirebaseToken(token, projectId) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed");
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  if (header.alg !== "RS256" || !header.kid) throw new Error("bad header");

  const jwk = (await getJwks()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown key");
  const key = await crypto.subtle.importKey(
    "jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!ok) throw new Error("bad signature");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error("bad aud");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("bad iss");
  if (!payload.sub || typeof payload.sub !== "string") throw new Error("no sub");
  if (!(payload.exp > now - 60)) throw new Error("expired");
  if (!(payload.iat <= now + 300)) throw new Error("bad iat");
  return payload;
}

// ---------- 小道具 ----------
function text(msg, status = 200) {
  return new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
