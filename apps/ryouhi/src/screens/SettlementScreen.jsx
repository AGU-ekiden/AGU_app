import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  FileDown,
  FileSpreadsheet,
  Loader2,
  TrendingUp,
  Users,
  Wallet,
  ChevronDown,
  ChevronRight,
  Trophy,
  Tent,
  Tag,
  CalendarRange,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { GROUPS, MEAL_TRACKING_DORMS, MOTIVATION_FEE_PER_UNIT } from '../lib/constants.js'
import {
  Button,
  Card,
  CardContent,
  Select,
  Badge,
  Checkbox,
  Skeleton,
} from '../components/ui/index.jsx'
import { formatYen, formatYearMonthJa, formatYearMonthRangeJa, toYearMonth, cn } from '../lib/utils.js'
import {
  buildSettlementRows,
  mergeSettlementRows,
  groupSettlementRows,
  sumTotals,
  mealPriceFor,
  buildItemColumns,
  itemColumnValue,
} from '../lib/calc.js'
import { generateGroupPdf, generateSummaryPdf } from '../lib/pdf.js'
import CollectionSheet from '../components/CollectionSheet.jsx'
import SummarySheet from '../components/SummarySheet.jsx'

// 「対象月を追加」で選べる候補（現在選択中の月より前の6ヶ月分）
function precedingMonths(year, month, count) {
  const list = []
  let y = year
  let m = month
  for (let i = 0; i < count; i++) {
    m -= 1
    if (m === 0) {
      m = 12
      y -= 1
    }
    list.push({ year: y, month: m })
  }
  return list
}

// 画面D：清算一覧・集金用PDF出力
export default function SettlementScreen() {
  const {
    members,
    expenses,
    tournamentItems,
    campItems,
    otherItems,
    mealLogs,
    config,
    year,
    month,
    yearMonth,
    loading,
    showToast,
    fetchMonthData,
  } = useApp()
  const [filterGroup, setFilterGroup] = useState('all')
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const sheetsRef = useRef(null)
  const summaryRef = useRef(null)

  // 「7月精算し損ねて9月に7〜9月まとめて請求」のような複数月合算用。
  // 現在選択中の月(グローバルの年月セレクタ)は常に含み、それ以外に
  // 追加でまとめたい月をここでチェックする。
  const [extraMonths, setExtraMonths] = useState([])
  const [extraData, setExtraData] = useState({})
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  const monthCandidates = useMemo(() => precedingMonths(year, month, 6), [year, month])

  // 選択中の月が変わったら、追加の月選択はリセットする
  useEffect(() => {
    setExtraMonths([])
    setExtraData({})
    setShowMonthPicker(false)
  }, [yearMonth])

  const toggleExtraMonth = (ym) => {
    setExtraMonths((prev) => {
      const exists = prev.some((m) => m.year === ym.year && m.month === ym.month)
      return exists
        ? prev.filter((m) => !(m.year === ym.year && m.month === ym.month))
        : [...prev, ym]
    })
  }

  useEffect(() => {
    if (extraMonths.length === 0) {
      setExtraData({})
      return
    }
    let cancelled = false
    setLoadingExtra(true)
    Promise.all(extraMonths.map((m) => fetchMonthData(m.year, m.month)))
      .then((results) => {
        if (cancelled) return
        const next = {}
        extraMonths.forEach((m, i) => {
          next[toYearMonth(m.year, m.month)] = results[i]
        })
        setExtraData(next)
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) showToast('他の月のデータ取得に失敗しました', 'error')
      })
      .finally(() => {
        if (!cancelled) setLoadingExtra(false)
      })
    return () => {
      cancelled = true
    }
  }, [extraMonths, fetchMonthData, showToast])

  // 現在の月 + 追加で選んだ月を、年月順に並べたもの
  const combinedMonths = useMemo(() => {
    const list = [{ year, month }, ...extraMonths]
    return list.slice().sort((a, b) => a.year - b.year || a.month - b.month)
  }, [year, month, extraMonths])
  const isCombined = combinedMonths.length > 1
  const periodLabel = isCombined ? formatYearMonthRangeJa(combinedMonths) : null

  const rows = useMemo(() => {
    const currentRows = buildSettlementRows({
      members,
      expenses,
      tournamentItems,
      campItems,
      otherItems,
      mealLogs,
      config,
      yearMonth,
    })
    if (!isCombined) return currentRows

    const monthlyRowSets = combinedMonths.map((m) => {
      const ym = toYearMonth(m.year, m.month)
      if (ym === yearMonth) {
        return { label: `${m.month}月`, rows: currentRows }
      }
      const data = extraData[ym]
      if (!data) return { label: `${m.month}月`, rows: [] }
      return {
        label: `${m.month}月`,
        rows: buildSettlementRows({
          members,
          expenses: data.expenses || [],
          tournamentItems: data.tournamentItems || [],
          campItems: data.campItems || [],
          otherItems: data.otherItems || [],
          mealLogs: data.mealLogs || [],
          config: data.config || config,
          yearMonth: ym,
        }),
      }
    })
    return mergeSettlementRows(monthlyRowSets)
  }, [
    isCombined,
    combinedMonths,
    members,
    expenses,
    tournamentItems,
    campItems,
    otherItems,
    mealLogs,
    config,
    yearMonth,
    extraData,
  ])

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const grouped = useMemo(
    () => groupSettlementRows(rows, GROUPS),
    [rows]
  )

  const displayRows =
    filterGroup === 'all'
      ? rows
      : rows.filter((r) => r.group === filterGroup)

  // 大会・合宿・その他費用は、表示中の行で実際に使われた項目名がそのまま列見出しになる
  const dynamicCols = useMemo(
    () => buildItemColumns(displayRows),
    [displayRows]
  )
  const detailColSpan = 11 + dynamicCols.length

  const grandTotal = sumTotals(rows)
  const avg = rows.length ? Math.round(grandTotal / rows.length) : 0

  const handleDownloadPdf = async () => {
    setGenerating(true)
    try {
      // 少し待ってオフスクリーン描画を確実に反映
      await new Promise((r) => setTimeout(r, 50))
      const container = sheetsRef.current
      const pages = Array.from(container.querySelectorAll('[data-pdf-page]'))
      if (pages.length === 0) {
        showToast('出力対象のデータがありません', 'error')
        return
      }
      await generateGroupPdf(
        pages,
        `集金一覧_${periodLabel || formatYearMonthJa(year, month)}.pdf`
      )
      showToast('PDFをダウンロードしました')
    } catch (e) {
      console.error(e)
      showToast('PDF生成に失敗しました', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // 全選手一覧PDF（A4横・全データ）
  const handleDownloadSummaryPdf = async () => {
    setGeneratingSummary(true)
    try {
      await new Promise((r) => setTimeout(r, 50))
      const container = summaryRef.current
      const pages = Array.from(container.querySelectorAll('[data-pdf-page]'))
      if (pages.length === 0) {
        showToast('出力対象のデータがありません', 'error')
        return
      }
      await generateSummaryPdf(
        pages,
        `全選手一覧_${periodLabel || formatYearMonthJa(year, month)}.pdf`
      )
      showToast('全選手一覧PDFをダウンロードしました')
    } catch (e) {
      console.error(e)
      showToast('PDF生成に失敗しました', 'error')
    } finally {
      setGeneratingSummary(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Users}
          label="対象人数"
          value={`${rows.length}名`}
          tone="blue"
        />
        <SummaryCard
          icon={Wallet}
          label="請求合計"
          value={formatYen(grandTotal)}
          tone="green"
        />
        <SummaryCard
          icon={TrendingUp}
          label="1人あたり平均"
          value={formatYen(avg)}
          tone="violet"
        />
      </div>

      {/* 複数月まとめて精算 */}
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={isCombined ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setShowMonthPicker((v) => !v)}
          >
            <CalendarRange className="h-4 w-4" />
            {isCombined ? `対象月: ${periodLabel}` : '対象月を追加してまとめて精算'}
          </Button>
          {loadingExtra && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              他の月のデータを取得中...
            </span>
          )}
          {isCombined && !loadingExtra && (
            <button
              onClick={() => setExtraMonths([])}
              className="text-xs text-slate-400 underline hover:text-slate-600"
            >
              選択を解除
            </button>
          )}
        </div>

        {showMonthPicker && (
          <div className="absolute z-10 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {formatYearMonthJa(year, month)}に加えて、まとめて請求する月を選択
              </span>
              <button
                onClick={() => setShowMonthPicker(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {monthCandidates.map((m) => {
                const checked = extraMonths.some(
                  (e) => e.year === m.year && e.month === m.month
                )
                return (
                  <button
                    key={`${m.year}-${m.month}`}
                    onClick={() => toggleExtraMonth(m)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                    )}
                  >
                    <Checkbox checked={checked} onChange={() => toggleExtraMonth(m)} />
                    {formatYearMonthJa(m.year, m.month)}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              選んだ月の食費・経費・部費をこの月の分と合算して、1つのPDFにまとめます。
            </p>
          </div>
        )}
      </div>

      {/* ツールバー */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="w-36"
          >
            <option value="all">全グループ</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <Badge variant="secondary">{displayRows.length}名</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleDownloadSummaryPdf}
            disabled={generatingSummary || rows.length === 0 || loadingExtra}
          >
            {generatingSummary ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {generatingSummary ? '生成中...' : '全選手一覧PDF（横）'}
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={generating || rows.length === 0 || loadingExtra}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {generating ? 'PDF生成中...' : '集金用PDF（グループ別）'}
          </Button>
        </div>
      </div>

      {/* グループごとの合計バッジ */}
      <div className="flex flex-wrap gap-2">
        {grouped.map((g) => (
          <div
            key={g.group}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
          >
            <span className="font-medium text-slate-700">{g.group}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{g.rows.length}名</span>
            <span className="font-semibold tabular-nums text-primary">
              {formatYen(sumTotals(g.rows))}
            </span>
          </div>
        ))}
      </div>

      {/* 清算一覧テーブル */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="w-8 px-2 py-2.5"></th>
                  <th className="px-3 py-2.5 text-left">氏名</th>
                  <th className="px-3 py-2.5 text-left">グループ</th>
                  <th className="px-3 py-2.5 text-left">ランク</th>
                  <th className="px-3 py-2.5 text-right">部費</th>
                  <th className="px-3 py-2.5 text-right">食費</th>
                  {dynamicCols.map((col) => (
                    <th key={col.key} className="px-3 py-2.5 text-right">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right">治療費</th>
                  <th className="px-3 py-2.5 text-right">治療費補助</th>
                  <th className="px-3 py-2.5 text-right">モチベーション費補助</th>
                  <th className="px-3 py-2.5 text-right">配達代</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-700">
                    合計請求額
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r, i) => {
                  const hasDetail =
                    r.tournamentRows.length > 0 ||
                    r.campRows.length > 0 ||
                    r.otherRows.length > 0
                  const isOpen = expanded.has(r.memberId)
                  return (
                    <React.Fragment key={r.memberId}>
                      <tr
                        className={cn(
                          'border-b border-slate-100 hover:bg-slate-50/60',
                          i % 2 === 1 && 'bg-slate-50/30',
                          isOpen && 'bg-[#eaf5f4]/40'
                        )}
                      >
                        <td className="px-2 py-2">
                          {hasDetail ? (
                            <button
                              onClick={() => toggleExpand(r.memberId)}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                              aria-label="内訳を開閉"
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {r.name}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{r.group}</td>
                        <td className="px-3 py-2 text-slate-500">{r.rank}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatYen(r.clubFee)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span>{formatYen(r.mealFee)}</span>
                          <span className="ml-1 text-[11px] text-slate-400">
                            (朝{r.breakfastCount}/夕{r.dinnerCount})
                          </span>
                        </td>
                        {dynamicCols.map((col) => {
                          const v = itemColumnValue(r, col)
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                'px-3 py-2 text-right tabular-nums',
                                col.isSubsidy ? 'text-red-600' : 'text-slate-600'
                              )}
                            >
                              {v === null || v === 0
                                ? '—'
                                : col.isSubsidy
                                ? `−${formatYen(v)}`
                                : formatYen(v)}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {r.medicalActual ? formatYen(r.medicalActual) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-600">
                          {r.medicalSubsidy > 0
                            ? `−${formatYen(r.medicalSubsidy)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-600">
                          {r.motivation > 0 ? `−${formatYen(r.motivation)}` : '—'}
                          {r.motivationCount > 0 && (
                            <span className="ml-1 text-[11px] text-slate-400">
                              ({r.motivationCount}回)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {r.sagawa ? formatYen(r.sagawa) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-primary">
                          {formatYen(r.total)}
                        </td>
                      </tr>
                      {isOpen && hasDetail && (
                        <tr className="border-b border-slate-200 bg-slate-50/70">
                          <td colSpan={detailColSpan} className="px-4 py-3">
                            <BreakdownDetail row={r} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {displayRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={detailColSpan}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      対象データがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        合計請求額 = 部費 + 大会費(各: 参加費−補助) + 合宿費(各: 単価×泊数) +
        (治療費実費−補助金) − モチベーション費補助(回数×
        {formatYen(MOTIVATION_FEE_PER_UNIT)}) + 配達代 +
        その他費用(各項目の合計) +
        食費(実際に食べた寮ごとに 朝食数×朝食単価 + 夕食数×夕食単価。
        {MEAL_TRACKING_DORMS.map((dorm, i) => (
          <span key={dorm}>
            {i > 0 && '、'}
            {dorm}: 朝{formatYen(mealPriceFor(config, dorm, 'breakfast'))}・夕
            {formatYen(mealPriceFor(config, dorm, 'dinner'))}
          </span>
        ))}
        )
        ／ ▶ をクリックすると大会・合宿・その他費用の明細を確認できます。
      </p>

      {/* PDF描画用オフスクリーン要素（グループごと1ページ） */}
      <div className="pdf-offscreen" ref={sheetsRef} aria-hidden>
        {grouped.map((g) => (
          <div key={g.group} data-pdf-page>
            <CollectionSheet
              group={g.group}
              rows={g.rows}
              year={year}
              month={month}
              config={config}
              periodLabel={periodLabel}
            />
          </div>
        ))}
      </div>

      {/* PDF描画用オフスクリーン要素（全選手一覧・A4横） */}
      <div className="pdf-offscreen" ref={summaryRef} aria-hidden>
        <SummarySheet
          rows={rows}
          groups={GROUPS}
          year={year}
          month={month}
          config={config}
          periodLabel={periodLabel}
        />
      </div>
    </div>
  )
}

// 大会・合宿の明細（画面D 展開時）
function BreakdownDetail({ row }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 大会明細 */}
      {row.tournamentRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Trophy className="h-4 w-4 text-amber-500" />
            大会明細
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400">
                <th className="py-1 text-left">大会名</th>
                <th className="py-1 text-right">参加費</th>
                <th className="py-1 text-right">補助</th>
                <th className="py-1 text-right">請求額</th>
              </tr>
            </thead>
            <tbody>
              {row.tournamentRows.map((t, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="py-1 font-medium text-slate-700">{t.name}</td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {formatYen(t.fee)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    −{formatYen(t.subsidy)}
                  </td>
                  <td className="py-1 text-right font-semibold tabular-nums text-primary">
                    {formatYen(t.net)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 font-semibold">
                <td className="py-1 text-slate-600">小計</td>
                <td className="py-1 text-right tabular-nums text-slate-400">
                  {formatYen(row.tournamentGross)}
                </td>
                <td className="py-1 text-right tabular-nums text-slate-400">
                  −{formatYen(row.tournamentSubsidy)}
                </td>
                <td className="py-1 text-right tabular-nums text-primary">
                  {formatYen(row.tournament)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 合宿明細 */}
      {row.campRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Tent className="h-4 w-4 text-emerald-500" />
            合宿明細
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400">
                <th className="py-1 text-left">合宿名</th>
                <th className="py-1 text-right">1泊単価</th>
                <th className="py-1 text-right">泊数</th>
                <th className="py-1 text-right">費用</th>
              </tr>
            </thead>
            <tbody>
              {row.campRows.map((c, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="py-1 font-medium text-slate-700">{c.name}</td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {formatYen(c.perNight)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {c.nights}泊
                  </td>
                  <td className="py-1 text-right font-semibold tabular-nums text-emerald-600">
                    {formatYen(c.cost)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 font-semibold">
                <td className="py-1 text-slate-600" colSpan={3}>
                  小計
                </td>
                <td className="py-1 text-right tabular-nums text-emerald-600">
                  {formatYen(row.camp)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* その他費用明細 */}
      {row.otherRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Tag className="h-4 w-4 text-[#3e8a88]" />
            その他費用明細
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400">
                <th className="py-1 text-left">項目名</th>
                <th className="py-1 text-right">金額</th>
                <th className="py-1 text-right">補助</th>
                <th className="py-1 text-right">請求額</th>
              </tr>
            </thead>
            <tbody>
              {row.otherRows.map((o, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="py-1 font-medium text-slate-700">{o.name}</td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {formatYen(o.amount)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    −{formatYen(o.subsidy)}
                  </td>
                  <td className="py-1 text-right font-semibold tabular-nums text-[#2c6462]">
                    {formatYen(o.net)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 font-semibold">
                <td className="py-1 text-slate-600">小計</td>
                <td className="py-1 text-right tabular-nums text-slate-400">
                  {formatYen(row.otherGross)}
                </td>
                <td className="py-1 text-right tabular-nums text-slate-400">
                  −{formatYen(row.otherSubsidy)}
                </td>
                <td className="py-1 text-right tabular-nums text-[#2c6462]">
                  {formatYen(row.other)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: 'bg-[#eaf5f4] text-[#2c6462]',
    green: 'bg-green-50 text-green-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg',
            tones[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold tabular-nums text-slate-900">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
