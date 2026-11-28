'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  AlertCircle,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
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

function PYQContent() {
  const searchParams = useSearchParams()
  const { user, profile, isAdmin } = useAuth()

  const [files, setFiles] = useState<PYQFile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filters
  const [filterDept, setFilterDept] = useState<string>('All')
  const [filterSem, setFilterSem] = useState<string>('All')
  const [filterMyUploads, setFilterMyUploads] = useState<boolean>(false)
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const studentDept = (profile?.department || '').trim()

  // 1. Sync from URL search params on mount (e.g. returning from /pyq/upload)
  useEffect(() => {
    const urlDept = searchParams?.get('dept')
    const urlSem = searchParams?.get('sem')
    const uploaded = searchParams?.get('uploaded')

    if (urlDept) {
      setFilterDept(urlDept)
    } else if (!isAdmin && studentDept) {
      setFilterDept(studentDept)
    } else {
      setFilterDept('All')
    }

    if (urlSem) {
      setFilterSem(urlSem)
    }

    if (uploaded === '1') {
      toast.success('Your question paper is live in the catalog below! 📄✨')
    }
  }, [searchParams, studentDept, isAdmin])

  // 2. Fetch PYQ files whenever department, semester, or my_uploads changes
  useEffect(() => {
    loadFiles()
  }, [filterDept, filterSem, filterMyUploads])

  async function loadFiles(searchOverride?: string, isManualRefresh = false) {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setFetchError(null)

    try {
      const params = new URLSearchParams()
      // Cache-busting timestamp to prevent mobile browsers and proxies from serving stale lists
      params.set('_t', Date.now().toString())

      if (filterMyUploads) {
        params.set('my_uploads', '1')
      } else if (filterDept && filterDept !== 'All') {
        params.set('department', filterDept)
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
      if (isManualRefresh) {
        toast.success('Question papers refreshed!')
      }
    } catch (e: unknown) {
      console.error('[pyq-load-error]', e)
      const msg = (e as Error)?.message || 'Failed to fetch question papers'
      setFetchError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
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

  // Instant client-side filtering on top of fetched items
  const filtered = files.filter(f => {
    const isMyUpload = f.uploaded_by === user?.id || f.uploader_id === user?.id

    // If "My Uploads" filter is active, only show user's own uploads
    if (filterMyUploads && !isMyUpload) {
      return false
    }

    // Department filter (User's own upload is always shown even if looking at another dept)
    if (!filterMyUploads && filterDept !== 'All' && !isMyUpload) {
      if (f.department.toLowerCase() !== filterDept.toLowerCase()) return false
    }

    // Semester filter
    if (filterSem !== 'All') {
      if (String(f.semester) !== String(filterSem)) return false
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchSub = f.subject.toLowerCase().includes(q)
      const matchTitle = (f.file_name || '').toLowerCase().includes(q)
      const matchDept = f.department.toLowerCase().includes(q)
      if (!matchSub && !matchTitle && !matchDept) return false
    }

    return true
  })

  // Count user's own uploads in loaded list
  const myUploadsCount = files.filter(
    f => f.uploaded_by === user?.id || f.uploader_id === user?.id
  ).length

  return (
    <div className="pyq-page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="pyq-header">
        <div>
          <h1 className="pyq-title">📄 Previous Year Questions (PYQs)</h1>
          <p className="pyq-subtitle">Browse and download semester exam question papers</p>
        </div>
        <div className="pyq-header-actions">
          <button
            type="button"
            className="pyq-icon-btn"
            onClick={() => loadFiles(undefined, true)}
            disabled={loading || refreshing}
            title="Refresh question papers list"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading || refreshing ? 'pyq-spin' : ''} />
          </button>
          <Link href="/pyq/upload" className="pyq-upload-btn">
            <Upload size={14} />
            <span>Upload PYQ</span>
          </Link>
        </div>
      </div>

      {/* ── Filter Mode: All / Department / My Uploads ─────────── */}
      <div className="pyq-quick-tabs">
        <button
          type="button"
          className={`pyq-quick-tab ${!filterMyUploads ? 'active' : ''}`}
          onClick={() => {
            setFilterMyUploads(false)
          }}
        >
          <Building2 size={13} />
          <span>All Papers</span>
        </button>

        {user && (
          <button
            type="button"
            className={`pyq-quick-tab ${filterMyUploads ? 'active' : ''}`}
            onClick={() => {
              setFilterMyUploads(true)
            }}
          >
            <UserCheck size={13} />
            <span>My Uploads {myUploadsCount > 0 ? `(${myUploadsCount})` : ''}</span>
          </button>
        )}
      </div>

      {/* ── Department Selector (Available to all students and admins) ── */}
      {!filterMyUploads && (
        <div className="pyq-dept-bar">
          <div className="pyq-dept-bar-header">
            <Building2 size={13} />
            <span>Department:</span>
            {studentDept && (
              <span className="pyq-dept-my-badge">
                Registered: {studentDept}
              </span>
            )}
          </div>
          <div className="pyq-dept-scroll">
            {DEPARTMENTS.map(d => {
              const isUserDept = studentDept && d.toLowerCase() === studentDept.toLowerCase()
              return (
                <button
                  key={d}
                  className={`pyq-dept-chip ${filterDept === d ? 'active' : ''}`}
                  onClick={() => setFilterDept(d)}
                >
                  {d} {isUserDept && d !== 'All' ? '★' : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Search Bar with Submit Button ──────────────────────── */}
      <div className="pyq-search-container">
        <div className="pyq-search-input-wrap">
          <Search size={16} className="pyq-search-icon" />
          <input
            type="text"
            className="pyq-search-input"
            placeholder="Search subject, topic, code..."
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
              <X size={14} />
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
          <GraduationCap size={14} />
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
      {(searchQuery || filterSem !== 'All' || filterDept !== 'All' || filterMyUploads) && (
        <div className="pyq-active-filters">
          <span className="pyq-active-filters-label">Active:</span>
          {filterMyUploads && (
            <span className="pyq-filter-tag">
              My Uploads
              <button onClick={() => setFilterMyUploads(false)}><X size={12} /></button>
            </span>
          )}
          {filterDept !== 'All' && !filterMyUploads && (
            <span className="pyq-filter-tag">
              Dept: {filterDept}
              <button onClick={() => setFilterDept('All')}><X size={12} /></button>
            </span>
          )}
          {filterSem !== 'All' && (
            <span className="pyq-filter-tag">
              Sem {filterSem}
              <button onClick={() => setFilterSem('All')}><X size={12} /></button>
            </span>
          )}
          {searchQuery && (
            <span className="pyq-filter-tag">
              &quot;{searchQuery}&quot;
              <button onClick={handleClearSearch}><X size={12} /></button>
            </span>
          )}
          <button
            className="pyq-clear-all-btn"
            onClick={() => {
              handleClearSearch()
              setFilterSem('All')
              setFilterDept('All')
              setFilterMyUploads(false)
            }}
          >
            Reset All
          </button>
        </div>
      )}

      {/* ── Content View: Error, Loading, Empty, or List ───────── */}
      {fetchError ? (
        <div className="pyq-empty">
          <AlertCircle size={40} color="#ef4444" strokeWidth={1.5} />
          <h3 className="pyq-empty-title">Failed to Load Question Papers</h3>
          <p className="pyq-empty-desc">{fetchError}</p>
          <div className="pyq-empty-actions">
            <button
              className="pyq-reset-btn"
              onClick={() => loadFiles(undefined, true)}
              style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none' }}
            >
              <RefreshCw size={14} style={{ display: 'inline', marginRight: 6 }} /> Try Again
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="pyq-loading">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="pyq-skeleton skeleton-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="pyq-empty">
          <FileText size={42} strokeWidth={1.5} />
          <h3 className="pyq-empty-title">
            {searchQuery
              ? 'No Question Papers Found'
              : filterMyUploads
              ? 'No Uploads Found'
              : 'Uploading Soon 📄'}
          </h3>
          <p className="pyq-empty-desc">
            {searchQuery
              ? `No PYQs matched "${searchQuery}". Try a different keyword.`
              : filterMyUploads
              ? 'You have not uploaded any question papers yet.'
              : filterSem !== 'All'
              ? `No papers found for ${filterDept !== 'All' ? filterDept : 'selected stream'} (Semester ${filterSem}).`
              : `No question papers published yet for ${filterDept !== 'All' ? filterDept : 'this stream'}.`}
          </p>
          <div className="pyq-empty-actions">
            {filterDept !== 'All' && (
              <button
                className="pyq-reset-btn"
                onClick={() => setFilterDept('All')}
                style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontWeight: 700 }}
              >
                Browse All Departments ({files.length} available)
              </button>
            )}
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
            <Link href="/pyq/upload" className="pyq-upload-btn">
              <Upload size={14} /> Upload Paper
            </Link>
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

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this question paper? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style jsx>{`
        .pyq-page {
          max-width: 640px;
          margin: 0 auto;
          padding-bottom: 4.5rem;
        }
        .pyq-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1rem 0.85rem;
          border-bottom: 1px solid var(--border);
        }
        .pyq-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }
        .pyq-subtitle {
          font-size: 0.75rem;
          color: var(--ink-muted);
          margin: 0.2rem 0 0;
        }
        .pyq-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .pyq-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .pyq-icon-btn:hover {
          background: var(--surface2);
        }
        .pyq-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 0.95rem;
          background: var(--accent);
          color: var(--bg);
          border: none;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s;
          text-decoration: none;
        }
        .pyq-upload-btn:hover {
          opacity: 0.9;
        }
        .pyq-quick-tabs {
          display: flex;
          gap: 0.4rem;
          padding: 0.65rem 1rem 0.25rem;
        }
        .pyq-quick-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-muted);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pyq-quick-tab.active {
          border-color: var(--accent);
          background: rgba(212, 175, 55, 0.12);
          color: var(--accent);
          font-weight: 700;
        }
        .pyq-dept-bar {
          padding: 0.45rem 1rem 0.25rem;
        }
        .pyq-dept-bar-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--ink-muted);
          margin-bottom: 0.4rem;
        }
        .pyq-dept-my-badge {
          margin-left: auto;
          font-size: 0.68rem;
          background: var(--surface2);
          padding: 1px 6px;
          border-radius: 4px;
          color: var(--ink);
          font-weight: 600;
        }
        .pyq-dept-scroll {
          display: flex;
          gap: 0.4rem;
          overflow-x: auto;
          padding-bottom: 0.3rem;
          scrollbar-width: none;
        }
        .pyq-dept-scroll::-webkit-scrollbar {
          display: none;
        }
        .pyq-dept-chip {
          flex-shrink: 0;
          padding: 0.35rem 0.8rem;
          border-radius: 99px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          color: var(--ink-muted);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }
        .pyq-dept-chip.active {
          border-color: var(--accent);
          background: rgba(212, 175, 55, 0.12);
          color: var(--accent);
          font-weight: 700;
        }
        .pyq-search-container {
          display: flex;
          gap: 0.5rem;
          padding: 0.6rem 1rem 0.35rem;
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
          height: 38px;
          padding: 0 2.2rem 0 2.4rem;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 11px;
          font-size: 0.84rem;
          color: var(--ink);
          outline: none;
          font-family: inherit;
        }
        .pyq-search-input:focus {
          border-color: var(--accent);
        }
        .pyq-search-clear {
          position: absolute;
          right: 0.65rem;
          width: 20px;
          height: 20px;
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
          padding: 0 0.95rem;
          height: 38px;
          background: var(--accent);
          color: var(--bg);
          border: none;
          border-radius: 11px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
        }
        .pyq-sem-strip-wrap {
          padding: 0.3rem 1rem 0.55rem;
        }
        .pyq-sem-strip-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--ink-muted);
          margin-bottom: 0.35rem;
        }
        .pyq-sem-strip {
          display: flex;
          gap: 0.4rem;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 0.2rem;
        }
        .pyq-sem-strip::-webkit-scrollbar {
          display: none;
        }
        .pyq-sem-chip {
          flex-shrink: 0;
          padding: 0.32rem 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-muted);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }
        .pyq-sem-chip.active {
          border-color: var(--accent);
          background: var(--accent);
          color: var(--bg);
          font-weight: 700;
        }
        .pyq-active-filters {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.4rem;
          padding: 0 1rem 0.55rem;
        }
        .pyq-active-filters-label {
          font-size: 0.72rem;
          color: var(--ink-muted);
          font-weight: 600;
        }
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
        .pyq-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          padding: 0.4rem 1rem 1rem;
        }
        .pyq-card {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 0.95rem;
        }
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
        .pyq-card-info {
          flex: 1;
          min-width: 0;
        }
        .pyq-card-subject {
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--ink);
          margin-bottom: 0.35rem;
          line-height: 1.3;
        }
        .pyq-card-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          color: var(--ink-muted);
          margin-bottom: 0.25rem;
        }
        .pyq-sem-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(109, 74, 255, 0.12);
          color: #7a5af8;
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
        .pyq-card-uploader {
          font-size: 0.69rem;
          color: var(--ink-muted);
        }
        .pyq-card-actions {
          display: flex;
          gap: 0.4rem;
        }
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
        }
        .pyq-download-btn:hover {
          opacity: 0.88;
        }
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
        }
        .pyq-delete-btn:hover {
          background: rgba(232, 93, 78, 0.08);
        }
        .pyq-loading {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          padding: 0.75rem 1rem;
        }
        .pyq-skeleton {
          height: 78px;
          border-radius: 14px;
        }
        .skeleton-pulse {
          background: var(--surface);
          animation: sk-pulse 1.4s ease-in-out infinite;
        }
        @keyframes sk-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        .pyq-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
          padding: 3.5rem 1.5rem;
          color: var(--ink-muted);
          text-align: center;
        }
        .pyq-empty-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0;
        }
        .pyq-empty-desc {
          font-size: 0.8125rem;
          max-width: 380px;
          margin: 0;
          line-height: 1.5;
        }
        .pyq-empty-actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .pyq-reset-btn {
          padding: 0.55rem 0.95rem;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
        }
        .pyq-spin {
          animation: pyqSpin 1s linear infinite;
        }
        @keyframes pyqSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

export default function PYQPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
          <div
            style={{
              height: 80,
              borderRadius: 14,
              background: 'var(--surface)',
              animation: 'sk-pulse 1.4s ease-in-out infinite',
            }}
          />
        </div>
      }
    >
      <PYQContent />
    </Suspense>
  )
}
