import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Save,
  X,
  Home,
  Wand2,
  Printer,
  Loader2,
  ArrowRightLeft,
  Undo2,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import * as api from '../lib/api.js'
import {
  GUEST_CATEGORIES,
  STANDARD_MEAL_SCHEDULE,
  MEAL_TRACKING_DORMS,
  GROUP_BY_DORM,
  mealDormOf,
} from '../lib/constants.js'
import {
  Button,
  Select,
  Checkbox,
  Modal,
  Skeleton,
} from '../components/ui/index.jsx'
import {
  daysInMonth,
  toDateStr,
  weekdayOf,
  formatYearMonthJa,
  uid,
} from '../lib/utils.js'
import MonthlyMealMatrix from '../components/MonthlyMealMatrix.jsx'
import MealListSheet from '../components/MealListSheet.jsx'
import { buildMonthlyMealMatrix, buildMemberMonthlyRows } from '../lib/mealMatrix.js'
import { generateMealListPdf } from '../lib/pdf.js'

// 画面B：月間一覧表（名前×日付）による食数管理（寮ごと）
// dorm: '1寮' | '2寮' — その寮の食数を管理
// guestCategories: この寮で記録を許可する「寮生以外」の種別
//   （2寮には高校生が泊まらないため見学高校生は対象外にできる）
export default function MealLogsScreen({ dorm, guestCategories = GUEST_CATEGORIES }) {
  const {
    year,
    month,
    yearMonth,
    members,
    mealLogs,
    guestMeals,
    dormTransfers,
    loading,
    saveMealLogs,
    saveMonthlyMealData,
    saveMembers,
    registerDormTransfer,
    undoDormTransfer,
    dismissDormTransfer,
    removeDormTransferMember,
    showToast,
    setUnsaved,
  } = useApp()

  const today = new Date()
  const defaultDay =
    year === today.getFullYear() && month === today.getMonth() + 1
      ? today.getDate()
      : 1

  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false)
  const [applyingSchedule, setApplyingSchedule] = useState(false)
  const [generatingList, setGeneratingList] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [transferDay, setTransferDay] = useState(defaultDay)
  const [transferSelected, setTransferSelected] = useState(() => new Set())
  const [processingTransferId, setProcessingTransferId] = useState(null)
  const [processingMemberKey, setProcessingMemberKey] = useState(null)
  const mealListRef = useRef(null)

  // 月間編集ドラフト: member_id -> date -> { breakfast, dinner }
  const [monthDraft, setMonthDraft] = useState({})
  // 寮生以外（見学高校生・寮外生・寮管）の月間ドラフト:
  // [{ uid, category, school, name, cellsByDate: { date: {breakfast, dinner} } }]
  const [guestRowsDraft, setGuestRowsDraft] = useState([])
  // 寮生以外は「日付ごとの総入れ替え」というAPI仕様のため、変更のあった
  // 日付だけを集めておき、保存時にその日付分だけ個別に送信する
  const dirtyGuestDatesRef = useRef(new Set())

  const totalDays = daysInMonth(year, month)
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays])

  const activeMembers = useMemo(() => members.filter((m) => m.active), [members])

  // もう一方の食数管理対象寮（1寮なら2寮、2寮なら1寮）。
  // 寮間移動でこの寮に来て食べることがあるため、名前を挙げてチェックできるようにする
  const otherDorm = MEAL_TRACKING_DORMS.find((d) => d !== dorm) || ''

  // この寮 + otherDorm に所属する在籍メンバー（月間一覧表の対象者）
  const memberPopulation = useMemo(
    () =>
      activeMembers.filter(
        (m) => mealDormOf(m) === dorm || (otherDorm && mealDormOf(m) === otherDorm)
      ),
    [activeMembers, dorm, otherDorm]
  )

  const otherDormMembers = useMemo(
    () => activeMembers.filter((m) => mealDormOf(m) === otherDorm),
    [activeMembers, otherDorm]
  )

  // 集金グループを自動設定できるか（1寮には対応する集金グループが無いため、
  // 1寮への移動時は手動確認が必要になる旨をダイアログで案内する）
  const transferGroupAutoSet = !!GROUP_BY_DORM[dorm]

  // 標準スケジュール一括反映の対象（この寮で食事をする人）
  const schedulePopulation = useMemo(
    () => activeMembers.filter((m) => mealDormOf(m) === dorm),
    [activeMembers, dorm]
  )

  // 既に何らかの記録（朝食・夕食いずれかにチェック）がある「日付×メンバー」の組み合わせ。
  // まだ保存していないローカルの編集内容も含めて判定する（未保存の変更を
  // 一括反映が上書きしてしまわないようにするため）。
  const existingLogKeys = useMemo(() => {
    const set = new Set()
    for (const [memberId, dayMap] of Object.entries(monthDraft)) {
      for (const [date, v] of Object.entries(dayMap)) {
        if (v.breakfast || v.dinner) set.add(`${date}__${memberId}`)
      }
    }
    return set
  }, [monthDraft])

  // 火〜土曜=朝夕、日曜=朝のみ、月曜=提供なし の標準スケジュールのうち、
  // まだ記録の無い「日付×メンバー」だけを対象にした一覧（安全のため上書きしない）
  const pendingScheduleLogs = useMemo(() => {
    const logs = []
    for (const m of schedulePopulation) {
      for (let d = 1; d <= totalDays; d++) {
        const date = toDateStr(year, month, d)
        if (existingLogKeys.has(`${date}__${m.id}`)) continue
        const dow = weekdayOf(year, month, d)
        const sched = STANDARD_MEAL_SCHEDULE[dow]
        if (!sched.breakfast && !sched.dinner) continue
        logs.push({ date, member_id: m.id, breakfast: sched.breakfast, dinner: sched.dinner })
      }
    }
    return logs
  }, [schedulePopulation, existingLogKeys, totalDays, year, month])

  // 未入力の日付×メンバーにだけ標準スケジュールをローカルドラフトへ一括反映する
  const applyStandardSchedule = () => {
    if (pendingScheduleLogs.length === 0) {
      setShowScheduleConfirm(false)
      return
    }
    setApplyingSchedule(true)
    setMonthDraft((prev) => {
      const next = { ...prev }
      for (const l of pendingScheduleLogs) {
        const key = String(l.member_id)
        next[key] = { ...(next[key] || {}), [l.date]: { breakfast: l.breakfast, dinner: l.dinner } }
      }
      return next
    })
    setDirty(true)
    setApplyingSchedule(false)
    setShowScheduleConfirm(false)
  }

  // 食堂掲示用PDFの元データ（保存済みデータから生成。この寮の対象者全員）
  const printMatrix = useMemo(
    () => buildMonthlyMealMatrix({ members, mealLogs, guestMeals, dorm, year, month }),
    [members, mealLogs, guestMeals, dorm, year, month]
  )

  const handleDownloadMealListPdf = async () => {
    setGeneratingList(true)
    try {
      await new Promise((r) => setTimeout(r, 50))
      const container = mealListRef.current
      const pages = Array.from(container.querySelectorAll('[data-pdf-page]'))
      if (pages.length === 0) {
        showToast('出力対象のデータがありません', 'error')
        return
      }
      await generateMealListPdf(pages, `${dorm}_食数一覧表_${formatYearMonthJa(year, month)}.pdf`)
      showToast('食堂掲示用PDFをダウンロードしました')
    } catch (e) {
      console.error(e)
      showToast('PDF生成に失敗しました', 'error')
    } finally {
      setGeneratingList(false)
    }
  }

  // 寮間移動の登録・取り消しは mealLogs を書き換えるため、月間ドラフトが
  // 保存済みデータから再構築される（未保存の編集内容は失われる）。それより
  // 前に、保留中の変更があれば静かに保存しておく。
  const flushIfDirty = async () => {
    if (!dirty) return
    const { memberLogs, guestsByDate } = buildSavePayload()
    await saveMonthlyMealData(dorm, memberLogs, guestsByDate, { silent: true })
    dirtyGuestDatesRef.current = new Set()
    setDirty(false)
  }

  const toggleTransferMember = (id) => {
    setTransferSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 寮間移動を登録: 選んだ選手の寮生マスターをこの寮に切り替え、
  // 移動日から月末までこの寮の標準スケジュールを未入力の日にだけ一括反映する
  const applyDormTransfer = async () => {
    if (transferSelected.size === 0) return
    setTransferring(true)
    try {
      await flushIfDirty()
      const selectedIds = new Set(transferSelected)
      const previousMembers = members
        .filter((m) => selectedIds.has(m.id))
        .map((m) => ({ id: m.id, dorm: m.dorm, group: m.group }))
      const memberNames = previousMembers
        .map((pm) => members.find((m) => m.id === pm.id)?.name)
        .filter(Boolean)

      const updatedMembers = members.map((m) => {
        if (!selectedIds.has(m.id)) return m
        return { ...m, dorm, group: GROUP_BY_DORM[dorm] || '' }
      })
      await saveMembers(updatedMembers)

      const transferLogs = []
      for (const id of selectedIds) {
        for (let d = transferDay; d <= totalDays; d++) {
          const date = toDateStr(year, month, d)
          if (existingLogKeys.has(`${date}__${id}`)) continue
          const sched = STANDARD_MEAL_SCHEDULE[weekdayOf(year, month, d)]
          if (!sched.breakfast && !sched.dinner) continue
          transferLogs.push({ date, member_id: id, dorm, breakfast: sched.breakfast, dinner: sched.dinner })
        }
      }
      if (transferLogs.length > 0) {
        await saveMealLogs(transferLogs, [], null, dorm, { silent: true })
      }
      await registerDormTransfer({
        dorm,
        memberNames,
        previousMembers,
        createdLogs: transferLogs.map((l) => ({ date: l.date, member_id: l.member_id, dorm })),
      })
      showToast(`${selectedIds.size}名を${dorm}へ移動登録しました`)
      setShowTransferDialog(false)
      setTransferSelected(new Set())
    } catch (e) {
      console.error(e)
      showToast('寮間移動の登録に失敗しました', 'error')
    } finally {
      setTransferring(false)
    }
  }

  const pendingTransfers = dormTransfers.filter((t) => t.dorm === dorm)

  const handleUndoTransfer = async (record) => {
    setProcessingTransferId(record.id)
    try {
      await flushIfDirty()
      await undoDormTransfer(record)
    } catch (e) {
      // 失敗時のトーストは context 側で表示済み
    } finally {
      setProcessingTransferId(null)
    }
  }

  const handleDismissTransfer = async (record) => {
    setProcessingTransferId(record.id)
    try {
      await dismissDormTransfer(record)
    } catch (e) {
      console.error(e)
      showToast('通知の削除に失敗しました', 'error')
    } finally {
      setProcessingTransferId(null)
    }
  }

  const handleRemoveMember = async (record, memberId) => {
    const key = `${record.id}__${memberId}`
    setProcessingMemberKey(key)
    try {
      await flushIfDirty()
      await removeDormTransferMember(record, memberId)
    } catch (e) {
      // 失敗時のトーストは context 側で表示済み
    } finally {
      setProcessingMemberKey(null)
    }
  }

  // ---- 月間ドラフトの初期化 & 月切り替え時の自動保存 ----
  const prevYearMonthRef = useRef(null)
  // 常に最新の dirty / 保存ペイロード組み立て関数を参照するための ref
  // （このコンポーネント内の複数の effect から、定義順に関係なく最新の
  // ものを読めるようにするため）
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty

  // タブ切り替え・月変更・ログアウト前に確認ダイアログを出せるよう、
  // 未保存の変更の有無をAppContextへ同期する。
  // このタブ内には自動保存もあるが、保存前の状態のまま画面を切り替えた
  // 場合（未入力セルしかない寮外生行など）に、切り替え先へ移ってから
  // 気づいて操作を続けてしまい、結果的にドラフトが失われることがある。
  // ここで一度確認を挟むことで、その場で「一括保存」を押し直す機会を作る。
  useEffect(() => {
    setUnsaved(dirty)
    return () => setUnsaved(false)
  }, [dirty, setUnsaved])

  const buildSavePayload = () => {
    const memberLogs = []
    for (const m of memberPopulation) {
      const dayMap = monthDraft[String(m.id)] || {}
      for (const d of days) {
        const date = toDateStr(year, month, d)
        const v = dayMap[date] || { breakfast: false, dinner: false }
        memberLogs.push({ date, member_id: m.id, dorm, breakfast: !!v.breakfast, dinner: !!v.dinner })
      }
    }
    const guestsByDate = {}
    for (const date of dirtyGuestDatesRef.current) {
      guestsByDate[date] = guestRowsDraft
        .filter((g) => (g.name || '').trim() !== '' || (g.school || '').trim() !== '')
        .map((g) => ({
          category: g.category || '見学高校生',
          school: (g.school || '').trim(),
          name: (g.name || '').trim(),
          breakfast: !!(g.cellsByDate[date] || {}).breakfast,
          dinner: !!(g.cellsByDate[date] || {}).dinner,
        }))
    }
    return { memberLogs, guestsByDate }
  }

  const buildSavePayloadRef = useRef(buildSavePayload)
  buildSavePayloadRef.current = buildSavePayload

  useEffect(() => {
    const prevYearMonth = prevYearMonthRef.current
    const isSwitch = prevYearMonth && prevYearMonth !== yearMonth

    if (isSwitch && dirtyRef.current) {
      const { memberLogs, guestsByDate } = buildSavePayloadRef.current()
      saveMonthlyMealData(dorm, memberLogs, guestsByDate, { silent: true })
        .then(() => showToast('前の月の入力を自動保存しました'))
        .catch((e) => {
          console.error(e)
          showToast('前の月の自動保存に失敗しました。入力内容をご確認ください', 'error')
        })
    }

    // メンバー（+寮間移動者）分の初期化
    const map = {}
    for (const m of memberPopulation) {
      map[String(m.id)] = {}
    }
    for (const log of mealLogs) {
      if ((log.dorm || '') !== dorm) continue
      if (!map[String(log.member_id)]) continue
      map[String(log.member_id)][log.date] = { breakfast: !!log.breakfast, dinner: !!log.dinner }
    }
    setMonthDraft(map)

    // 寮生以外の初期化（種別＋学校名＋氏名を同一人物とみなしてグループ化）
    setGuestRowsDraft(buildInitialGuestRows(guestMeals, dorm))

    dirtyGuestDatesRef.current = new Set()
    setDirty(false)
    prevYearMonthRef.current = yearMonth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealLogs, guestMeals, yearMonth, dorm])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { memberLogs, guestsByDate } = buildSavePayload()
      await saveMonthlyMealData(dorm, memberLogs, guestsByDate)
      dirtyGuestDatesRef.current = new Set()
      setDirty(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // 画面タブの切り替えでこの画面がアンマウントされるときに、
  // 未保存の変更があれば自動保存する
  const autoSaveRef = useRef(null)
  autoSaveRef.current = { dirty, dorm, yearMonth, buildSavePayload, saveMonthlyMealData }
  useEffect(() => {
    return () => {
      const s = autoSaveRef.current
      if (!s || !s.dirty) return
      const { memberLogs, guestsByDate } = s.buildSavePayload()
      s.saveMonthlyMealData(s.dorm, memberLogs, guestsByDate, { silent: true }).catch((e) =>
        console.error('画面離脱時の自動保存に失敗しました', e)
      )
    }
  }, [])

  // ブラウザタブを閉じる／リロードするときは、通常の非同期保存が完走する
  // 保証がないため sendBeacon でベストエフォート保存する（メンバー食数分のみ。
  // 寮生以外は複数日付にまたがるとbeaconでは表現しきれないため対象外）
  useEffect(() => {
    const handleUnload = () => {
      const s = autoSaveRef.current
      if (!s || !s.dirty) return
      const { memberLogs } = s.buildSavePayload()
      api.saveMealLogsBeacon(s.yearMonth, memberLogs, [], null, s.dorm)
    }
    window.addEventListener('pagehide', handleUnload)
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('pagehide', handleUnload)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  // ---- 月間一覧表への表示用データ（ドラフトを反映した状態） ----
  const memberRowsForMatrix = useMemo(() => {
    const flatLogs = []
    for (const [memberId, dayMap] of Object.entries(monthDraft)) {
      for (const [date, v] of Object.entries(dayMap)) {
        if (v.breakfast || v.dinner) {
          flatLogs.push({ date, member_id: memberId, dorm, breakfast: v.breakfast, dinner: v.dinner })
        }
      }
    }
    return buildMemberMonthlyRows({ members, mealLogs: flatLogs, dorm, otherDorm, year, month }).rows
  }, [monthDraft, members, dorm, otherDorm, year, month])

  const guestRowsForMatrix = useMemo(
    () =>
      guestRowsDraft.map((g) => {
        let totalBreakfast = 0
        let totalDinner = 0
        const cells = days.map((d) => {
          const date = toDateStr(year, month, d)
          const v = g.cellsByDate[date] || { breakfast: false, dinner: false }
          if (v.breakfast) totalBreakfast += 1
          if (v.dinner) totalDinner += 1
          return { day: d, date, breakfast: v.breakfast, dinner: v.dinner }
        })
        return { uid: g.uid, category: g.category, school: g.school, name: g.name, cells, totalBreakfast, totalDinner }
      }),
    [guestRowsDraft, days, year, month]
  )

  // ---- セル編集ハンドラ ----
  const toggleMemberCell = (memberId, date, field) => {
    setMonthDraft((prev) => {
      const key = String(memberId)
      const dayMap = { ...(prev[key] || {}) }
      const cur = dayMap[date] || { breakfast: false, dinner: false }
      dayMap[date] = { ...cur, [field]: !cur[field] }
      return { ...prev, [key]: dayMap }
    })
    setDirty(true)
  }

  const toggleGuestCell = (rowUid, date, field) => {
    setGuestRowsDraft((prev) =>
      prev.map((g) => {
        if (g.uid !== rowUid) return g
        const cur = g.cellsByDate[date] || { breakfast: false, dinner: false }
        return { ...g, cellsByDate: { ...g.cellsByDate, [date]: { ...cur, [field]: !cur[field] } } }
      })
    )
    dirtyGuestDatesRef.current.add(date)
    setDirty(true)
  }

  const addGuestRow = () => {
    setGuestRowsDraft((prev) => [
      ...prev,
      { uid: uid(), category: guestCategories[0] || '見学高校生', school: '', name: '', cellsByDate: {} },
    ])
    setDirty(true)
  }

  const markRowDatesDirty = (row) => {
    for (const [d, c] of Object.entries(row.cellsByDate)) {
      if (c.breakfast || c.dinner) dirtyGuestDatesRef.current.add(d)
    }
  }

  const updateGuestField = (rowUid, field, value) => {
    setGuestRowsDraft((prev) =>
      prev.map((g) => {
        if (g.uid !== rowUid) return g
        // 種別・氏名の変更は別人物への切り替えとして扱うため、この行が
        // これまでに記録を持つ全日付を再送信対象に含める（保存時、旧名義
        // 側はこの行の内容に含まれなくなるため自動的に削除される）
        markRowDatesDirty(g)
        return { ...g, [field]: value }
      })
    )
    setDirty(true)
  }

  const removeGuestRow = (rowUid) => {
    setGuestRowsDraft((prev) => {
      const target = prev.find((g) => g.uid === rowUid)
      if (target) markRowDatesDirty(target)
      return prev.filter((g) => g.uid !== rowUid)
    })
    setDirty(true)
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      {/* 寮バナー */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
        <Home className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">{dorm} の食数管理</span>
        <span className="text-xs text-muted-foreground">
          （{dorm}・{otherDorm}所属の在籍者と寮生以外の食数を、月間一覧表で直接編集できます）
        </span>
      </div>

      {/* 操作バー */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} disabled={saving || !dirty}>
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : dirty ? '一括保存（未保存の変更あり）' : '一括保存'}
          </Button>
          <Button variant="secondary" onClick={handleDownloadMealListPdf} disabled={generatingList}>
            {generatingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {generatingList ? '生成中...' : '食堂掲示用PDF出力'}
          </Button>
          <Button variant="secondary" onClick={() => setShowScheduleConfirm(true)}>
            <Wand2 className="h-4 w-4" />
            標準スケジュールを一括反映
          </Button>
          {otherDorm && (
            <Button
              variant="secondary"
              onClick={() => {
                setTransferDay(defaultDay)
                setTransferSelected(new Set())
                setShowTransferDialog(true)
              }}
            >
              <ArrowRightLeft className="h-4 w-4" />
              寮間移動を登録
            </Button>
          )}
        </div>
      </div>

      {pendingTransfers.length > 0 && (
        <div className="space-y-2">
          {pendingTransfers.map((t) => {
            const processing = processingTransferId === t.id
            return (
              <div key={t.id} className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
                <div className="text-amber-800">
                  {t.dorm}への移動登録（{formatTransferTimestamp(t.createdAt)}）。
                  誤って含めてしまった選手がいれば、名前の×から個別に取り消せます。
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.memberNames.map((name, i) => {
                    const pm = t.previousMembers[i]
                    const memberKey = `${t.id}__${pm?.id}`
                    const memberProcessing = processingMemberKey === memberKey
                    return (
                      <span
                        key={pm?.id ?? i}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white py-1 pl-2.5 pr-1.5 text-xs text-amber-800"
                      >
                        {name}
                        <button
                          onClick={() => pm && handleRemoveMember(t, pm.id)}
                          disabled={memberProcessing || processing || !pm}
                          title={`${name}さんだけ取り消す`}
                          aria-label={`${name}さんだけ取り消す`}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-amber-500 hover:bg-amber-100 hover:text-amber-700 disabled:opacity-40"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleDismissTransfer(t)} disabled={processing}>
                    了解（通知を消す）
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleUndoTransfer(t)} disabled={processing}>
                    <Undo2 className="h-4 w-4" />
                    {processing ? '処理中...' : '全員まとめて取り消す'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showTransferDialog && (
        <Modal
          open
          onClose={() => setShowTransferDialog(false)}
          title={`寮間移動を登録（${otherDorm} → ${dorm}）`}
          maxWidth="max-w-lg"
          footer={
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{transferSelected.size}名</span> を選択中
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowTransferDialog(false)} disabled={transferring}>
                  キャンセル
                </Button>
                <Button onClick={applyDormTransfer} disabled={transferring || transferSelected.size === 0}>
                  {transferring ? '登録中...' : `${transferSelected.size}名を${dorm}へ移動する`}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">
              {otherDorm}に所属する選手を選ぶと、寮生マスターの「寮」を{dorm}
              に切り替え、移動日から月末まで{dorm}の標準スケジュール（火〜土:
              朝夕、日:朝のみ）を<strong>まだ記録の無い日にだけ</strong>
              一括反映します。
            </p>
            {!transferGroupAutoSet && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {dorm}には対応する集金グループが無いため、集金グループは「未選択」に
                リセットされます（寮生マスターに赤字で表示されるので、3階・2階の
                いずれかを選び直してください）。
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">移動日</label>
              <Select value={transferDay} onChange={(e) => setTransferDay(Number(e.target.value))} className="w-28">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}日
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                対象の選手（{otherDorm}所属）
              </label>
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {otherDormMembers.map((m) => {
                  const on = transferSelected.has(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleTransferMember(m.id)}
                      className={
                        'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors ' +
                        (on ? 'border-primary/30 bg-primary/5' : 'border-slate-200 bg-white hover:bg-slate-50')
                      }
                    >
                      <Checkbox checked={on} onChange={() => toggleTransferMember(m.id)} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">{m.name}</span>
                        <span className="block text-[11px] text-slate-400">
                          {m.grade} ・ {m.rank}
                        </span>
                      </span>
                    </button>
                  )
                })}
                {otherDormMembers.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-400">{otherDorm}に選手がいません</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showScheduleConfirm && (
        <Modal
          open
          onClose={() => setShowScheduleConfirm(false)}
          title="標準スケジュールを一括反映"
          maxWidth="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowScheduleConfirm(false)} disabled={applyingSchedule}>
                キャンセル
              </Button>
              <Button onClick={applyStandardSchedule} disabled={applyingSchedule || pendingScheduleLogs.length === 0}>
                {applyingSchedule
                  ? '反映中...'
                  : pendingScheduleLogs.length === 0
                  ? '未入力の日はありません'
                  : `反映する（未入力 ${pendingScheduleLogs.length}件）`}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              {formatYearMonthJa(year, month)}の {dorm}
              （対象 {schedulePopulation.length}名）について、
              <strong>まだ記録の無い日にだけ</strong>
              以下の標準スケジュールを一括で入力します。
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>火曜〜土曜：朝食・夕食あり</li>
              <li>日曜：朝食のみ</li>
              <li>月曜：提供なし</li>
            </ul>
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-primary">
              安全のため、既にチェックが入っている日（未保存の変更を含む）は
              上書きしません。欠席や特別対応を反映済みの日はそのまま残ります。
              反映後は下部の「一括保存」で保存してください。
            </p>
            <p className="text-xs text-slate-400">
              未入力の対象：{pendingScheduleLogs.length}件（{schedulePopulation.length}
              名 ×最大{totalDays}日のうち）
            </p>
          </div>
        </Modal>
      )}

      <p className="text-xs text-muted-foreground">
        表の朝食・夕食セルをクリックしてチェックを切り替え、「一括保存」で保存してください（保存前に別の月へ移動する・画面を離れようとすると確認が表示されます）。
      </p>

      <MonthlyMealMatrix
        dorm={dorm}
        otherDorm={otherDorm}
        year={year}
        month={month}
        days={days}
        memberRows={memberRowsForMatrix}
        guestRows={guestRowsForMatrix}
        onToggleMember={toggleMemberCell}
        onToggleGuest={toggleGuestCell}
        onAddGuest={addGuestRow}
        onUpdateGuestField={updateGuestField}
        onRemoveGuest={removeGuestRow}
      />

      {/* PDF描画用オフスクリーン要素（食堂掲示用 月間食数一覧） */}
      <div className="pdf-offscreen" ref={mealListRef} aria-hidden>
        <MealListSheet dorm={dorm} year={year} month={month} days={printMatrix.days} rows={printMatrix.rows} />
      </div>
    </div>
  )
}

// guestMeals（保存済み）から、種別＋学校名＋氏名を単位にグループ化した
// 編集用の初期ドラフト行を組み立てる
function buildInitialGuestRows(guestMeals, dorm) {
  const map = new Map()
  for (const g of guestMeals) {
    if ((g.dorm || '') !== dorm) continue
    const category = g.category || '見学高校生'
    const school = g.school || ''
    const name = g.name || ''
    if (!school && !name) continue
    const key = `${category}__${school}__${name}`
    if (!map.has(key)) {
      map.set(key, { uid: uid(), category, school, name, cellsByDate: {} })
    }
    map.get(key).cellsByDate[g.date] = { breakfast: !!g.breakfast, dinner: !!g.dinner }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category, 'ja')
    const an = a.name || a.school
    const bn = b.name || b.school
    return an.localeCompare(bn, 'ja')
  })
}

// 寮間移動の登録日時（ISO文字列）を「7/24 15:03」のような短い表記にする
function formatTransferTimestamp(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
