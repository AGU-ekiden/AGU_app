export interface BloodTestItemDef {
  key: string;
  unit: string;
  refMale?: [number, number];
  refFemale?: [number, number];
  memo: string;
  femaleOnly?: boolean;
}

export interface BloodTestCategory {
  category: string;
  items: BloodTestItemDef[];
}

export const BLOOD_TEST_CATEGORIES: BloodTestCategory[] = [
  {
    category: "貧血関連項目",
    items: [
      { key: "フェリチン(Ferritin)", unit: "ng/ml", refMale: [9.0, 275], refFemale: [4.0, 80], memo: "体内の貯蔵鉄の量。低いと隠れ貧血（鉄欠乏）で、持久力低下・疲労の原因になる。" },
      { key: "Hb（ヘモグロビン量）", unit: "g/dl", refMale: [13.5, 17.5], refFemale: [11.5, 15.0], memo: "血色素量(HGB)／血液が酸素を運ぶ力。低いと貧血で息切れ・持久力低下。" },
      { key: "ヘマトクリット値（Hematocrit）", unit: "%", refMale: [39.7, 52.4], refFemale: [34.8, 45.0], memo: "脱水含む／血液中の赤血球の割合。低いと貧血、高いと脱水傾向。" },
      { key: "Fe（血清鉄）", unit: "μg/dl", refMale: [50, 200], refFemale: [40, 180], memo: "朝と夕の採血で値が変わる／血液中を流れている鉄の量。日内変動が大きい。" },
      { key: "UIBC(不飽和鉄結合能)", unit: "μg/dl", refMale: [104, 259], refFemale: [108, 325], memo: "まだ鉄と結合できる余力。鉄が不足すると高くなる。" },
      { key: "TIBC(総鉄結合能)", unit: "μg/dl", refMale: [270, 425], refFemale: [270, 440], memo: "Fe+UIBC／鉄を運ぶ能力の総量。鉄欠乏で高くなる。" },
      { key: "TSAT(トランスフェリン飽和度)", unit: "%", refMale: [20, 30], refFemale: [20, 30], memo: "Fe/TIBC／鉄の充足度。低いと鉄欠乏、貯蔵鉄の目安になる。" },
      { key: "MCV（平均赤血球容積）", unit: "fl", refMale: [85, 102], refFemale: [85, 102], memo: "赤血球1個の大きさ。小さいと鉄欠乏性貧血、大きいとビタミン不足を疑う。" },
      { key: "MCH（平均赤血球色素量）", unit: "pg", refMale: [28, 34], refFemale: [28, 34], memo: "赤血球1個に含まれる色素の量。貧血のタイプ判別に使う。" },
      { key: "MCHC（平均赤血球血色素濃度）", unit: "%", refMale: [30.2, 35.1], refFemale: [30.2, 35.1], memo: "赤血球の色素の濃さ。貧血のタイプ判別に使う。" },
      { key: "網赤血球数", unit: "‰", refMale: [4, 19], refFemale: [4, 19], memo: "貧血回復時に高値になる／新しく作られた赤血球。造血の勢いを示す。" },
    ],
  },
  {
    category: "疲労感関連項目",
    items: [
      { key: "CK（クレアチンキナーゼ）", unit: "IU/l", refMale: [60, 270], refFemale: [40, 150], memo: "(CPK)筋疲労／筋肉の壊れ具合。激しい運動・筋損傷で上昇する。" },
      { key: "BUN（尿素窒素）", unit: "mg/dl", refMale: [8.0, 20.0], refFemale: [8.0, 20.0], memo: "脱水・過剰タンパク食／タンパク代謝・腎機能・脱水の指標。" },
      { key: "コルチゾール(Cortisol)", unit: "μg/dl", refMale: [3.7, 19.4], refFemale: [3.7, 19.4], memo: "ストレスホルモン(オーバートレーニング) 早朝安静時／ストレスや過労で変動する。" },
      { key: "GOT/AST", unit: "IU/l", refMale: [10, 40], refFemale: [10, 40], memo: "筋疲労／筋肉・肝臓の状態。激しい運動で上昇する。" },
    ],
  },
  {
    category: "脱水関連項目",
    items: [
      { key: "Cr（クレアチニン）", unit: "mg/dl", refMale: [0.61, 1.04], refFemale: [0.47, 0.79], memo: "Cr/体重で0.0を超えると筋肉量の増加 脱水を含む／腎機能・筋肉量の指標。" },
      { key: "K（カリウム）", unit: "mEq/l", refMale: [3.5, 5.0], refFemale: [3.5, 5.0], memo: "筋肉・神経の働きに関わる電解質。発汗・脱水で変動する。" },
      { key: "Na（血清ナトリウム）", unit: "mEq/l", refMale: [137, 147], refFemale: [137, 147], memo: "体内の水分・塩分バランス。脱水・熱中症の指標。" },
      { key: "Cl（血清クロール）", unit: "mEq/l", refMale: [98, 108], refFemale: [98, 108], memo: "水分・電解質バランスの指標。脱水で変動する。" },
      { key: "尿酸", unit: "", refMale: [3.0, 7.0], refFemale: [3.0, 7.0], memo: "プリン体の代謝産物。脱水や激しい運動で上昇する。" },
    ],
  },
  {
    category: "疲労骨折関連項目",
    items: [
      { key: "ALP（アルカリホスファターゼ）", unit: "IU/l", refMale: [100, 325], refFemale: [100, 325], memo: "骨をつくる働きの活発さ（骨代謝）。成長期は高めになる。" },
      { key: "Ca(血清カルシウム)", unit: "mEq/l", refMale: [8.4, 10.4], refFemale: [8.4, 10.4], memo: "骨・筋肉・神経に関わるカルシウム。骨の健康の指標。" },
    ],
  },
  {
    category: "その他項目",
    items: [
      { key: "LD（乳酸脱水素酵素）", unit: "U/l", refMale: [120, 240], refFemale: [120, 240], memo: "細胞や赤血球が壊れると上昇（溶血・組織の障害）。" },
      { key: "総蛋白", unit: "g/dl", refMale: [6.7, 8.3], refFemale: [6.7, 8.3], memo: "エネルギー不足、糖新生／栄養状態の指標。低いとタンパク不足。" },
      { key: "テストステロン", unit: "pg/ml", refMale: [8.8, 31.7], refFemale: [1.5, 4.9], memo: "オーバートレーニング症候群の早期発見／低いと過労・回復不足のサイン。" },
      { key: "亜鉛", unit: "μg/dl", refMale: [80, 130], refFemale: [80, 130], memo: "貧血関与／免疫・味覚・造血に関わるミネラル。不足で貧血・免疫低下。" },
      { key: "ビタミンD", unit: "", refMale: [30, Infinity], refFemale: [30, Infinity], memo: "怪我のリスク、回復、免疫 30未満→不足、20未満→欠乏／不足でけがリスク増。" },
      { key: "白血球数", unit: "×100/μL", refMale: [40, 80], refFemale: [40, 80], memo: "感染・炎症・免疫の状態を示す。" },
      { key: "赤血球数", unit: "", refMale: [430, 570], refFemale: [430, 570], memo: "酸素を運ぶ赤血球の数。貧血の指標。" },
      { key: "血小板数", unit: "万/μL", refMale: [12, 40], refFemale: [12, 40], memo: "止血に関わる細胞。" },
      { key: "Neutro", unit: "%", refMale: [42, 73], refFemale: [42, 73], memo: "好中球／細菌感染で増える白血球。" },
      { key: "Baso", unit: "%", refMale: [0, 2], refFemale: [0, 2], memo: "好塩基球／アレルギーに関与する白血球。" },
      { key: "Eosino", unit: "%", refMale: [0, 6], refFemale: [0, 6], memo: "好酸球／アレルギー・寄生虫で増える白血球。" },
      { key: "Lympho", unit: "%", refMale: [18, 59], refFemale: [18, 59], memo: "リンパ球／ウイルス感染・免疫に関与する白血球。" },
      { key: "Mono", unit: "%", refMale: [0, 8], refFemale: [0, 8], memo: "単球／炎症・異物処理に関与する白血球。" },
    ],
  },
  {
    category: "女子選手ホルモン項目",
    items: [
      { key: "E2（エストラジオール）", unit: "pg/ml", memo: "女性ホルモン。低いと無月経・骨密度低下（疲労骨折）につながる（女性アスリートの三主徴）。周期の時期により基準値が変動するため自動判定は行いません。", femaleOnly: true },
      { key: "FSH（卵胞刺激ホルモン）", unit: "mIU/ml", memo: "脳から卵巣への指令ホルモン。月経周期・排卵の状態を示す。周期の時期により基準値が変動するため自動判定は行いません。", femaleOnly: true },
      { key: "LH（黄体形成ホルモン）", unit: "mIU/ml", memo: "排卵を促すホルモン。月経周期・排卵の状態を示す。周期の時期により基準値が変動するため自動判定は行いません。", femaleOnly: true },
    ],
  },
];

export const ALL_BLOOD_TEST_ITEMS: BloodTestItemDef[] = BLOOD_TEST_CATEGORIES.flatMap((c) => c.items);

export function getBloodTestItem(key: string): BloodTestItemDef | undefined {
  return ALL_BLOOD_TEST_ITEMS.find((i) => i.key === key);
}

export function getReferenceRange(item: BloodTestItemDef, gender?: string): [number, number] | undefined {
  if (gender === "女子") return item.refFemale;
  if (gender === "男子") return item.refMale;
  return item.refMale ?? item.refFemale;
}
