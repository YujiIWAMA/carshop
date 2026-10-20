# 車屋向け 在庫更新型ホームページ

中古車販売店向けの自社ホームページです。店の担当者がスマホの管理画面から、在庫の追加・価格変更・売約済みの切り替えをできます。1つのコードで複数店舗を運用します。

- 公開サイト：トップ／在庫一覧（絞り込み）、車両詳細、特定商取引法に基づく表記
- 管理画面（`/admin/`）：ログイン、在庫一覧と状態切り替え、車両の登録・編集（写真10枚、自動縮小）、店舗情報の設定
- 構成：静的HTML＋JavaScript（ビルド不要）／Firebase（Authentication・Firestore・Storage）／Cloudflare Pages

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
js/config.js                           ★導入時に書き換える設定
js/store.js                            データの読み書き（Firebase版とデモ版）
firestore.rules / storage.rules        ★セキュリティルール（コンソールに貼る）
_headers / robots.txt                  Cloudflare Pages 用
```

## データの持ち方

| 場所 | 内容 | 読める人 | 書ける人 |
| --- | --- | --- | --- |
| `shops/{店ID}` | 店舗情報、`owners`（編集できるUIDの配列） | 誰でも | 制作者、担当者（owners以外） |
| `shops/{店ID}/data/inventory` | `cars` 配列に在庫すべて | 誰でも | 制作者、担当者 |
| Storage `shops/{店ID}/cars/{車ID}/…jpg` | 写真（長辺1600px＋一覧用480px） | 誰でも | 制作者、担当者 |

在庫を1つのドキュメントにまとめているので、お客様の閲覧1回あたりの読み取りは2回（店舗情報＋在庫）で済みます。

## 導入手順（最初の1回）

### 1. Firebase プロジェクト

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. 料金プランを **Blaze（従量課金）** に変更（写真の保存に必要。2026年2月以降、無料プランでは Storage が使えません）
3. Google Cloud の「予算とアラート」で、月500円などの予算アラートを設定（アラートは通知のみで、利用は止まりません）

### 2. Authentication

1. Authentication →「始める」→ ログイン方法で「メール / パスワード」を有効にする
2. 「ユーザー」タブで制作者（あなた）のアカウントを追加し、表示される **UID** を控える
3. 設定 →「承認済みドメイン」に、各店のドメイン（例：`shop-a.pages.dev`）を追加する（ワイルドカード不可。店を増やすたびに追加）

### 3. Firestore と Storage

1. Firestore Database を作成（ロケーション：`asia-northeast1`（東京）、本番環境モード）
2. 「ルール」タブに `firestore.rules` の内容を貼り、`ADMIN_UID` を手順2のUIDに置き換えて公開
3. Storage を開始（ロケーションは Firestore と同じ）
4. 「ルール」タブに `storage.rules` の内容を貼り、`ADMIN_UID` を置き換えて公開

### 4. 設定ファイル

1. プロジェクトの設定 →「マイアプリ」→ ウェブアプリ（`</>`）を追加
2. 表示された `firebaseConfig` の値を `js/config.js` に貼る
3. `js/config.js` の `ADMIN_UIDS` に手順2のUIDを入れる

### 5. GitHub と Cloudflare Pages

1. このフォルダを GitHub の非公開リポジトリに push
2. Cloudflare →「Workers & Pages」→「作成」→「Pages」→ GitHub のリポジトリを接続
3. **プロジェクト名＝店ID**（例：`shop-a`）。フレームワーク「なし」、ビルドコマンド空欄、出力ディレクトリ `/`
4. 店ごとに、同じリポジトリから Pages プロジェクトをもう1つ作る（`shop-b`、`shop-c`…）

公開URLは `https://<プロジェクト名>.pages.dev` になり、その名前がそのまま店IDとして使われます。希望の名前が使えず `shop-a-3xk.pages.dev` のようになった場合は、`js/config.js` の `SHOP_ALIASES` に `{ "shop-a-3xk": "shop-a" }` と書きます。

コードを修正して push すると、すべての店のサイトに自動で反映されます。

## 店舗を追加する手順（1店ごと）

1. Cloudflare Pages に店のプロジェクトを作る（上の手順5-4）
2. Firebase の承認済みドメインに `<店ID>.pages.dev` を追加
3. Authentication で店の担当者用アカウントを作成（メールアドレス＋仮パスワード）し、UIDを控える
4. 制作者のアカウントで `https://<店ID>.pages.dev/admin/settings.html` を開き、店舗情報・古物商許可・担当者UIDを入力して「店舗を作成する」
5. 初回の在庫を登録（または店に登録してもらう）
6. 店の担当者に管理画面URL `https://<店ID>.pages.dev/admin/` と仮パスワードを伝え、ログイン後に「パスワードを忘れた場合」から再設定してもらう。スマホのホーム画面に追加してもらうと便利です

## X に載せるデモURL

デモ専用の Pages プロジェクト（例：`kuruma-demo`）を作り、次のURLを紹介に使います。Firebase 設定済みでも `?demo` を付ければサンプルデータで動きます。

- 公開サイト：`https://kuruma-demo.pages.dev/?demo`
- 管理画面：`https://kuruma-demo.pages.dev/admin/?demo`

## 運用メモ

- 公開サイトに出るのは「掲載中・商談中・売約済」。「下書き」は出ません
- 売れた車は削除せず「売約済」にすると、在庫が動いている店に見えます。古い売約済は時々削除してください
- 車両の削除時は写真も削除されます。登録途中でやめた場合の写真は Storage に残ることがあります（容量はわずか）
- 支払総額表示・古物商許可・特定商取引法の表示内容は、店の責任で正確に入力してもらう前提です
