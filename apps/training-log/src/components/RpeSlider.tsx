"use client";

const RPE_LABELS: Record<number, string> = {
  1: "楽",
  2: "楽",
  3: "楽",
  4: "ややきつい",
  5: "ややきつい",
  6: "きつい",
  7: "きつい",
  8: "かなりきつい",
  9: "限界に近い",
  10: "全力",
};

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function RpeSlider({ value, onChange }: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label htmlFor="rpe" className="text-sm font-semibold text-gray-700">
          自覚的運動強度(RPE)
        </label>
        <span className="text-sm font-bold text-green-700">
          {value} <span className="text-xs font-normal text-gray-500">{RPE_LABELS[value]}</span>
        </span>
      </div>
      <input
        id="rpe"
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full bg-gray-200 accent-green-600"
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>1 楽</span>
        <span>10 全力</span>
      </div>
    </div>
  );
}
