export interface BloodTestItem {
  key: string;
  name: string;
  unit: string;
  refMale?: [number, number];
  refFemale?: [number, number];
  memo?: string;
}

export interface BloodTestCategory {
  label: string;
  items: BloodTestItem[];
}

export const BLOOD_TEST_CATEGORIES: BloodTestCategory[] = [
  {
    label: "貧血関連",
    items: [
      { key: "フェリチン(Ferritin)", name: "フェリチン", unit: "ng/mL", refMale: [20, 200], refFemale: [5, 100], memo: "貯蔵鉄の指標。低値は鉄欠乏状態。" },
      { key: "Hb（ヘモグロビン量）", name: "Hb", unit: "g/dL", refMale: [13.5, 17.0], refFemale: [11.5, 15.0], memo: "酸素運搬タンパク質。スポーツ性貧血の主要指標。" },
      { key: "ヘマトクリット値（Hematocrit）", name: "Ht", unit: "%", refMale: [40, 52], refFemale: [35, 46], memo: "血液中の赤血球容積比。" },
      { key: "Fe（血清鉄）", name: "Fe", unit: "μg/dL", refMale: [70, 180], refFemale: [50, 170], memo: "血清中の鉄量。低値は鉄欠乏性貧血を示唆。" },
      { key: "UIBC(不飽和鉄結合能)", name: "UIBC", unit: "μg/dL", refMale: [150, 300], refFemale: [170, 350], memo: "トランスフェリンの残余鉄結合能。鉄欠乏で高値。" },
      { key: "TIBC(総鉄結合能)", name: "TIBC", unit: "μg/dL", refMale: [250, 400], refFemale: [250, 450], memo: "血清鉄＋UIBC。トランスフェリン量を反映。" },
      { key: "TSAT(トランスフェリン飽和度)", name: "TSAT", unit: "%", refMale: [20, 50], refFemale: [15, 50], memo: "Fe÷TIBC×100。鉄の利用効率を示す。" },
      { key: "MCV（平均赤血球容積）", name: "MCV", unit: "fL", refMale: [85, 100], refFemale: [85, 100], memo: "赤血球の大きさ。低値=小球性（鉄欠乏）。" },
      { key: "MCH（平均赤血球色素量）", name: "MCH", unit: "pg", refMale: [28, 34], refFemale: [28, 34], memo: "赤血球1個当たりのHb量。" },
      { key: "MCHC（平均赤血球血色素濃度）", name: "MCHC", unit: "g/dL", refMale: [32, 36], refFemale: [32, 36], memo: "赤血球内のHb濃度。" },
      { key: "網赤血球数", name: "網赤血球", unit: "‰", refMale: [2, 27], refFemale: [2, 27], memo: "骨髄での赤血球産生能。" },
    ],
  },
  {
    label: "疲労感関連",
    items: [
      { key: "CK（クレアチンキナーゼ）", name: "CK", unit: "U/L", refMale: [50, 300], refFemale: [40, 200], memo: "筋肉の損傷・疲労の指標。" },
      { key: "BUN（尿素窒素）", name: "BUN", unit: "mg/dL", refMale: [8, 22], refFemale: [8, 22], memo: "タンパク異化。過負荷・脱水で上昇。" },
      { key: "コルチゾール(Cortisol)", name: "コルチゾール", unit: "μg/dL", refMale: [4.5, 21.1], refFemale: [4.5, 21.1], memo: "ストレスホルモン。慢性高値はオーバートレーニングのサイン。" },
      { key: "GOT/AST", name: "GOT/AST", unit: "U/L", refMale: [10, 40], refFemale: [10, 35], memo: "肝臓・筋肉の損傷指標。" },
    ],
  },
  {
    label: "脱水関連",
    items: [
      { key: "Cr（クレアチニン）", name: "Cr", unit: "mg/dL", refMale: [0.65, 1.09], refFemale: [0.46, 0.82], memo: "腎機能・筋肉量の指標。脱水で上昇。" },
      { key: "K（カリウム）", name: "K", unit: "mEq/L", refMale: [3.5, 5.0], refFemale: [3.5, 5.0], memo: "電解質。低値はこむら返りに関連。" },
      { key: "Na（血清ナトリウム）", name: "Na", unit: "mEq/L", refMale: [136, 147], refFemale: [136, 147], memo: "体液バランス・浸透圧の主要調節因子。" },
      { key: "Cl（血清クロール）", name: "Cl", unit: "mEq/L", refMale: [98, 108], refFemale: [98, 108], memo: "電解質。酸塩基バランスの評価に使用。" },
      { key: "尿酸", name: "尿酸", unit: "mg/dL", refMale: [3.6, 7.0], refFemale: [2.6, 5.5], memo: "高値は痛風リスク。脱水・運動後に一時上昇。" },
    ],
  },
  {
    label: "疲労骨折関連",
    items: [
      { key: "ALP（アルカリホスファターゼ）", name: "ALP", unit: "U/L", refMale: [40, 130], refFemale: [40, 130], memo: "骨代謝・肝機能の指標。" },
      { key: "Ca(血清カルシウム)", name: "Ca", unit: "mg/dL", refMale: [8.7, 10.2], refFemale: [8.7, 10.2], memo: "骨強度・神経筋機能に関与。" },
    ],
  },
  {
    label: "その他",
    items: [
      { key: "LD（乳酸脱水素酵素）", name: "LD", unit: "U/L", refMale: [120, 245], refFemale: [120, 245], memo: "組織損傷の非特異的指標。" },
      { key: "総蛋白", name: "総蛋白", unit: "g/dL", refMale: [6.6, 8.1], refFemale: [6.6, 8.1], memo: "栄養状態の指標。" },
      { key: "テストステロン", name: "テストステロン", unit: "ng/mL", refMale: [2.0, 9.5], refFemale: [0.05, 0.54], memo: "同化ホルモン。低値は過負荷・栄養不足のサイン。" },
      { key: "亜鉛", name: "亜鉛", unit: "μg/dL", refMale: [80, 130], refFemale: [80, 130], memo: "免疫・代謝酵素・傷の回復に関与。" },
      { key: "ビタミンD", name: "ビタミンD", unit: "ng/mL", refMale: [20, 60], refFemale: [20, 60], memo: "骨代謝・免疫・筋力に関与。" },
      { key: "白血球数", name: "白血球", unit: "/μL", refMale: [3300, 8600], refFemale: [3300, 8600], memo: "免疫機能・炎症の指標。" },
      { key: "赤血球数", name: "赤血球", unit: "×10⁴/μL", refMale: [435, 555], refFemale: [386, 492], memo: "酸素運搬の基本指標。" },
      { key: "血小板数", name: "血小板", unit: "×10⁴/μL", refMale: [15.8, 34.8], refFemale: [15.8, 34.8], memo: "止血・凝固機能の指標。" },
      { key: "Neutro", name: "Neutro", unit: "%", refMale: [40, 70], refFemale: [40, 70], memo: "好中球。細菌感染・炎症で増加。" },
      { key: "Baso", name: "Baso", unit: "%", refMale: [0, 1], refFemale: [0, 1], memo: "好塩基球。" },
      { key: "Eosino", name: "Eosino", unit: "%", refMale: [1, 5], refFemale: [1, 5], memo: "好酸球。アレルギーで増加。" },
      { key: "Lympho", name: "Lympho", unit: "%", refMale: [20, 50], refFemale: [20, 50], memo: "リンパ球。ウイルス感染・免疫応答に関与。" },
      { key: "Mono", name: "Mono", unit: "%", refMale: [3, 8], refFemale: [3, 8], memo: "単球。炎症・感染で増加。" },
    ],
  },
  {
    label: "女子選手ホルモン",
    items: [
      { key: "E2（エストラジオール）", name: "E2", unit: "pg/mL", refMale: [0, 50], refFemale: [30, 200], memo: "卵胞ホルモン。低値はFAD（三主徴）のリスク。" },
      { key: "FSH（卵胞刺激ホルモン）", name: "FSH", unit: "mIU/mL", refMale: [2, 12], refFemale: [3, 14], memo: "卵胞刺激ホルモン。月経周期の評価に使用。" },
      { key: "LH（黄体形成ホルモン）", name: "LH", unit: "mIU/mL", refMale: [2, 12], refFemale: [2, 16], memo: "黄体形成ホルモン。排卵・月経周期の評価に使用。" },
    ],
  },
];

export function getReferenceRange(
  item: BloodTestItem,
  gender?: string
): [number, number] | null {
  if (gender === "女" || gender?.startsWith("F")) {
    return item.refFemale ?? item.refMale ?? null;
  }
  return item.refMale ?? item.refFemale ?? null;
}
