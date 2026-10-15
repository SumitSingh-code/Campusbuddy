'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Trash2, Edit3, Check } from 'lucide-react'
import { api } from '@/lib/api'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface Slot {
  id: string
  day: string
  start_time: string
  end_time: string
  subject: string
  room?: string
  teacher?: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimetablePage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [editSlot, setEditSlot] = useState<Slot | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Form state
  const [day, setDay] = useState('Monday')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [subject, setSubject] = useState('')
  const [room, setRoom] = useState('')
  const [teacher, setTeacher] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSlots() }, [])

  async function loadSlots() {
    setLoading(true)
    try {
      const res = await api.get('/timetable/me')
      setSlots(res.data || [])
    } catch {
      // graceful fallback
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setDay('Monday'); setStartTime('09:00'); setEndTime('10:00')
    setSubject(''); setRoom(''); setTeacher('')
    setEditSlot(null); setAddOpen(true)
  }

  function openEdit(slot: Slot) {
    setDay(slot.day); setStartTime(slot.start_time); setEndTime(slot.end_time)
    setSubject(slot.subject); setRoom(slot.room || ''); setTeacher(slot.teacher || '')
    setEditSlot(slot); setAddOpen(true)
  }

  async function handleSave() {
    if (!subject.trim()) { toast.error('Subject is required'); return }
    setSaving(true)
    try {
      const body = { day, start_time: startTime, end_time: endTime, subject: subject.trim(), room: room.trim() || null, teacher: teacher.trim() || null }
      if (editSlot) {
        const res = await api.patch(`/timetable/${editSlot.id}`, body)
        setSlots(prev => prev.map(s => s.id === editSlot.id ? res.data : s))
        toast.success('Slot updated')
      } else {
        const res = await api.post('/timetable', body)
        setSlots(prev => [...prev, res.data])
        toast.success('Slot added')
      }
      setAddOpen(false)
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await api.delete(`/timetable/${confirmDelete}`)
      setSlots(prev => prev.filter(s => s.id !== confirmDelete))
      toast.success('Slot removed')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
    setConfirmDelete(null)
  }

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const slotsByDay = DAYS.reduce((acc, d) => {
    acc[d] = slots.filter(s => s.day === d).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return acc
  }, {} as Record<string, Slot[]>)

  return (
    <div className="tt-page">
      {/* Header */}
      <div className="tt-header">
        <h1 className="tt-title">🗓️ Timetable</h1>
        <button className="tt-add-btn" onClick={openAdd}><Plus size={18} /></button>
      </div>

      {loading ? (
        <div className="tt-loading">
          {[...Array(3)].map((_, i) => <div key={i} className="tt-skeleton skeleton-pulse" />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="tt-empty">
          <span style={{ fontSize: '2.5rem' }}>🗓️</span>
          <p>No classes yet</p>
          <button className="tt-add-btn-big" onClick={openAdd}>Add first class</button>
        </div>
      ) : (
        <div className="tt-days">
          {DAYS.map(d => slotsByDay[d].length > 0 && (
            <div key={d} className="tt-day-block">
              <div className="tt-day-label">{d}</div>
              <div className="tt-slots">
                {slotsByDay[d].map(slot => (
                  <div key={slot.id} className="tt-slot">
                    <div className="tt-slot-time">{formatTime(slot.start_time)}<span className="tt-slot-sep">–</span>{formatTime(slot.end_time)}</div>
                    <div className="tt-slot-info">
                      <div className="tt-slot-subject">{slot.subject}</div>
                      <div className="tt-slot-meta">
                        {slot.room && <span>Room {slot.room}</span>}
                        {slot.teacher && <span>{slot.teacher}</span>}
                      </div>
                    </div>
                    <div className="tt-slot-actions">
                      <button className="tt-slot-btn" onClick={() => openEdit(slot)}><Edit3 size={14} /></button>
                      <button className="tt-slot-btn tt-slot-btn--danger" onClick={() => setConfirmDelete(slot.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Sheet */}
      {addOpen && (
        <div className="tt-overlay" onClick={e => { if (e.target === e.currentTarget) setAddOpen(false) }}>
          <div className="tt-sheet">
            <div className="tt-sheet-handle" />
            <div className="tt-sheet-header">
              <h2 className="tt-sheet-title">{editSlot ? 'Edit Class' : 'Add Class'}</h2>
              <button className="tt-sheet-close" onClick={() => setAddOpen(false)}><X size={18} /></button>
            </div>
            <div className="tt-form">
              <div className="tt-form-row">
                <div className="tt-form-col">
                  <label className="tt-label">Day</label>
                  <select className="tt-input" value={day} onChange={e => setDay(e.target.value)}>
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="tt-form-row">
                <div className="tt-form-col">
                  <label className="tt-label">Start Time</label>
                  <input type="time" className="tt-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="tt-form-col">
                  <label className="tt-label">End Time</label>
                  <input type="time" className="tt-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <label className="tt-label">Subject *</label>
              <input className="tt-input" placeholder="e.g. Data Structures" value={subject} onChange={e => setSubject(e.target.value)} />
              <div className="tt-form-row">
                <div className="tt-form-col">
                  <label className="tt-label">Room</label>
                  <input className="tt-input" placeholder="e.g. CS-101" value={room} onChange={e => setRoom(e.target.value)} />
                </div>
                <div className="tt-form-col">
                  <label className="tt-label">Teacher</label>
                  <input className="tt-input" placeholder="Optional" value={teacher} onChange={e => setTeacher(e.target.value)} />
                </div>
              </div>
              <button className="tt-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editSlot ? 'Update Class' : 'Add Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Remove this class slot?"
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style>{ttStyles}</style>
    </div>
  )
}

const ttStyles = `
.tt-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.tt-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border); }
.tt-title { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.tt-add-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: var(--bg); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }

.tt-loading { display: flex; flex-direction: column; gap: .65rem; padding: .75rem 1rem; }
.tt-skeleton { height: 72px; border-radius: 12px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.tt-empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center; }
.tt-empty p { font-size: .875rem; }
.tt-add-btn-big { padding: .65rem 1.5rem; background: var(--accent); color: var(--bg); border: none; border-radius: 10px; font-weight: 700; font-size: .875rem; cursor: pointer; }

.tt-days { display: flex; flex-direction: column; gap: 1.25rem; padding: .85rem 1rem; }
.tt-day-label { font-size: .78rem; font-weight: 700; color: var(--ink-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: .5rem; }
.tt-slots { display: flex; flex-direction: column; gap: .5rem; }
.tt-slot { display: flex; align-items: center; gap: .75rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: .75rem; }
.tt-slot-time { font-size: .75rem; font-weight: 600; color: var(--accent); white-space: nowrap; min-width: 90px; }
.tt-slot-sep { margin: 0 .15rem; color: var(--ink-muted); }
.tt-slot-info { flex: 1; min-width: 0; }
.tt-slot-subject { font-size: .875rem; font-weight: 700; color: var(--ink); }
.tt-slot-meta { display: flex; gap: .5rem; font-size: .72rem; color: var(--ink-muted); margin-top: .15rem; }
.tt-slot-actions { display: flex; gap: .35rem; }
.tt-slot-btn { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border); background: transparent; color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.tt-slot-btn--danger { color: var(--danger); }

/* Sheet */
.tt-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
.tt-sheet { background: var(--surface); border-radius: 18px 18px 0 0; width: 100%; max-width: 600px; animation: ttIn .25s ease; }
@keyframes ttIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.tt-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.tt-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.tt-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.tt-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.tt-form { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: .65rem; }
.tt-label { font-size: .78rem; font-weight: 600; color: var(--ink-muted); }
.tt-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: .65rem .85rem; font-size: .875rem; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
.tt-input:focus { border-color: var(--accent); }
.tt-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; }
.tt-form-col { display: flex; flex-direction: column; gap: .35rem; }
.tt-save-btn { width: 100%; padding: .8rem; background: var(--accent); color: var(--bg); border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700; cursor: pointer; margin-top: .25rem; }
.tt-save-btn:disabled { opacity: .6; cursor: not-allowed; }
`
