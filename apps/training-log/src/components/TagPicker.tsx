"use client";

import { BODY_PART_TAGS } from "@/lib/types";

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export default function TagPicker({ selected, onChange }: Props) {
  function toggle(tag: string) {
    if (tag === "なし") {
      onChange(["なし"]);
      return;
    }
    const withoutNone = selected.filter((t) => t !== "なし");
    if (withoutNone.includes(tag)) {
      onChange(withoutNone.filter((t) => t !== tag));
    } else {
      onChange([...withoutNone, tag]);
    }
  }

  return (
    <div>
      <span className="block text-sm font-semibold text-gray-700 mb-1">疲労部位・違和感</span>
      <div className="flex flex-wrap gap-2">
        {BODY_PART_TAGS.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                active
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
