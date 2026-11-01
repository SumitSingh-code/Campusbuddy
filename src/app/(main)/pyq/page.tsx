'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Upload,
  Download,
  Trash2,
  X,
  FileText,
  Search,
  Building2,
  GraduationCap,
  Calendar,
  Filter,
} from 'lucide-react'
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
  semester?: number | string | null
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
const SEMESTERS = ['All', '1', '2', '3', '4', '5', '6', '7', '8']

export default function PYQPage() {
  const { user, profile, isAdmin } = useAuth()

  const [files, setFiles] = useState<PYQFile[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterDept, setFilterDept] = useState<string>('All')
  const [filterSem, setFilterSem] = useState<string>('All')
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Upload Modal State
  const [uploadOpen, setUploadOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [semester, setSemester] = useState('')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [department, setDepartment] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Student department lock
  const studentDept = (profile?.department || '').trim()

  // Initialize department filter: students locked to their dept, admins see All by default
  useEffect(() => {
    if (!isAdmin && studentDept) {
      setFilterDept(studentDept)
    } else if (isAdmin && filterDept === 'All') {
      setFilterDept('All')
    }
  }, [studentDept, isAdmin])

  // Sync upload department when modal opens
  useEffect(() => {
    if (uploadOpen) {
      if (!isAdmin && studentDept) {
        setDepartment(studentDept)
      } else if (!department && studentDept) {
        setDepartment(studentDept)
      } else if (!department && CRSU_DEPARTMENTS.length > 0) {
        setDepartment(CRSU_DEPARTMENTS[0])
      }
    }
  }, [uploadOpen, studentDept, isAdmin])

  useEffect(() => {
    loadFiles()
  }, [filterDept, filterSem])

  async function loadFiles(searchOverride?: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const effectiveDept = !isAdmin && studentDept ? studentDept : filterDept
      if (effectiveDept && effectiveDept !== 'All') {
        params.set('department', effectiveDept)
      }
      if (filterSem !== 'All') {
        params.set('semester', filterSem)
      }
      const q = searchOverride !== undefined ? searchOverride : searchQuery
      if (q.trim()) {
        params.set('search', q.trim())
      }

      const qString = params.toString() ? `?${params}` : ''
      const res = await api.get<{ data: PYQFile[] }>(`/pyq${qString}`)
      setFiles(res.data || [])
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to load PYQs')
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit() {
    setSearchQuery(searchInput)
    loadFiles(searchInput)
  }

  function handleClearSearch() {
    setSearchInput('')
    setSearchQuery('')
    loadFiles('')
  }

  async function handleUpload() {
    const finalDept = !isAdmin && studentDept ? studentDept : department.trim()
    if (!subject.trim()) {
      toast.error('Please enter the subject name')
      return
    }
    if (!semester) {
      toast.error('Please select the semester')
      return
    }
    if (!year || isNaN(parseInt(year))) {
      toast.error('Please enter a valid exam year')
      return
    }
    if (!finalDept) {
      toast.error('Please select a department')
      return
    }
    if (!file) {
      toast.error('Please select a PDF file')
      return
    }
    if (file.size > 3.5 * 1024 * 1024) {
      toast.error('PDF file is too large (max 3.5MB). Please compress your PDF before uploading.')
      return
    }

    setUploading(true)
    try {
      const url = await uploadToStorage(file, `pyq/${user!.id}/${Date.now()}_${file.name}`)
      await api.post('/pyq', {
        title: subject.trim(),
        subject: subject.trim(),
        semester: parseInt(semester),
        year: parseInt(year),
        exam_type: 'end',
        department: finalDept,
        file_url: url,
        file_name: file.name,
        file_size: file.size,
        file_size_bytes: file.size,
      })
      toast.success('Question paper uploaded successfully!')
      setUploadOpen(false)
      setSubject('')
      setSemester('')
      setYear(new Date().getFullYear().toString())
      setFile(null)
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
      toast.success('Question paper deleted')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
    setConfirmDelete(null)
  }

  // Client-side instant filter on top of fetched items
  const filtered = files.filter(f => {
    // 1. Department filter (Student can ONLY see their own department)
    if (!isAdmin && studentDept) {
      if (f.department.toLowerCase() !== studentDept.toLowerCase()) return false
    } else if (filterDept !== 'All') {
      if (f.department.toLowerCase() !== filterDept.toLowerCase()) return false
    }

    // 2. Semester filter
    if (filterSem !== 'All') {
      if (String(f.semester) !== String(filterSem)) return false
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchSub = f.subject.toLowerCase().includes(q)
      const matchTitle = (f.file_name || '').toLowerCase().includes(q)
      const matchDept = f.department.toLowerCase().includes(q)
      if (!matchSub && !matchTitle && !matchDept) return false
    }

    return true
  })

  return (
    <div className="pyq-page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="pyq-header">
        <div>
          <h1 className="pyq-title">📄 Previous Year Questions (PYQs)</h1>
          <p className="pyq-subtitle">Browse and download semester exam question papers</p>
        </div>
        <button className="pyq-upload-btn" onClick={() => setUploadOpen(true)}>
          <Upload size={15} />
          <span>Upload PYQ</span>
        </button>
      </div>

      {/* ── Student Department Banner or Admin Selector ───────── */}
      {!isAdmin ? (
        <div className="pyq-student-dept-card">
          <div className="pyq-student-dept-icon">
            <Building2 size={20} />
          </div>
          <div className="pyq-student-dept-info">
            <div className="pyq-student-dept-label">Department View</div>
            <div className="pyq-student-dept-name">{studentDept || 'General / All CRSU'}</div>
            <div className="pyq-student-dept-note">
              Showing official question papers exclusive to your registered department
            </div>
          </div>
        </div>
      ) : (
        /* Admin Department Selector */
        <div className="pyq-admin-dept-bar">
          <label className="pyq-admin-dept-label">
            <Building2 size={14} /> Filter Department (Admin):
          </label>
          <div className="pyq-admin-dept-scroll">
            {DEPARTMENTS.map(d => (
              <button
                key={d}
                className={`pyq-admin-dept-chip ${filterDept === d ? 'active' : ''}`}
                onClick={() => setFilterDept(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Search Bar with Search Button ──────────────────────── */}
      <div className="pyq-search-container">
        <div className="pyq-search-input-wrap">
          <Search size={16} className="pyq-search-icon" />
          <input
            type="text"
            className="pyq-search-input"
            placeholder="Search by subject or topic (e.g. Data Structures, Maths, OS)..."
            value={searchInput}
            onChange={e => {
              setSearchInput(e.target.value)
              setSearchQuery(e.target.value)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearchSubmit()
            }}
          />
          {searchInput && (
            <button className="pyq-search-clear" onClick={handleClearSearch} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>
        <button className="pyq-search-btn" onClick={handleSearchSubmit}>
          <Search size={14} />
          <span>Search</span>
        </button>
      </div>

      {/* ── Semester Filter Strip ──────────────────────────────── */}
      <div className="pyq-sem-strip-wrap">
        <div className="pyq-sem-strip-header">
          <GraduationCap size={15} />
          <span>Filter by Semester:</span>
        </div>
        <div className="pyq-sem-strip">
          {SEMESTERS.map(s => (
            <button
              key={s}
              className={`pyq-sem-chip ${filterSem === s ? 'active' : ''}`}
              onClick={() => setFilterSem(s)}
            >
              {s === 'All' ? 'All Semesters' : `Sem ${s}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Filters Summary ─────────────────────────────── */}
      {(searchQuery || filterSem !== 'All' || (isAdmin && filterDept !== 'All')) && (
        <div className="pyq-active-filters">
          <span className="pyq-active-filters-label">Active Filters:</span>
          {searchQuery && (
            <span className="pyq-filter-tag">
              Subject: &quot;{searchQuery}&quot;
              <button onClick={handleClearSearch}><X size={12} /></button>
            </span>
          )}
          {filterSem !== 'All' && (
            <span className="pyq-filter-tag">
              Sem {filterSem}
              <button onClick={() => setFilterSem('All')}><X size={12} /></button>
            </span>
          )}
          {isAdmin && filterDept !== 'All' && (
            <span className="pyq-filter-tag">
              Dept: {filterDept}
              <button onClick={() => setFilterDept('All')}><X size={12} /></button>
            </span>
          )}
          <button
            className="pyq-clear-all-btn"
            onClick={() => {
              handleClearSearch()
              setFilterSem('All')
              if (isAdmin) setFilterDept('All')
            }}
          >
            Reset All
          </button>
        </div>
      )}

      {/* ── Question Papers List ───────────────────────────────── */}
      {loading ? (
        <div className="pyq-loading">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="pyq-skeleton skeleton-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="pyq-empty">
          <FileText size={42} strokeWidth={1.5} />
          <h3 className="pyq-empty-title">
            {searchQuery ? 'No Question Papers Found' : 'Uploading Soon 📄'}
          </h3>
          <p className="pyq-empty-desc">
            {searchQuery
              ? `No PYQs matched "${searchQuery}". Try searching a different keyword.`
              : filterSem !== 'All'
              ? `Previous year question papers for ${studentDept || 'your stream'} (Semester ${filterSem}) are being uploaded soon.`
              : `Previous year question papers for ${studentDept || 'your stream'} are being uploaded soon. Check back shortly!`}
          </p>
          <div className="pyq-empty-actions">
            {(searchQuery || filterSem !== 'All') && (
              <button
                className="pyq-reset-btn"
                onClick={() => {
                  handleClearSearch()
                  setFilterSem('All')
                }}
              >
                Clear Filters
              </button>
            )}
            <button className="pyq-upload-btn" onClick={() => setUploadOpen(true)}>
              <Upload size={14} /> Upload First Paper
            </button>
          </div>
        </div>
      ) : (
        <div className="pyq-list">
          {filtered.map(f => (
            <div key={f.id} className="pyq-card">
              <div className="pyq-card-icon">
                <FileText size={24} />
              </div>

              <div className="pyq-card-info">
                <div className="pyq-card-subject">{f.subject}</div>

                <div className="pyq-card-meta">
                  {f.semester && (
                    <span className="pyq-sem-badge">
                      <GraduationCap size={12} />
                      Sem {f.semester}
                    </span>
                  )}
                  <span className="pyq-year-badge">
                    <Calendar size={12} />
                    {f.year}
                  </span>
                  <span className="pyq-dept-badge">{f.department}</span>
                  <span className="pyq-size-badge">
                    {fmtBytes(f.file_size || f.file_size_bytes || 0)}
                  </span>
                </div>

                <div className="pyq-card-uploader">
                  Uploaded by {f.uploader_name || f.uploader?.full_name || 'Student'} · {timeAgo(f.created_at)}
                </div>
              </div>

              <div className="pyq-card-actions">
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={f.file_name || `${f.subject}_Sem${f.semester || ''}_${f.year}.pdf`}
                  className="pyq-download-btn"
                  title="Download Question Paper"
                  aria-label="Download"
                >
                  <Download size={16} />
                </a>

                {(f.uploaded_by === user?.id || f.uploader_id === user?.id || isAdmin) && (
                  <button
                    className="pyq-delete-btn"
                    onClick={() => setConfirmDelete(f.id)}
                    title="Delete Question Paper"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload Sheet Modal ─────────────────────────────────── */}
      {uploadOpen && (
        <div
          className="pyq-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) setUploadOpen(false)
          }}
        >
          <div className="pyq-sheet">
            <div className="pyq-sheet-handle" />
            <div className="pyq-sheet-header">
              <h2 className="pyq-sheet-title">Upload Question Paper</h2>
              <button className="pyq-sheet-close" onClick={() => setUploadOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="pyq-form">
              {/* Subject */}
              <div>
                <label className="pyq-label">Subject Name *</label>
                <input
                  className="pyq-input"
                  placeholder="e.g. Operating Systems, Data Structures..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              {/* Semester & Year */}
              <div className="pyq-row">
                <div className="pyq-col">
                  <label className="pyq-label">Semester *</label>
                  <select
                    className="pyq-input"
                    value={semester}
                    onChange={e => setSemester(e.target.value)}
                  >
                    <option value="">Select Semester…</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>
                        Semester {s} (Sem {s})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pyq-col">
                  <label className="pyq-label">Exam Year *</label>
                  <input
                    className="pyq-input"
                    type="number"
                    min="2000"
                    max={new Date().getFullYear() + 2}
                    value={year}
                    onChange={e => setYear(e.target.value)}
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="pyq-label">Department *</label>
                {!isAdmin && studentDept ? (
                  <div>
                    <input
                      className="pyq-input"
                      value={studentDept}
                      disabled
                      readOnly
                      style={{ opacity: 0.85, background: 'var(--surface2)', cursor: 'not-allowed' }}
                    />
                    <p className="pyq-field-hint">
                      Locked to your registered university department
                    </p>
                  </div>
                ) : (
                  <select
                    className="pyq-input"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  >
                    <option value="">Select department…</option>
                    {CRSU_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* File Upload Box */}
              <div>
                <label className="pyq-label">Question Paper PDF *</label>
                <div
                  className="pyq-file-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <div className="pyq-file-selected">
                      <FileText size={22} className="pyq-file-pdf-icon" />
                      <div>
                        <span className="pyq-file-name">{file.name}</span>
                        <span className="pyq-file-size">({fmtBytes(file.size)})</span>
                      </div>
                      <span className="pyq-file-change">Click to change</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} />
                      <span className="pyq-file-cta">Tap or click to select PDF file</span>
                      <span className="pyq-file-subtext">PDF format up to 3.5MB supported</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  hidden
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f && f.size > 3.5 * 1024 * 1024) {
                      toast.error('PDF file is too large (max 3.5MB). Please compress your PDF before uploading.')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                      return
                    }
                    setFile(f || null)
                  }}
                />
              </div>

              <button
                className="pyq-submit-btn"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading Paper…' : 'Publish Question Paper'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this question paper? This cannot be undone."
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
.pyq-page { max-width: 640px; margin: 0 auto; padding-bottom: 4.5rem; }

/* Header */
.pyq-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1rem 0.85rem; border-bottom: 1px solid var(--border); }
.pyq-title { font-size: 1.15rem; font-weight: 800; color: var(--ink); margin: 0; }
.pyq-subtitle { font-size: 0.75rem; color: var(--ink-muted); margin: 0.2rem 0 0; }
.pyq-upload-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 0.95rem; background: var(--accent); color: var(--bg); border: none; border-radius: 10px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s; flex-shrink: 0; }
.pyq-upload-btn:hover { opacity: 0.9; }

/* Student Department Card */
.pyq-student-dept-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin: 0.75rem 1rem 0.25rem;
  padding: 0.8rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: 12px;
}
.pyq-student-dept-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(212, 175, 55, 0.12);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pyq-student-dept-info { flex: 1; min-width: 0; }
.pyq-student-dept-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); }
.pyq-student-dept-name { font-size: 0.9375rem; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pyq-student-dept-note { font-size: 0.7rem; color: var(--ink-muted); margin-top: 0.1rem; }

/* Admin Dept Bar */
.pyq-admin-dept-bar { padding: 0.75rem 1rem 0.25rem; }
.pyq-admin-dept-label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 700; color: var(--ink-muted); margin-bottom: 0.45rem; }
.pyq-admin-dept-scroll { display: flex; gap: 0.45rem; overflow-x: auto; padding-bottom: 0.4rem; scrollbar-width: none; }
.pyq-admin-dept-scroll::-webkit-scrollbar { display: none; }
.pyq-admin-dept-chip { flex-shrink: 0; padding: 0.35rem 0.85rem; border-radius: 99px; border: 1.5px solid var(--border); background: var(--surface); color: var(--ink-muted); font-size: 0.75rem; font-weight: 600; cursor: pointer; }
.pyq-admin-dept-chip.active { border-color: var(--accent); background: rgba(212, 175, 55, 0.12); color: var(--accent); font-weight: 700; }

/* Search Container */
.pyq-search-container {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.4rem;
}
.pyq-search-input-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.pyq-search-icon {
  position: absolute;
  left: 0.85rem;
  color: var(--ink-muted);
  pointer-events: none;
}
.pyq-search-input {
  width: 100%;
  height: 40px;
  padding: 0 2.2rem 0 2.4rem;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 11px;
  font-size: 0.84rem;
  color: var(--ink);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}
.pyq-search-input:focus {
  border-color: var(--accent);
}
.pyq-search-clear {
  position: absolute;
  right: 0.65rem;
  width: 22px;
  height: 22px;
  border: none;
  background: var(--surface2);
  color: var(--ink-muted);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pyq-search-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 1rem;
  height: 40px;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 11px;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.pyq-search-btn:hover { opacity: 0.9; }

/* Semester Strip */
.pyq-sem-strip-wrap {
  padding: 0.35rem 1rem 0.65rem;
}
.pyq-sem-strip-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.4rem;
}
.pyq-sem-strip {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 0.2rem;
}
.pyq-sem-strip::-webkit-scrollbar { display: none; }
.pyq-sem-chip {
  flex-shrink: 0;
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.pyq-sem-chip.active {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--bg);
  font-weight: 700;
}

/* Active Filters */
.pyq-active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0 1rem 0.65rem;
}
.pyq-active-filters-label { font-size: 0.72rem; color: var(--ink-muted); font-weight: 600; }
.pyq-filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--surface2);
  color: var(--ink);
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
}
.pyq-filter-tag button {
  background: none;
  border: none;
  color: var(--ink-muted);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}
.pyq-clear-all-btn {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

/* List */
.pyq-list { display: flex; flex-direction: column; gap: 0.65rem; padding: 0.4rem 1rem 1rem; }
.pyq-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.95rem;
  transition: border-color 0.15s;
}
.pyq-card:hover { border-color: rgba(212, 175, 55, 0.4); }
.pyq-card-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: rgba(212, 175, 55, 0.12);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pyq-card-info { flex: 1; min-width: 0; }
.pyq-card-subject { font-weight: 700; font-size: 0.92rem; color: var(--ink); margin-bottom: 0.35rem; line-height: 1.3; }
.pyq-card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: var(--ink-muted); margin-bottom: 0.25rem; }
.pyq-sem-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(109, 74, 255, 0.12);
  color: #7A5AF8;
  border-radius: 5px;
  padding: 0.15rem 0.45rem;
  font-weight: 700;
}
.pyq-year-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--surface2);
  border-radius: 5px;
  padding: 0.15rem 0.45rem;
  font-weight: 600;
  color: var(--ink);
}
.pyq-dept-badge {
  background: var(--surface2);
  border-radius: 5px;
  padding: 0.15rem 0.45rem;
  color: var(--ink-muted);
}
.pyq-size-badge {
  background: transparent;
  color: var(--ink-muted);
}
.pyq-card-uploader { font-size: 0.69rem; color: var(--ink-muted); }
.pyq-card-actions { display: flex; gap: 0.4rem; }
.pyq-download-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: opacity 0.15s;
}
.pyq-download-btn:hover { opacity: 0.88; }
.pyq-delete-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--danger);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.pyq-delete-btn:hover { background: rgba(232, 93, 78, 0.08); }

/* Loading & Empty */
.pyq-loading { display: flex; flex-direction: column; gap: 0.65rem; padding: 0.75rem 1rem; }
.pyq-skeleton { height: 78px; border-radius: 14px; }
.skeleton-pulse { background: var(--surface); animation: sk-pulse 1.4s ease-in-out infinite; }
@keyframes sk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

.pyq-empty { display: flex; flex-direction: column; align-items: center; gap: 0.65rem; padding: 3.5rem 1.5rem; color: var(--ink-muted); text-align: center; }
.pyq-empty-title { font-size: 1rem; font-weight: 700; color: var(--ink); margin: 0; }
.pyq-empty-desc { font-size: 0.8125rem; max-width: 380px; margin: 0; line-height: 1.5; }
.pyq-empty-actions { display: flex; gap: 0.6rem; margin-top: 0.5rem; flex-wrap: wrap; justify-content: center; }
.pyq-reset-btn { padding: 0.55rem 0.95rem; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--ink); font-size: 0.8125rem; font-weight: 600; cursor: pointer; }

/* Upload Modal */
.pyq-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6); backdrop-filter: blur(5px); display: flex; align-items: flex-end; justify-content: center; }
.pyq-sheet { background: var(--surface); border-radius: 20px 20px 0 0; width: 100%; max-width: 600px; animation: pyqIn .25s ease; max-height: 90vh; overflow-y: auto; }
@keyframes pyqIn { from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1} }
.pyq-sheet-handle { width: 38px; height: 4px; background: var(--border); border-radius: 2px; margin: 0.75rem auto 0.25rem; }
.pyq-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1.25rem 0.75rem; border-bottom: 1px solid var(--border); }
.pyq-sheet-title { font-size: 1.05rem; font-weight: 700; color: var(--ink); margin: 0; }
.pyq-sheet-close { width: 30px; height: 30px; border: none; border-radius: 50%; background: var(--surface2); color: var(--ink-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pyq-form { padding: 1rem 1.25rem calc(1.75rem + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: 0.85rem; }
.pyq-label { font-size: 0.78rem; font-weight: 700; color: var(--ink); margin-bottom: 0.25rem; display: block; }
.pyq-field-hint { font-size: 0.7rem; color: var(--ink-muted); margin: 0.25rem 0 0; }
.pyq-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.875rem; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
.pyq-input:focus { border-color: var(--accent); }
.pyq-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.pyq-col { display: flex; flex-direction: column; }

.pyq-file-area { border: 2px dashed var(--border); border-radius: 12px; padding: 1.4rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; color: var(--ink-muted); font-size: 0.875rem; transition: border-color 0.15s; background: var(--bg); }
.pyq-file-area:hover { border-color: var(--accent); }
.pyq-file-cta { font-weight: 600; color: var(--ink); }
.pyq-file-subtext { font-size: 0.72rem; color: var(--ink-muted); }
.pyq-file-selected { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; text-align: center; }
.pyq-file-pdf-icon { color: var(--accent); }
.pyq-file-name { font-weight: 700; color: var(--ink); font-size: 0.875rem; word-break: break-all; }
.pyq-file-size { font-size: 0.75rem; color: var(--ink-muted); margin-left: 0.35rem; }
.pyq-file-change { font-size: 0.72rem; color: var(--accent); font-weight: 600; text-decoration: underline; margin-top: 0.2rem; }

.pyq-submit-btn { width: 100%; padding: 0.85rem; background: var(--accent); color: var(--bg); border: none; border-radius: 12px; font-size: 0.9375rem; font-weight: 700; cursor: pointer; margin-top: 0.35rem; transition: opacity 0.15s; }
.pyq-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`
