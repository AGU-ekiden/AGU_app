import React from 'react'
import { Coffee, UtensilsCrossed, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, Badge, Button, Input, Select } from './ui/index.jsx'
import { weekdayOf, WEEKDAY_JA, formatNumber, cn } from '../lib/utils.js'

// 月間食数一覧表（縦軸=名前、横軸=日付）。編集可能。
// 各セルは上段=朝食／下段=夕食の小さなボタンで、クリックで◯/×を切り替える。
export default function MonthlyMealMatrix({
  dorm,
  otherDorm,
  year,
  month,
  days,
  memberRows,
  guestRows,
  guestCategories,
  onToggleMember,
  onToggleGuest,
  onAddGuest,
  onUpdateGuestField,
  onRemoveGuest,
}) {
  const rows = [...memberRows, ...guestRows]

  const columnTotals = days.map((d, idx) => {
    let breakfast = 0
    let dinner = 0
    for (const row of rows) {
      if (row.cells[idx].breakfast) breakfast += 1
      if (row.cells[idx].dinner) dinner += 1
    }
    return { day: d, breakfast, dinner }
  })
  const grandBreakfast = rows.reduce((a, r) => a + r.totalBreakfast, 0)
  const grandDinner = rows.reduce((a, r) => a + r.totalDinner, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default" className="gap-1">
          <Coffee className="h-3.5 w-3.5" /> 月間朝食 {formatNumber(grandBreakfast)}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <UtensilsCrossed className="h-3.5 w-3.5" /> 月間夕食{' '}
          {formatNumber(grandDinner)}
        </Badge>
        <Badge variant="secondary">{rows.length}名</Badge>
        <Button size="sm" variant="secondary" onClick={onAddGuest} className="ml-auto">
          <Plus className="h-3.5 w-3.5" />
          寮外生等を追加
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 w-[190px] overflow-hidden border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">
                    氏名
                  </th>
                  {days.map((d) => {
                    const dow = weekdayOf(year, month, d)
                    const weekend = dow === 0 || dow === 6
                    return (
                      <th
                        key={d}
                        className={cn(
                          'sticky top-0 z-10 w-9 border-b border-slate-200 px-0.5 py-1.5 text-center font-medium',
                          weekend
                            ? dow === 0
                              ? 'bg-red-50 text-red-500'
                              : 'bg-[#eaf5f4] text-[#3e8a88]'
                            : 'bg-slate-50 text-slate-500'
                        )}
                      >
                        <div>{d}</div>
                        <div className="text-[9px]">{WEEKDAY_JA[dow]}</div>
                      </th>
                    )
                  })}
                  <th className="sticky top-0 right-0 z-20 min-w-[64px] border-b border-l border-slate-200 bg-slate-50 px-2 py-2 text-right font-medium text-slate-500">
                    合計
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 && (
                  <TotalsRow label="日別合計" columnTotals={columnTotals} grandBreakfast={grandBreakfast} grandDinner={grandDinner} />
                )}
                {memberRows.map((row, idx) => (
                  <tr
                    key={row.memberId}
                    className={cn(
                      'hover:bg-slate-50/60',
                      row.isCrossDorm ? 'bg-amber-50/40' : idx % 2 === 1 && 'bg-slate-50/30'
                    )}
                  >
                    <td
                      className={cn(
                        'sticky left-0 z-10 w-[190px] overflow-hidden border-r border-slate-200 px-3 py-1.5 font-medium text-slate-800',
                        row.isCrossDorm ? 'bg-amber-50' : idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                      )}
                    >
                      <div className="truncate">{row.name}</div>
                      {row.isCrossDorm && (
                        <div className="text-[10px] font-normal text-amber-600">
                          {otherDorm}所属
                        </div>
                      )}
                    </td>
                    {row.cells.map((cell) => (
                      <MealCell
                        key={cell.date}
                        cell={cell}
                        year={year}
                        month={month}
                        onToggle={(field) => onToggleMember(row.memberId, cell.date, field)}
                      />
                    ))}
                    <TotalCell row={row} idx={idx} tint={row.isCrossDorm ? 'bg-amber-50' : undefined} />
                  </tr>
                ))}

                {guestRows.length > 0 && (
                  <tr>
                    <td
                      colSpan={days.length + 2}
                      className="sticky left-0 border-b border-t border-slate-200 bg-[#eaf5f4]/60 px-3 py-1 text-[11px] font-semibold text-[#2c6462]"
                    >
                      寮生以外
                    </td>
                  </tr>
                )}
                {guestRows.map((row, idx) => (
                  <tr key={row.uid} className="bg-[#eaf5f4]/30 hover:bg-[#eaf5f4]/60">
                    <td className="sticky left-0 z-10 w-[190px] overflow-hidden border-r border-slate-200 bg-[#eaf5f4]/40 px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <Select
                          value={row.category}
                          onChange={(e) => onUpdateGuestField(row.uid, 'category', e.target.value)}
                          className="h-6 w-16 shrink-0 px-1 text-[10px]"
                        >
                          {guestCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </Select>
                        <Input
                          value={row.name}
                          placeholder="氏名"
                          onChange={(e) => onUpdateGuestField(row.uid, 'name', e.target.value)}
                          className="h-6 min-w-0 flex-1 px-1.5 text-[10px]"
                        />
                        <button
                          onClick={() => onRemoveGuest(row.uid)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-destructive"
                          aria-label="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    {row.cells.map((cell) => (
                      <MealCell
                        key={cell.date}
                        cell={cell}
                        year={year}
                        month={month}
                        onToggle={(field) => onToggleGuest(row.uid, cell.date, field)}
                      />
                    ))}
                    <TotalCell row={row} idx={idx} />
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={days.length + 2}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      該当するメンバーがいません
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <TotalsRow label="日別合計" columnTotals={columnTotals} grandBreakfast={grandBreakfast} grandDinner={grandDinner} footer />
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-5 rounded-sm bg-[#3e8a88]" /> 朝食（上段）
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-5 rounded-sm bg-emerald-500" /> 夕食（下段）
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-5 rounded-sm bg-slate-200" /> 食べていない
        </span>
        <span>セルをクリックすると◯/×を切り替えられます</span>
      </div>
    </div>
  )
}

// 朝食・夕食を上下2段のボタンで表示し、クリックで切り替えるセル
function MealCell({ cell, year, month, onToggle }) {
  const dow = weekdayOf(year, month, cell.day)
  const weekend = dow === 0 || dow === 6
  return (
    <td className={cn('px-0.5 py-1 text-center', weekend && 'bg-slate-50/60')}>
      <div className="mx-auto flex w-fit flex-col items-center gap-0.5">
        <button
          type="button"
          title={`${cell.day}日 朝食: クリックで切替`}
          onClick={() => onToggle('breakfast')}
          className={cn(
            'h-3.5 w-6 rounded-sm transition-colors hover:ring-1 hover:ring-[#2c6462]',
            cell.breakfast ? 'bg-[#3e8a88]' : 'bg-slate-200'
          )}
        />
        <button
          type="button"
          title={`${cell.day}日 夕食: クリックで切替`}
          onClick={() => onToggle('dinner')}
          className={cn(
            'h-3.5 w-6 rounded-sm transition-colors hover:ring-1 hover:ring-emerald-700',
            cell.dinner ? 'bg-emerald-500' : 'bg-slate-200'
          )}
        />
      </div>
    </td>
  )
}

function TotalCell({ row, idx, tint }) {
  return (
    <td
      className={cn(
        'sticky right-0 z-10 border-l border-slate-200 px-2 py-1.5 text-right tabular-nums',
        tint || (idx % 2 === 1 ? 'bg-slate-50' : 'bg-white')
      )}
    >
      <span className="font-semibold text-[#2c6462]">{row.totalBreakfast}</span>
      <span className="text-slate-300">/</span>
      <span className="font-semibold text-emerald-600">{row.totalDinner}</span>
    </td>
  )
}

function TotalsRow({ label, columnTotals, grandBreakfast, grandDinner, footer }) {
  return (
    <tr className={cn('bg-slate-100 font-semibold', footer ? 'border-t' : 'border-b', 'border-slate-200')}>
      <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-700">
        {label}
      </td>
      {columnTotals.map((c) => (
        <td key={c.day} className="px-0.5 py-1 text-center">
          <div className="mx-auto flex w-fit flex-col items-center gap-0.5 text-[9px] leading-tight">
            <span className="text-[#2c6462]">{c.breakfast}</span>
            <span className="text-emerald-600">{c.dinner}</span>
          </div>
        </td>
      ))}
      <td className="sticky right-0 z-10 border-l border-slate-200 bg-slate-100 px-2 py-1.5 text-right">
        <span className="text-[#2c6462]">{grandBreakfast}</span>
        <span className="text-slate-300">/</span>
        <span className="text-emerald-600">{grandDinner}</span>
      </td>
    </tr>
  )
}
