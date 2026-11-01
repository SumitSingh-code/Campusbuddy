'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, X, FileText, BookOpen } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { uploadToStorage } from '@/lib/storage'
import { fmtBytes } from '@/lib/format'
import { timeAgo } from '@/lib/date'
import { DEPARTMENTS as CRSU_DEPARTMENTS } from '@/lib/constants'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface Note {
  id: string
  subject: string
  department: string
  semester?: string | number
  file_url: string
  file_name?: string
  file_size?: number
  file_size_bytes?: number
  uploaded_by?: string
  uploader_id?: string
  uploader_name?: string
  uploader?: { full_name?: string; roll_number?: string }
  created_at: string
}

const DEPARTMENTS = ['All', ...CRSU_DEPARTMENTS]
const SEMESTERS = ['All', '1', '2', '3', '4', '5', '6', '7', '8']

export default function NotesPage() {
  const { user, profile, isAdmin } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('All')
  const [filterSem, setFilterSem] = useState('All')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadNotes() }, [filterDept, filterSem])

  // Pre-fill department when modal opens if empty
  useEffect(() => {
    if (uploadOpen && !department && profile?.department) {
      setDepartment(profile.department)
    }
  }, [uploadOpen, profile?.department, department])

  async function loadNotes() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterDept !== 'All') params.set('department', filterDept)
      if (filterSem !== 'All') params.set('semester', filterSem)
      const q = params.toString() ? `?${params}` : ''
      const res = await api.get(`/notes${q}`)
      setNotes(res.data || [])
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!subject.trim() || !department.trim() || !file) {
      toast.error('Fill subject, department and select a file')
      return
    }
    if (file.size > 3.5 * 1024 * 1024) {
      toast.error('File is too large (max 3.5MB). Please compress before uploading.')
      return
    }
    setUploading(true)
    try {
      const url = await uploadToStorage(file, `notes/${user!.id}/${Date.now()}_${file.name}`)
      await api.post('/notes', {
        title: subject.trim(),
        subject: subject.trim(),
        department: department.trim(),
        semester: semester ? parseInt(semester) : null,
        file_url: url,
        file_name: file.name,
        file_size: file.size,
        file_size_bytes: file.size,
      })
      toast.success('Notes uploaded!')
      setUploadOpen(false)
      setSubject(''); setSemester(''); setFile(null)
      loadNotes()
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await api.delete(`/notes/${confirmDelete}`)
      setNotes(prev => prev.filter(n => n.id !== confirmDelete))
      toast.success('Notes deleted')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
    setConfirmDelete(null)
  }

  return (
    <div className="notes-page">
      {/* Header */}
      <div className="notes-header">
        <h1 className="notes-title">📚 Study Notes</h1>
        <button className="notes-upload-btn" onClick={() => setUploadOpen(true)}>
          <Upload size={15} /> Upload
        </button>
      </div>

      {/* Filters */}
      <div className="notes-filter-section">
        <div className="notes-filters">
          {DEPARTMENTS.map(d => (
            <button key={d} className={`notes-chip${filterDept === d ? ' active' : ''}`} onClick={() => setFilterDept(d)}>{d}</button>
          ))}
        </div>
        <div className="notes-sem-row">
          <span className="notes-sem-label">Semester:</span>
          {SEMESTERS.map(s => (
            <button key={s} className={`notes-sem-chip${filterSem === s ? ' active' : ''}`} onClick={() => setFilterSem(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="notes-loading">
          {[...Array(4)].map((_, i) => <div key={i} className="notes-skeleton skeleton-pulse" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="notes-empty">
          <BookOpen size={36} strokeWidth={1.5} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Uploading Soon 📚</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
            {filterDept !== 'All'
              ? `Study notes for ${filterDept}${filterSem !== 'All' ? ` (Semester ${filterSem})` : ''} are being uploaded soon.`
              : 'Study notes for your stream are being uploaded soon. Check back shortly!'}
          </p>
          <button className="notes-upload-btn" onClick={() => setUploadOpen(true)} style={{ marginTop: '0.5rem' }}>
            Have notes? Upload &amp; Share
          </button>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="notes-card">
              <div className="notes-card-icon">
                <FileText size={22} />
              </div>
              <div className="notes-card-info">
                <div className="notes-card-subject">{note.subject}</div>
                <div className="notes-card-meta">
                  <span className="notes-dept-badge">{note.department}</span>
                  {note.semester && <span>Sem {note.semester}</span>}
                  <span>{fmtBytes(note.file_size || note.file_size_bytes || 0)}</span>
                </div>
                <div className="notes-card-uploader">
                  {note.uploader_name || note.uploader?.full_name || 'Student'} · {timeAgo(note.created_at)}
                </div>
              </div>
              <div className="notes-card-actions">
                <a href={note.file_url} target="_blank" rel="noopener noreferrer" download={note.file_name || `${note.subject}_notes.pdf`} className="notes-download-btn" aria-label="Download">
                  <Download size={16} />
                </a>
                {(note.uploaded_by === user?.id || note.uploader_id === user?.id || isAdmin) && (
                  <button className="notes-delete-btn" onClick={() => setConfirmDelete(note.id)} aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Sheet */}
      {uploadOpen && (
        <div className="notes-overlay" onClick={e => { if (e.target === e.currentTarget) setUploadOpen(false) }}>
          <div className="notes-sheet">
            <div className="notes-sheet-handle" />
            <div className="notes-sheet-header">
              <h2 className="notes-sheet-title">Upload Notes</h2>
              <button className="notes-sheet-close" onClick={() => setUploadOpen(false)}><X size={18} /></button>
            </div>
            <div className="notes-form">
              <label className="notes-label">Subject *</label>
              <input className="notes-input" placeholder="e.g. Operating Systems" value={subject} onChange={e => setSubject(e.target.value)} />

              <div className="notes-row">
                <div className="notes-col">
                  <label className="notes-label">Department *</label>
                  <select className="notes-input" value={department} onChange={e => setDepartment(e.target.value)}>
                    <option value="">Select department…</option>
                    {CRSU_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="notes-col">
                  <label className="notes-label">Semester</label>
                  <select className="notes-input" value={semester} onChange={e => setSemester(e.target.value)}>
                    <option value="">Any</option>
                    {['1','2','3','4','5','6','7','8'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <label className="notes-label">File (PDF/DOC) *</label>
              <div className="notes-file-area" onClick={() => fileInputRef.current?.click()}>
                {file ? (
                  <div className="notes-file-selected">
                    <FileText size={18} />
                    <span>{file.name}</span>
                    <span className="notes-file-size">{fmtBytes(file.size)}</span>
                  </div>
                ) : (
                  <><Upload size={22} /><span>Tap to select file</span></>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f && f.size > 3.5 * 1024 * 1024) {
                    toast.error('File is too large (max 3.5MB). Please compress before uploading.')
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    return
                  }
                  setFile(f || null)
                }}
              />

              <button className="notes-submit-btn" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete these notes?"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style>{notesStyles}</style>
    </div>
  )
}

const notesStyles = `
.notes-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.notes-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border); }
.notes-title { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.notes-upload-btn { display: flex; align-items: center; gap: .4rem; padding: .55rem 1rem; background: var(--accent); color: var(--bg); border: none; border-radius: 9px; font-size: .8125rem; font-weight: 700; cursor: pointer; }

.notes-filter-section { border-bottom: 1px solid var(--border); }
.notes-filters { display: flex; gap: .45rem; padding: .65rem 1rem .35rem; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.notes-filters::-webkit-scrollbar { display: none; }
.notes-chip { flex-shrink: 0; padding: .35rem .75rem; border-radius: 99px; border: 1.5px solid var(--border); background: transparent; color: var(--ink-muted); font-size: .75rem; font-weight: 600; cursor: pointer; }
.notes-chip.active { border-color: var(--accent); background: rgba(212,175,55,.1); color: var(--accent); }

.notes-sem-row { display: flex; align-items: center; gap: .35rem; padding: .35rem 1rem .65rem; overflow-x: auto; scrollbar-width: none; }
.notes-sem-row::-webkit-scrollbar { display: none; }
.notes-sem-label { font-size: .72rem; color: var(--ink-muted); flex-shrink: 0; font-weight: 600; }
.notes-sem-chip { flex-shrink: 0; padding: .25rem .6rem; border-radius: 99px; border: 1px solid var(--border); background: transparent; color: var(--ink-muted); font-size: .72rem; cursor: pointer; }
.notes-sem-chip.active { border-color: var(--accent); color: var(--accent); background: rgba(212,175,55,.08); }

.notes-loading { display: flex; flex-direction: column; gap: .65rem; padding: .75rem 1rem; }
.notes-skeleton { height: 72px; border-radius: 14px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.notes-empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center; }
.notes-empty p { font-size: .875rem; }

.notes-list { display: flex; flex-direction: column; gap: .65rem; padding: .75rem 1rem; }
.notes-card { display: flex; align-items: center; gap: .85rem; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: .9rem; }
.notes-card-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(107,85,232,.1); color: #6B55E8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.notes-card-info { flex: 1; min-width: 0; }
.notes-card-subject { font-weight: 700; font-size: .875rem; color: var(--ink); margin-bottom: .25rem; }
.notes-card-meta { display: flex; flex-wrap: wrap; gap: .4rem; font-size: .72rem; color: var(--ink-muted); margin-bottom: .2rem; }
.notes-dept-badge { background: var(--surface2); border-radius: 4px; padding: .1rem .4rem; color: var(--ink-muted); }
.notes-card-uploader { font-size: .7rem; color: var(--ink-muted); }
.notes-card-actions { display: flex; gap: .4rem; }
.notes-download-btn { width: 34px; height: 34px; border-radius: 8px; background: var(--accent); color: var(--bg); display: flex; align-items: center; justify-content: center; text-decoration: none; }
.notes-delete-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* Upload sheet */
.notes-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
.notes-sheet { background: var(--surface); border-radius: 18px 18px 0 0; width: 100%; max-width: 600px; max-height: 90dvh; overflow-y: auto; animation: notesIn .25s ease; }
@keyframes notesIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.notes-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.notes-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.notes-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.notes-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.notes-form { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: .65rem; }
.notes-label { font-size: .78rem; font-weight: 600; color: var(--ink-muted); }
.notes-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: .65rem .85rem; font-size: .875rem; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
.notes-input:focus { border-color: var(--accent); }
.notes-row { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; }
.notes-col { display: flex; flex-direction: column; gap: .35rem; }
.notes-file-area { border: 2px dashed var(--border); border-radius: 12px; padding: 1.5rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: .5rem; color: var(--ink-muted); font-size: .875rem; }
.notes-file-selected { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; justify-content: center; color: var(--ink); }
.notes-file-size { font-size: .72rem; color: var(--ink-muted); }
.notes-submit-btn { width: 100%; padding: .8rem; background: var(--accent); color: var(--bg); border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700; cursor: pointer; margin-top: .25rem; }
.notes-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
`
