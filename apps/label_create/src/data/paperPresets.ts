import type { PaperPreset } from "../types";

/** Built-in paper presets.
 *
 *  The two "commercial" presets below use the label sizes that are the de
 *  facto standard across Japanese label-sheet makers (A-one / Kokuyo / Nana
 *  etc. all sell equivalent products at these dimensions), but exact margins
 *  can differ slightly between manufacturers and printers. Always run a test
 *  print on plain paper and hold it up against your actual label sheet
 *  before printing a full batch — use the offset adjustment in the toolbar
 *  to compensate for any drift.
 *
 *  To add a new preset (e.g. a specific product you've measured), just push
 *  another object onto this array; it will show up in the picker
 *  automatically. */
export const PAPER_PRESETS: PaperPreset[] = [
  {
    id: "custom",
    name: "カスタム(自由入力)",
    category: "custom-builtin",
    note: "お使いの用紙のサイズを正確に入力してください。最も確実な方法です。",
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 70,
    labelHeightMm: 29.7,
    columns: 3,
    rows: 8,
    marginTopMm: 8.5,
    marginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: "jp-12-91x42_3",
    name: "宛名ラベル 12面 (91×42.3mm)",
    category: "commercial",
    note: "A4・2列×6行。国内の主要ラベルメーカーで広く共通する定番サイズです。購入した用紙の実寸に応じて微調整してください。",
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 91,
    labelHeightMm: 42.3,
    columns: 2,
    rows: 6,
    marginTopMm: 13.5,
    marginLeftMm: 14,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: "jp-24-70x29_7",
    name: "宛名ラベル 24面 (70×29.7mm)",
    category: "commercial",
    note: "A4・3列×8行。もっとも一般的な宛名ラベルサイズのひとつです。購入した用紙の実寸に応じて微調整してください。",
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 70,
    labelHeightMm: 29.7,
    columns: 3,
    rows: 8,
    marginTopMm: 8.5,
    marginLeftMm: 0,
    gapXMm: 0,
    gapYMm: 0,
  },
  {
    id: "jp-44-48x25_4",
    name: "宛名ラベル 44面 (48.3×25.4mm)",
    category: "commercial",
    note: "A4・4列×11行。小さめの宛名・分類ラベル向け。購入した用紙の実寸に応じて微調整してください。",
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 48.3,
    labelHeightMm: 25.4,
    columns: 4,
    rows: 11,
    marginTopMm: 8.5,
    marginLeftMm: 8.5,
    gapXMm: 2.5,
    gapYMm: 0,
  },
  {
    id: "gg-rl-a4-10-w1",
    name: "宛名ラベル 10面 (86.4×50.8mm) [G&G RL-A4-10-W1]",
    category: "commercial",
    note: "A4・2列×5行。G&G「宛名ラベル・食品表示ラベル」RL-A4-10-W1のパッケージ記載値(上余白21mm/下余白22mm、左右余白18.6mm、間隔なし)。実測して微調整してください。",
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 86.4,
    labelHeightMm: 50.8,
    columns: 2,
    rows: 5,
    marginTopMm: 21,
    marginLeftMm: 18.6,
    gapXMm: 0,
    gapYMm: 0,
  },
];

export const DEFAULT_PRESET_ID = "gg-rl-a4-10-w1";
