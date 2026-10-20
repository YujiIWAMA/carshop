// デモ用のサンプルデータ（見た目確認用。実在の店舗・在庫ではありません）
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

export const DEMO_SHOP = {
  name: "〇〇モータース",
  nameEn: "USED CAR & SERVICE",
  catch: "わかりやすい価格で、\n地元の中古車選びを。",
  lead: "在庫は毎日更新。気になる一台は、お電話・LINEでお気軽にお問い合わせください。買取・車検・整備もまとめてお任せいただけます。",
  tel: "000-0000-0000",
  lineUrl: "",
  address: "〒000-0000 〇〇県〇〇市〇〇町1-2-3",
  hours: "10:00〜19:00",
  holiday: "毎週水曜日",
  parking: "10台",
  mapQuery: "",
  loanText: "月々のお支払い額のシミュレーションもお気軽にご相談ください。",
  kobutsu: { commission: "〇〇県公安委員会", number: "第000000000000号", holder: "〇〇モータース 〇〇 〇〇" },
  tokusho: { operator: "〇〇モータース", representative: "〇〇 〇〇", email: "info@example.com" },
  accent: "#F2B705",
  owners: []
};

export const DEMO_CARS = [
  {
    id: "c001", maker: "トヨタ", name: "プリウス", grade: "S セーフティプラス", bodyType: "セダン",
    year: 2019, mileage: 42000, shaken: "2027-08", repair: "なし",
    totalPrice: 189.8, basePrice: 176.0,
    displacement: "1,800cc", transmission: "CVT", fuel: "ハイブリッド", color: "ホワイトパール",
    warranty: "3か月・3,000km", stockNo: "A-101",
    equipment: ["ナビ", "バックカメラ", "ETC", "ドライブレコーダー", "スマートキー", "衝突軽減ブレーキ"],
    comment: "ワンオーナー、禁煙車です。\n燃費の良さが魅力の人気グレード。内外装ともにきれいな状態です。",
    status: "onsale", photos: [], createdAt: now - 2 * DAY, updatedAt: now - 2 * DAY
  },
  {
    id: "c002", maker: "ホンダ", name: "N-BOX", grade: "G・L ホンダセンシング", bodyType: "軽自動車",
    year: 2020, mileage: 28000, shaken: "2026-12", repair: "なし",
    totalPrice: 139.5, basePrice: 128.0,
    displacement: "660cc", transmission: "CVT", fuel: "ガソリン", color: "プレミアムサンライトホワイト",
    warranty: "3か月・3,000km", stockNo: "A-102",
    equipment: ["ナビ", "バックカメラ", "ETC", "スマートキー", "衝突軽減ブレーキ", "片側電動スライド"],
    comment: "", status: "onsale", photos: [], createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY
  },
  {
    id: "c003", maker: "スズキ", name: "ジムニー", grade: "XC 4WD", bodyType: "SUV",
    year: 2021, mileage: 15000, shaken: "2027-03", repair: "なし",
    totalPrice: 248.0, basePrice: 235.0,
    displacement: "660cc", transmission: "AT", fuel: "ガソリン", color: "ジャングルグリーン",
    warranty: "6か月・6,000km", stockNo: "A-103",
    equipment: ["ナビ", "ETC", "ドライブレコーダー", "スマートキー", "衝突軽減ブレーキ", "シートヒーター"],
    comment: "", status: "onsale", photos: [], createdAt: now - 20 * DAY, updatedAt: now - 20 * DAY
  },
  {
    id: "c004", maker: "日産", name: "セレナ", grade: "ハイウェイスター Vセレクション", bodyType: "ミニバン",
    year: 2018, mileage: 56000, shaken: "2027-05", repair: "なし",
    totalPrice: 179.0, basePrice: 165.0,
    displacement: "2,000cc", transmission: "CVT", fuel: "ガソリン", color: "ブリリアントホワイトパール",
    warranty: "3か月・3,000km", stockNo: "A-104",
    equipment: ["ナビ", "バックカメラ", "ETC", "スマートキー", "両側電動スライド"],
    comment: "", status: "sold", photos: [], createdAt: now - 30 * DAY, updatedAt: now - 1 * DAY
  },
  {
    id: "c005", maker: "マツダ", name: "CX-5", grade: "XD プロアクティブ", bodyType: "SUV",
    year: 2019, mileage: 39000, shaken: "車検整備付", repair: "なし",
    totalPrice: 229.0, basePrice: 212.0,
    displacement: "2,200cc", transmission: "AT", fuel: "ディーゼル", color: "ソウルレッドクリスタル",
    warranty: "6か月・6,000km", stockNo: "A-105",
    equipment: ["ナビ", "バックカメラ", "ETC", "スマートキー", "衝突軽減ブレーキ", "シートヒーター"],
    comment: "", status: "negotiating", photos: [], createdAt: now - 25 * DAY, updatedAt: now - 3 * DAY
  },
  {
    id: "c006", maker: "ダイハツ", name: "タント", grade: "X SAⅢ", bodyType: "軽自動車",
    year: 2017, mileage: 61000, shaken: "2027-01", repair: "なし",
    totalPrice: 89.8, basePrice: 79.0,
    displacement: "660cc", transmission: "CVT", fuel: "ガソリン", color: "ブラックマイカ",
    warranty: "1か月・1,000km", stockNo: "A-106",
    equipment: ["ナビ", "バックカメラ", "スマートキー", "衝突軽減ブレーキ", "片側電動スライド"],
    comment: "", status: "onsale", photos: [], createdAt: now - 40 * DAY, updatedAt: now - 40 * DAY
  }
];

export const EQUIPMENT_LIST = [
  "ナビ", "バックカメラ", "全方位カメラ", "ETC", "ドライブレコーダー", "スマートキー",
  "衝突軽減ブレーキ", "クルーズコントロール", "シートヒーター", "LEDヘッドライト",
  "両側電動スライド", "片側電動スライド", "サンルーフ", "革シート", "4WD", "禁煙車", "ワンオーナー"
];

export const MAKERS = [
  "トヨタ", "日産", "ホンダ", "マツダ", "スバル", "スズキ", "ダイハツ", "三菱", "レクサス",
  "メルセデス・ベンツ", "BMW", "フォルクスワーゲン", "アウディ", "その他"
];

export const BODY_TYPES = ["軽自動車", "コンパクト", "ミニバン", "SUV", "セダン", "ステーションワゴン", "トラック・商用", "その他"];
