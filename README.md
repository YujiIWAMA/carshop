# 車屋向け 在庫更新型ホームページ

中古車販売店向けの自社ホームページです。店の担当者がスマホの管理画面から、在庫の追加・価格変更・売約済みの切り替えをできます。1つのコードで複数店舗を運用します。

- 公開サイト：トップ／在庫一覧（絞り込み）、車両詳細、特定商取引法に基づく表記
- 管理画面（`/admin/`）：ログイン、在庫一覧と状態切り替え、車両の登録・編集（写真10枚、自動縮小）、店舗情報の設定
- 構成：静的HTML＋JavaScript（ビルド不要）／Firebase（Authentication・Firestore）／Cloudflare Pages（サイト配信＋写真の保存・配信）

**初期設定はすべて無料・カード登録不要で動きます**（Firebase は無料の Spark プラン、Cloudflare は無料プラン）。

## まずデモで確認する

Firebase を設定しなくても、サンプルデータで全画面を確認できます。

```
cd kuruma-hp
python3 -m http.server 8000
```

- 公開サイト：http://localhost:8000/?demo
- 管理画面：http://localhost:8000/admin/?demo （メール・パスワードは何でもログインできます）

デモでの変更はそのブラウザにだけ保存されます。管理画面上部の「最初の状態に戻す」で元に戻せます。

## ファイル構成

```
index.html / car.html / tokusho.html   公開サイト
admin/index.html                       在庫一覧（管理）
admin/edit.html                        車両の登録・編集
admin/settings.html                    店舗情報の設定・初期設定
functions/img/[[path]].js              写真の保存・配信（Cloudflare Pages Functions）
js/config.js                           ★導入時に書き換える設定
js/store.js                            データの読み書き（Firebase版とデモ版）
firestore.rules                        ★Firestore のセキュリティルール
storage.rules                          Firebase Storage を使う場合のみ（初期設定では不要）
_headers / robots.txt                  Cloudflare Pages 用
```

## データの持ち方

| 場所 | 内容 | 読める人 | 書ける人 |
| --- | --- | --- | --- |
| Firestore `shops/{店ID}` | 店舗情報、`owners`（編集できるUIDの配列） | 誰でも | 制作者、担当者（owners以外） |
| Firestore `shops/{店ID}/data/inventory` | `cars` 配列に在庫すべて | 誰でも | 制作者、担当者 |
| Cloudflare KV `{店ID}/{車ID}/{名前}.jpg` | 写真（長辺1600px＋一覧用480px） | 誰でも（`/img/…` で配信） | 制作者、担当者 |

在庫を1つのドキュメントにまとめているので、お客様の閲覧1回あたりの Firestore 読み取りは2回（店舗情報＋在庫）で済みます。

写真のアップロード・削除では、`functions/img/` が Firebase のログイン（IDトークン）を検証し、その人が店の `owners` に入っているか（または制作者か）を確認します。

## 無料枠の目安

| サービス | 無料枠 | 超えたとき |
| --- | --- | --- |
| Firestore（Spark） | 読み取り 5万回／日、書き込み 2万回／日、保存 1GB | その日は在庫が表示されなくなる |
| Cloudflare Pages（静的ファイル） | 実質無制限 | ― |
| Pages Functions（写真の表示・アップロード） | 10万回／日（**Cloudflare アカウント全体で共有**） | その日は写真が表示されなくなる |
| Cloudflare KV | 保存 1GB、読み出し 10万回／日、書き込み 1,000回／日 | 同上 |

3店舗・各50台なら、写真の保存は合計 500MB 程度です。写真はブラウザに1年間保存されるので、同じ人の再訪問では回数に数えられません。

## 導入手順（最初の1回）

### 1. Firebase プロジェクト（無料の Spark プランのまま）

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成（Google アナリティクスは不要）
2. Authentication →「始める」→ ログイン方法で「メール / パスワード」を有効にする
3. 「ユーザー」タブで制作者（あなた）のアカウントを追加し、表示される **UID** を控える
4. Firestore Database を作成（ロケーション：`asia-northeast1`（東京）、本番環境モード）
5. Firestore の「ルール」タブに `firestore.rules` の内容を貼り、`ADMIN_UID` を手順3のUIDに置き換えて「公開」
6. プロジェクトの設定 →「マイアプリ」→ ウェブアプリ（`</>`）を追加し、表示された `firebaseConfig` の値を `js/config.js` に貼る
7. `js/config.js` の `ADMIN_UIDS` に手順3のUIDを入れる（例：`["abc123..."]`）

Storage は作らなくて大丈夫です。

### 2. GitHub に push

このフォルダの中身を、作成済みのリポジトリに push します。

### 3. Cloudflare：写真の保存場所（KV）を作る（全店で1つ）

1. Cloudflare ダッシュボード →「ストレージとデータベース」→「KV」→「名前空間を作成」
2. 名前は `kuruma-photos` など

### 4. Cloudflare Pages：店ごとにプロジェクトを作る

1. 「Workers & Pages」→「作成」→「Pages」→「Git に接続」で、手順2のリポジトリを選ぶ
2. **プロジェクト名＝店ID**（例：`shop-a`）。フレームワーク「なし」、ビルドコマンド空欄、出力ディレクトリ空欄（または `/`）
3. 作成後、プロジェクトの「設定」で次を追加する
   - 「バインディング」→「KV 名前空間」：変数名 `PHOTOS`、名前空間 `kuruma-photos`
   - 「変数とシークレット」：`FIREBASE_PROJECT_ID` ＝ Firebase のプロジェクトID、`ADMIN_UIDS` ＝ 手順1-3のUID
4. 「デプロイ」タブから最新のデプロイを「再試行」して、設定を反映させる

公開URLは `https://<プロジェクト名>.pages.dev` になり、その名前がそのまま店IDとして使われます。希望の名前が使えず `shop-a-3xk.pages.dev` のようになった場合は、`js/config.js` の `SHOP_ALIASES` に `{ "shop-a-3xk": "shop-a" }` と書きます。

コードを修正して push すると、すべての店のサイトに自動で反映されます。

### 5. Firebase に店のドメインを許可する

Firebase の Authentication → 設定 →「承認済みドメイン」に `<店ID>.pages.dev` を追加します（店を増やすたびに追加。ワイルドカード不可）。

## 店舗を追加する手順（1店ごと）

1. Cloudflare Pages に店のプロジェクトを作る（上の手順4。KV とKV名・環境変数も同じものを設定）
2. Firebase の承認済みドメインに `<店ID>.pages.dev` を追加
3. Authentication で店の担当者用アカウントを作成（メールアドレス＋仮パスワード）し、UIDを控える
4. 制作者のアカウントで `https://<店ID>.pages.dev/admin/settings.html` を開き、店舗情報・古物商許可・担当者UIDを入力して「店舗を作成する」
5. 初回の在庫を登録（または店に登録してもらう）
6. 店の担当者に管理画面URL `https://<店ID>.pages.dev/admin/` と仮パスワードを伝え、ログイン後に「パスワードを忘れた場合」から再設定してもらう。スマホのホーム画面に追加してもらうと便利です

## アクセスが増えたとき（バズったとき）

**いちばん簡単なのは Cloudflare の有料プラン（Workers Paid、月5ドル）への切り替えです。** コードの変更は不要で、上限が月1,000万回に増え、超えても止まらずに少額の従量課金になります。

Firebase Storage に移したい場合は、次の手順で切り替えられます。

1. Firebase を Blaze プランにし、Storage を作成（無料枠の対象は `us-central1` など米国リージョン）
2. Storage の「ルール」に `storage.rules` を貼り、`ADMIN_UID` を置き換えて公開
3. `js/config.js` の `PHOTO_BACKEND` を `"firebase"` に変えて push

切り替え後に登録した写真から Firebase に保存されます。それまでの写真は Cloudflare からそのまま表示され続けます（車両データに写真のURLを保存しているため）。

Firestore の読み取り上限（5万回／日）が心配になった場合も、Blaze プランにすれば止まらなくなります。

## X に載せるデモURL

デモ専用の Pages プロジェクト（例：`kuruma-demo`）を作り、次のURLを紹介に使います。Firebase 設定済みでも `?demo` を付ければサンプルデータで動きます（写真のアップロードもブラウザ内だけで完結します）。

- 公開サイト：`https://kuruma-demo.pages.dev/?demo`
- 管理画面：`https://kuruma-demo.pages.dev/admin/?demo`

## 運用メモ

- 公開サイトに出るのは「掲載中・商談中・売約済」。「下書き」は出ません
- 売れた車は削除せず「売約済」にすると、在庫が動いている店に見えます。古い売約済は時々削除してください
- 車両の削除時は写真も削除されます。登録途中でやめた場合の写真は残ることがあります（容量はわずか）
- 支払総額表示・古物商許可・特定商取引法の表示内容は、店の責任で正確に入力してもらう前提です
- ローカル（`python3 -m http.server`）では写真のアップロードは動きません（Pages Functions が動かないため）。デモモードか、Cloudflare に公開した状態で確認してください
