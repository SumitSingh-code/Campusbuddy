'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Trash2, X, FileText, Filter } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { uploadToStorage } from '@/lib/storage'
import { fmtBytes } from '@/lib/format'
import { timeAgo } from '@/lib/date'
import { DEPARTMENTS as CRSU_DEPARTMENTS } from '@/lib/constants'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

interface PYQFile {
  id: string
  subject: string
  year: string | number
  department: string
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

export default function PYQPage() {
  const { user, profile, isAdmin } = useAuth()

  const [files, setFiles] = useState<PYQFile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('All')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [department, setDepartment] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadFiles()
  }, [filterDept])

  // Pre-fill department when modal opens if empty
  useEffect(() => {
    if (uploadOpen && !department && profile?.department) {
      setDepartment(profile.department)
    }
  }, [uploadOpen, profile?.department, department])

  async function loadFiles() {
    setLoading(true)
    try {
      const q = filterDept !== 'All' ? `?department=${encodeURIComponent(filterDept)}` : ''
      const res = await api.get(`/pyq${q}`)
      setFiles(res.data || [])
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to load PYQs')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!subject.trim() || !year || !department.trim() || !file) {
      toast.error('Fill all fields and select a file')
      return
    }
    setUploading(true)
    try {
      const url = await uploadToStorage(file, `pyq/${user!.id}/${Date.now()}_${file.name}`)
      await api.post('/pyq', {
        title: subject.trim(),
        subject: subject.trim(),
        year: parseInt(year),
        exam_type: 'end',
        department: department.trim(),
        file_url: url,
        file_name: file.name,
        file_size: file.size,
        file_size_bytes: file.size,
      })
      toast.success('PYQ uploaded successfully')
      setUploadOpen(false)
      setSubject(''); setYear(new Date().getFullYear().toString()); setFile(null)
      loadFiles()
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await api.delete(`/pyq/${confirmDelete}`)
      setFiles(prev => prev.filter(f => f.id !== confirmDelete))
      toast.success('File deleted')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
    setConfirmDelete(null)
  }

  const filtered = files

  return (
    <div className="pyq-page">
      {/* Header */}
      <div className="pyq-header">
        <h1 className="pyq-title">📄 PYQ Library</h1>
        <button className="pyq-upload-btn" onClick={() => setUploadOpen(true)}>
          <Upload size={15} /> Upload
        </button>
      </div>

      {/* Filter */}
      <div className="pyq-filters">
        {DEPARTMENTS.map(d => (
          <button
            key={d}
            className={`pyq-filter-chip${filterDept === d ? ' active' : ''}`}
            onClick={() => setFilterDept(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="pyq-loading">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="pyq-skeleton skeleton-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="pyq-empty">
          <FileText size={36} strokeWidth={1.2} />
          <p>No PYQs found</p>
          <button className="pyq-upload-btn" onClick={() => setUploadOpen(true)}>Upload first one</button>
        </div>
      ) : (
        <div className="pyq-list">
          {filtered.map(f => (
            <div key={f.id} className="pyq-card">
              <div className="pyq-card-icon">
                <FileText size={22} />
              </div>
              <div className="pyq-card-info">
                <div className="pyq-card-subject">{f.subject}</div>
                <div className="pyq-card-meta">
                  <span className="pyq-dept-badge">{f.department}</span>
                  <span>Year {f.year}</span>
                  <span>{fmtBytes(f.file_size || f.file_size_bytes || 0)}</span>
                </div>
                <div className="pyq-card-uploader">
                  {f.uploader_name || f.uploader?.full_name || 'Student'} · {timeAgo(f.created_at)}
                </div>
              </div>
              <div className="pyq-card-actions">
                <a href={f.file_url} target="_blank" rel="noopener noreferrer" download={f.file_name || `${f.subject}_${f.year}.pdf`} className="pyq-download-btn" aria-label="Download">
                  <Download size={16} />
                </a>
                {(f.uploaded_by === user?.id || f.uploader_id === user?.id || isAdmin) && (
                  <button className="pyq-delete-btn" onClick={() => setConfirmDelete(f.id)} aria-label="Delete">
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
        <div className="pyq-overlay" onClick={e => { if (e.target === e.currentTarget) setUploadOpen(false) }}>
          <div className="pyq-sheet">
            <div className="pyq-sheet-handle" />
            <div className="pyq-sheet-header">
              <h2 className="pyq-sheet-title">Upload PYQ</h2>
              <button className="pyq-sheet-close" onClick={() => setUploadOpen(false)}><X size={18} /></button>
            </div>
            <div className="pyq-form">
              <label className="pyq-label">Subject *</label>
              <input className="pyq-input" placeholder="e.g. Operating Systems" value={subject} onChange={e => setSubject(e.target.value)} />

              <div className="pyq-row">
                <div className="pyq-col">
                  <label className="pyq-label">Year *</label>
                  <input className="pyq-input" type="number" min="2000" max="2030" value={year} onChange={e => setYear(e.target.value)} />
                </div>
                <div className="pyq-col">
                  <label className="pyq-label">Department *</label>
                  <select className="pyq-input" value={department} onChange={e => setDepartment(e.target.value)}>
                    <option value="">Select department…</option>
                    {CRSU_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <label className="pyq-label">File (PDF) *</label>
              <div className="pyq-file-area" onClick={() => fileInputRef.current?.click()}>
                {file ? (
                  <div className="pyq-file-selected">
                    <FileText size={18} />
                    <span>{file.name}</span>
                    <span className="pyq-file-size">{fmtBytes(file.size)}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={22} />
                    <span>Tap to select PDF</span>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" hidden onChange={e => setFile(e.target.files?.[0] || null)} />

              <button className="pyq-submit-btn" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload PYQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this PYQ file? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style>{pyqStyles}</style>
    </div>
  )
}

const pyqStyles = `
.pyq-page { max-width: 600px; margin: 0 auto; padding-bottom: 4rem; }
.pyq-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border); }
.pyq-title { font-size: 1.1rem; font-weight: 800; color: var(--ink); }
.pyq-upload-btn { display: flex; align-items: center; gap: .4rem; padding: .55rem 1rem; background: var(--accent); color: var(--bg); border: none; border-radius: 9px; font-size: .8125rem; font-weight: 700; cursor: pointer; }

.pyq-filters { display: flex; gap: .45rem; padding: .75rem 1rem; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.pyq-filters::-webkit-scrollbar { display: none; }
.pyq-filter-chip { flex-shrink: 0; padding: .4rem .85rem; border-radius: 99px; border: 1.5px solid var(--border); background: transparent; color: var(--ink-muted); font-size: .78rem; font-weight: 600; cursor: pointer; }
.pyq-filter-chip.active { border-color: var(--accent); background: rgba(212,175,55,.1); color: var(--accent); }

.pyq-list { display: flex; flex-direction: column; gap: .65rem; padding: .75rem 1rem; }
.pyq-card { display: flex; align-items: center; gap: .85rem; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: .9rem; }
.pyq-card-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(212,175,55,.1); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pyq-card-info { flex: 1; min-width: 0; }
.pyq-card-subject { font-weight: 700; font-size: .875rem; color: var(--ink); margin-bottom: .25rem; }
.pyq-card-meta { display: flex; flex-wrap: wrap; gap: .4rem; font-size: .72rem; color: var(--ink-muted); margin-bottom: .2rem; }
.pyq-dept-badge { background: var(--surface2); border-radius: 4px; padding: .1rem .4rem; color: var(--ink-muted); }
.pyq-card-uploader { font-size: .7rem; color: var(--ink-muted); }
.pyq-card-actions { display: flex; gap: .4rem; }
.pyq-download-btn { width: 34px; height: 34px; border-radius: 8px; background: var(--accent); color: var(--bg); display: flex; align-items: center; justify-content: center; text-decoration: none; }
.pyq-delete-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; }

.pyq-loading { display: flex; flex-direction: column; gap: .65rem; padding: .75rem 1rem; }
.pyq-skeleton { height: 72px; border-radius: 14px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.pyq-empty { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 4rem 1rem; color: var(--ink-muted); text-align: center; }
.pyq-empty p { font-size: .875rem; }

/* Upload sheet */
.pyq-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); display: flex; align-items: flex-end; justify-content: center; }
.pyq-sheet { background: var(--surface); border-radius: 18px 18px 0 0; width: 100%; max-width: 600px; animation: pyqIn .25s ease; }
@keyframes pyqIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.pyq-sheet-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: .75rem auto .25rem; }
.pyq-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem 1rem .75rem; }
.pyq-sheet-title { font-size: 1rem; font-weight: 700; color: var(--ink); }
.pyq-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pyq-form { padding: 0 1rem calc(1.5rem + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: .65rem; }
.pyq-label { font-size: .78rem; font-weight: 600; color: var(--ink-muted); }
.pyq-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: .65rem .85rem; font-size: .875rem; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
.pyq-input:focus { border-color: var(--accent); }
.pyq-row { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; }
.pyq-col { display: flex; flex-direction: column; gap: .35rem; }

.pyq-file-area { border: 2px dashed var(--border); border-radius: 12px; padding: 1.5rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: .5rem; color: var(--ink-muted); font-size: .875rem; transition: border-color .15s; }
.pyq-file-area:hover { border-color: var(--accent); }
.pyq-file-selected { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; justify-content: center; color: var(--ink); }
.pyq-file-size { font-size: .72rem; color: var(--ink-muted); }

.pyq-submit-btn { width: 100%; padding: .8rem; background: var(--accent); color: var(--bg); border: none; border-radius: 11px; font-size: .9375rem; font-weight: 700; cursor: pointer; margin-top: .25rem; }
.pyq-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
`
