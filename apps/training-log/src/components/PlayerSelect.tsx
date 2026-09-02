"use client";

import { Player } from "@/lib/types";

interface Props {
  players: Player[];
  selectedId: string;
  onChange: (playerId: string) => void;
}

export default function PlayerSelect({ players, selectedId, onChange }: Props) {
  return (
    <div>
      <label htmlFor="player" className="block text-sm font-semibold text-gray-700 mb-1">
        選手
      </label>
      <select
        id="player"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none"
      >
        <option value="" disabled>
          選択してください
        </option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
