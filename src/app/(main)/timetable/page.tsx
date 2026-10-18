'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  CalendarDays, Upload, Trash2, Pencil, X, Download,
  Maximize2, Plus, AlertCircle, CheckCircle2, ChevronDown,
  Building2, GraduationCap, Eye
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { uploadToStorage } from '@/lib/storage'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

export interface TimetableItem {
  id: string
  department: string
  year: string
  title?: string
  image_url: string
  owner_id?: string
  created_at: string
  updated_at: string
}

const DEPARTMENTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Commerce',
  'Economics', 'History', 'Political Science', 'English', 'Hindi', 'Punjabi',
  'Sociology', 'Geography', 'Law', 'Management', 'Education', 'Physical Education',
  'Fine Arts', 'Music', 'Library Science', 'Other',
]

const YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'PG 1st Year',
  'PG 2nd Year',
]

export default function TimetablePage() {
  const { profile, isAdmin } = useAuth()

  const [timetables, setTimetables] = useState<TimetableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userDept, setUserDept] = useState<string>('')

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('All')

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TimetableItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Form states (Admin)
  const [formDept, setFormDept] = useState('')
  const [formYear, setFormYear] = useState(YEARS[0])
  const [formTitle, setFormTitle] = useState('')
  const [formImage, setFormImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load timetables
  async function loadData() {
    setLoading(true)
    try {
      const res = await api.get<{ data: TimetableItem[]; user_department: string; is_admin: boolean }>('/timetable')
      const items = res.data || []
      setTimetables(items)
      const dept = res.user_department || profile?.department || ''
      setUserDept(dept)
      if (!selectedDept) {
        setSelectedDept(isAdmin ? 'All' : (dept || 'Computer Science'))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load timetables')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [profile?.department, isAdmin])

  // Filtered list
  const filteredTimetables = useMemo(() => {
    return timetables.filter(item => {
      // If student, backend already only returns their department
      // But if admin, they can filter by department
      if (isAdmin && selectedDept && selectedDept !== 'All' && item.department !== selectedDept) {
        return false
      }
      if (selectedYear !== 'All' && item.year !== selectedYear) {
        return false
      }
      return true
    })
  }, [timetables, selectedDept, selectedYear, isAdmin])

  // Available years in the current dataset
  const availableYears = useMemo(() => {
    const list = isAdmin && selectedDept && selectedDept !== 'All'
      ? timetables.filter(t => t.department === selectedDept)
      : timetables
    const unique = Array.from(new Set(list.map(t => t.year))).filter(Boolean)
    return unique.sort()
  }, [timetables, selectedDept, isAdmin])

  // Open Add modal
  function handleOpenAdd() {
    setEditingItem(null)
    setFormDept(selectedDept !== 'All' && selectedDept ? selectedDept : (userDept || DEPARTMENTS[0]))
    setFormYear(YEARS[0])
    setFormTitle('')
    setFormImage(null)
    setPreviewUrl(null)
    setModalOpen(true)
  }

  // Open Edit modal
  function handleOpenEdit(item: TimetableItem) {
    setEditingItem(item)
    setFormDept(item.department)
    setFormYear(item.year)
    setFormTitle(item.title || '')
    setFormImage(null)
    setPreviewUrl(item.image_url)
    setModalOpen(true)
  }

  // Handle file select
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WebP)')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size must be under 15MB')
      return
    }
    setFormImage(file)
    const reader = new FileReader()
    reader.onload = () => setPreviewUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Save timetable
  async function handleSave() {
    if (!formDept.trim()) {
      toast.error('Please select a department')
      return
    }
    if (!formYear.trim()) {
      toast.error('Please select a year')
      return
    }
    if (!editingItem && !formImage && !previewUrl) {
      toast.error('Please select a timetable photo')
      return
    }

    setSubmitting(true)
    try {
      let imageUrl = editingItem?.image_url || ''

      // If new file picked, upload to storage
      if (formImage) {
        const ext = formImage.name.split('.').pop() || 'jpg'
        const path = `timetable/${formDept.replace(/\s+/g, '_')}_${formYear.replace(/\s+/g, '_')}_${Date.now()}.${ext}`
        imageUrl = await uploadToStorage(formImage, path)
      }

      if (!imageUrl) {
        throw new Error('Image URL could not be resolved')
      }

      if (editingItem) {
        // Update existing
        await api.put(`/timetable/${editingItem.id}`, {
          department: formDept,
          year: formYear,
          title: formTitle,
          image_url: imageUrl,
        })
        toast.success('Timetable updated successfully!')
      } else {
        // Create new
        await api.post('/timetable', {
          department: formDept,
          year: formYear,
          title: formTitle,
          image_url: imageUrl,
        })
        toast.success('Timetable published successfully!')
      }

      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save timetable')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm delete
  async function handleDelete() {
    if (!deleteId) return
    try {
      await api.delete(`/timetable/${deleteId}`)
      toast.success('Timetable deleted')
      setDeleteId(null)
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete timetable')
    }
  }

  // Download image helper
  async function downloadImage(url: string, filename: string) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || 'timetable.jpg'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
      toast.success('Timetable download started')
    } catch {
      window.open(url, '_blank')
    }
  }

  const effectiveDept = isAdmin
    ? (selectedDept === 'All' ? 'All Departments' : selectedDept)
    : (userDept || profile?.department || 'Your Department')

  return (
    <div className="timetable-container" style={{ paddingBottom: '5rem' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="timetable-header">
        <div className="timetable-header-left">
          <div className="timetable-badge">
            <Building2 size={14} />
            <span>{effectiveDept}</span>
          </div>
          <h1 className="timetable-title">
            {isAdmin ? 'Campus Timetable' : `${effectiveDept} Timetable`}
          </h1>
          <p className="timetable-subtitle">
            {isAdmin
              ? 'Manage and upload official department timetables.'
              : 'Official class schedules and lecture timings for your department.'}
          </p>
        </div>

        {isAdmin && (
          <button className="timetable-upload-btn" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Upload Timetable</span>
          </button>
        )}
      </header>

      {/* ── Filters & Controls ──────────────────────────────────────────── */}
      <div className="timetable-controls">
        {/* Department filter (Admin only) */}
        {isAdmin && (
          <div className="timetable-filter-group">
            <label className="timetable-filter-label">
              <Building2 size={13} /> Department
            </label>
            <div className="timetable-select-wrap">
              <select
                className="timetable-select"
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown size={14} className="timetable-select-arrow" />
            </div>
          </div>
        )}

        {/* Year Pills Filter */}
        <div className="timetable-year-strip" role="tablist" aria-label="Year tabs">
          <button
            role="tab"
            aria-selected={selectedYear === 'All'}
            className={`timetable-year-chip ${selectedYear === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedYear('All')}
          >
            All Years
          </button>
          {YEARS.map(yr => {
            const hasData = timetables.some(t =>
              (isAdmin && selectedDept !== 'All' ? t.department === selectedDept : true) && t.year === yr
            )
            return (
              <button
                key={yr}
                role="tab"
                aria-selected={selectedYear === yr}
                className={`timetable-year-chip ${selectedYear === yr ? 'active' : ''}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr}
                {hasData && <span className="timetable-dot-indicator" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      {loading ? (
        <div className="timetable-loading">
          <div className="spinner" />
          <p>Loading timetables...</p>
        </div>
      ) : filteredTimetables.length === 0 ? (
        /* Empty State */
        <div className="timetable-empty-card">
          <div className="timetable-empty-icon">
            <CalendarDays size={36} />
          </div>
          <h3 className="timetable-empty-title">No Timetable Published Yet</h3>
          <p className="timetable-empty-desc">
            {isAdmin
              ? `There is no timetable uploaded for ${effectiveDept} (${selectedYear}).`
              : `The official timetable for ${effectiveDept} has not been uploaded by the department office yet. Please check back later.`}
          </p>
          {isAdmin && (
            <button className="timetable-empty-action" onClick={handleOpenAdd}>
              <Plus size={16} /> Upload First Timetable
            </button>
          )}
        </div>
      ) : (
        /* Timetable Cards Grid */
        <div className="timetable-grid">
          {filteredTimetables.map(item => (
            <article key={item.id} className="timetable-card">
              {/* Card Header */}
              <div className="timetable-card-head">
                <div>
                  <div className="timetable-card-tags">
                    <span className="timetable-tag-year">
                      <GraduationCap size={13} /> {item.year}
                    </span>
                    {isAdmin && (
                      <span className="timetable-tag-dept">
                        <Building2 size={13} /> {item.department}
                      </span>
                    )}
                  </div>
                  {item.title ? (
                    <h3 className="timetable-card-title">{item.title}</h3>
                  ) : (
                    <h3 className="timetable-card-title">{item.department} - {item.year}</h3>
                  )}
                  <span className="timetable-card-date">
                    Updated {new Date(item.updated_at || item.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="timetable-card-admin-btns">
                    <button
                      className="timetable-icon-btn"
                      title="Edit timetable"
                      onClick={() => handleOpenEdit(item)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="timetable-icon-btn timetable-icon-btn--danger"
                      title="Delete timetable"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* Timetable Image Viewport */}
              <div
                className="timetable-img-wrapper"
                onClick={() => setLightboxUrl(item.image_url)}
                title="Click to view full screen"
              >
                <img
                  src={item.image_url}
                  alt={`${item.department} ${item.year} Timetable`}
                  className="timetable-img"
                  loading="lazy"
                />
                <div className="timetable-img-overlay">
                  <span className="timetable-overlay-hint">
                    <Maximize2 size={15} /> Tap to expand & zoom
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="timetable-card-actions">
                <button
                  className="timetable-action-pill"
                  onClick={() => setLightboxUrl(item.image_url)}
                >
                  <Eye size={15} /> View Fullscreen
                </button>
                <button
                  className="timetable-action-pill timetable-action-pill--accent"
                  onClick={() =>
                    downloadImage(
                      item.image_url,
                      `${item.department}_${item.year}_Timetable.jpg`
                    )
                  }
                >
                  <Download size={15} /> Download Image
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Admin Upload/Edit Modal ─────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="timetable-modal-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget && !submitting) setModalOpen(false)
          }}
        >
          <div className="timetable-modal-sheet" role="dialog" aria-modal="true">
            <div className="timetable-modal-header">
              <div>
                <h2>{editingItem ? 'Edit Timetable' : 'Upload Timetable'}</h2>
                <p>Add official department schedule photo</p>
              </div>
              <button
                className="timetable-modal-close"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="timetable-modal-body">
              {/* Department */}
              <div className="timetable-form-field">
                <label>Department *</label>
                <select
                  value={formDept}
                  onChange={e => setFormDept(e.target.value)}
                  disabled={submitting}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="timetable-form-field">
                <label>Year / Semester *</label>
                <select
                  value={formYear}
                  onChange={e => setFormYear(e.target.value)}
                  disabled={submitting}
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Title / Section Note */}
              <div className="timetable-form-field">
                <label>Title / Section Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Odd Semester 2026 (Section A & B)"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* File Upload / Preview */}
              <div className="timetable-form-field">
                <label>Timetable Photo *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  disabled={submitting}
                />

                {previewUrl ? (
                  <div className="timetable-preview-box">
                    <img src={previewUrl} alt="Preview" className="timetable-preview-img" />
                    <button
                      type="button"
                      className="timetable-change-photo-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <div
                    className="timetable-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={28} className="timetable-dropzone-icon" />
                    <span className="timetable-dropzone-title">Click to upload photo</span>
                    <span className="timetable-dropzone-sub">Supports PNG, JPG, WebP up to 15MB</span>
                  </div>
                )}
              </div>
            </div>

            <div className="timetable-modal-footer">
              <button
                type="button"
                className="timetable-btn-cancel"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="timetable-btn-submit"
                onClick={handleSave}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : (editingItem ? 'Update Timetable' : 'Publish Timetable')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Zoom Lightbox ───────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="timetable-lightbox"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="timetable-lightbox-toolbar" onClick={e => e.stopPropagation()}>
            <button
              className="timetable-lightbox-btn"
              onClick={() => downloadImage(lightboxUrl, 'timetable.jpg')}
              title="Download Image"
            >
              <Download size={18} /> Download
            </button>
            <button
              className="timetable-lightbox-btn timetable-lightbox-btn--close"
              onClick={() => setLightboxUrl(null)}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="timetable-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Timetable fullscreen" className="timetable-lightbox-img" />
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ─────────────────────────────────── */}
      {deleteId && (
        <ConfirmDialog
          title="Delete Timetable?"
          message="Are you sure you want to remove this timetable? Students from this department will no longer see this schedule."
          confirmLabel="Delete Timetable"
          danger={true}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* ── Inlined Timetable Styles ───────────────────────────────────── */}
      <style jsx>{`
        .timetable-container {
          max-width: 840px;
          margin: 0 auto;
          padding: 1.25rem 1rem;
        }

        .timetable-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .timetable-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 999px;
          background: rgba(242, 169, 59, 0.12);
          color: var(--accent);
          margin-bottom: 0.5rem;
        }

        .timetable-title {
          font-family: var(--font-heading);
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 0.25rem;
          letter-spacing: -0.02em;
        }

        .timetable-subtitle {
          font-size: 0.875rem;
          color: var(--ink-muted);
          margin: 0;
          line-height: 1.45;
        }

        .timetable-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.65rem 1.1rem;
          border-radius: 12px;
          background: var(--accent);
          color: #172033;
          font-weight: 700;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(242, 169, 59, 0.25);
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .timetable-upload-btn:hover {
          transform: translateY(-1px);
        }
        .timetable-upload-btn:active {
          transform: scale(0.98);
        }

        /* Controls & Filter */
        .timetable-controls {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .timetable-filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .timetable-filter-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--ink-muted);
          white-space: nowrap;
        }

        .timetable-select-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .timetable-select {
          appearance: none;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--ink);
          font-size: 0.825rem;
          font-weight: 600;
          padding: 0.4rem 2rem 0.4rem 0.75rem;
          border-radius: 10px;
          cursor: pointer;
        }

        .timetable-select-arrow {
          position: absolute;
          right: 8px;
          pointer-events: none;
          color: var(--ink-muted);
        }

        .timetable-year-strip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 2px;
        }
        .timetable-year-strip::-webkit-scrollbar {
          display: none;
        }

        .timetable-year-chip {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--ink-muted);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .timetable-year-chip:hover {
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
          color: var(--ink);
        }
        .timetable-year-chip.active {
          background: var(--accent);
          color: #172033;
          border-color: var(--accent);
          font-weight: 700;
        }

        .timetable-dot-indicator {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.8;
        }

        /* Loading */
        .timetable-loading {
          padding: 4rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--ink-muted);
          font-size: 0.875rem;
        }

        /* Empty State */
        .timetable-empty-card {
          text-align: center;
          padding: 3.5rem 1.5rem;
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: 18px;
          margin-top: 1rem;
        }

        .timetable-empty-icon {
          width: 68px;
          height: 68px;
          border-radius: 20px;
          background: rgba(242, 169, 59, 0.1);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
        }

        .timetable-empty-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 0.5rem;
        }

        .timetable-empty-desc {
          max-width: 440px;
          margin: 0 auto 1.5rem;
          font-size: 0.875rem;
          color: var(--ink-muted);
          line-height: 1.55;
        }

        .timetable-empty-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.6rem 1.25rem;
          border-radius: 12px;
          background: var(--accent);
          color: #172033;
          font-weight: 700;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
        }

        /* Grid & Cards */
        .timetable-grid {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .timetable-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          transition: border-color 0.2s;
        }
        .timetable-card:hover {
          border-color: rgba(242, 169, 59, 0.35);
        }

        .timetable-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
        }

        .timetable-card-tags {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 0.35rem;
        }

        .timetable-tag-year {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
          background: rgba(242, 169, 59, 0.12);
          color: var(--accent);
        }

        .timetable-tag-dept {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
          background: var(--surface-2, rgba(255, 255, 255, 0.06));
          color: var(--ink-muted);
        }

        .timetable-card-title {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 0.2rem;
        }

        .timetable-card-date {
          font-size: 0.75rem;
          color: var(--ink-muted);
        }

        .timetable-card-admin-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .timetable-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .timetable-icon-btn:hover {
          background: var(--surface-2, rgba(255, 255, 255, 0.08));
          color: var(--ink);
        }
        .timetable-icon-btn--danger:hover {
          background: rgba(232, 93, 78, 0.12);
          color: var(--danger);
          border-color: rgba(232, 93, 78, 0.3);
        }

        /* Image Viewport */
        .timetable-img-wrapper {
          position: relative;
          background: #0d121f;
          cursor: zoom-in;
          overflow: hidden;
          min-height: 260px;
          max-height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .timetable-img {
          width: 100%;
          height: auto;
          max-height: 520px;
          object-fit: contain;
          display: block;
          transition: transform 0.25s ease;
        }

        .timetable-img-wrapper:hover .timetable-img {
          transform: scale(1.015);
        }

        .timetable-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, transparent 40%);
          opacity: 0;
          display: flex;
          align-items: flex-end;
          padding: 1rem;
          transition: opacity 0.2s ease;
        }
        .timetable-img-wrapper:hover .timetable-img-overlay {
          opacity: 1;
        }

        .timetable-overlay-hint {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 8px;
        }

        /* Card Footer */
        .timetable-card-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1.25rem;
          background: var(--surface);
          border-top: 1px solid var(--border);
        }

        .timetable-action-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.5rem 0.95rem;
          border-radius: 9px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .timetable-action-pill:hover {
          background: var(--surface-2, rgba(255, 255, 255, 0.08));
        }

        .timetable-action-pill--accent {
          background: var(--surface-2, rgba(255, 255, 255, 0.06));
          color: var(--accent);
          border-color: rgba(242, 169, 59, 0.3);
        }
        .timetable-action-pill--accent:hover {
          background: rgba(242, 169, 59, 0.15);
        }

        /* Modal */
        .timetable-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .timetable-modal-sheet {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
          animation: modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modal-pop {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .timetable-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 1.25rem 1.25rem 1rem;
          border-bottom: 1px solid var(--border);
        }
        .timetable-modal-header h2 {
          font-family: var(--font-heading);
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 0.2rem;
        }
        .timetable-modal-header p {
          font-size: 0.8rem;
          color: var(--ink-muted);
          margin: 0;
        }

        .timetable-modal-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: var(--surface-2, rgba(255, 255, 255, 0.08));
          color: var(--ink-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .timetable-modal-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .timetable-form-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .timetable-form-field label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--ink);
        }
        .timetable-form-field select,
        .timetable-form-field input[type='text'] {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 11px;
          padding: 0.65rem 0.85rem;
          color: var(--ink);
          font-size: 0.875rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .timetable-form-field select:focus,
        .timetable-form-field input[type='text']:focus {
          border-color: var(--accent);
        }

        .timetable-dropzone {
          border: 2px dashed var(--border);
          border-radius: 14px;
          padding: 1.75rem 1rem;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          background: var(--bg);
          transition: border-color 0.2s;
        }
        .timetable-dropzone:hover {
          border-color: var(--accent);
        }

        .timetable-dropzone-icon {
          color: var(--accent);
          margin-bottom: 0.25rem;
        }

        .timetable-dropzone-title {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--ink);
        }

        .timetable-dropzone-sub {
          font-size: 0.75rem;
          color: var(--ink-muted);
        }

        .timetable-preview-box {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #0d121f;
          border: 1px solid var(--border);
          text-align: center;
        }

        .timetable-preview-img {
          width: 100%;
          max-height: 220px;
          object-fit: contain;
          display: block;
        }

        .timetable-change-photo-btn {
          margin: 0.6rem auto;
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink);
          cursor: pointer;
        }

        .timetable-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }

        .timetable-btn-cancel {
          padding: 0.6rem 1.1rem;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--ink-muted);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .timetable-btn-submit {
          padding: 0.6rem 1.25rem;
          border-radius: 10px;
          border: none;
          background: var(--accent);
          color: #172033;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .timetable-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Lightbox */
        .timetable-lightbox {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(0, 0, 0, 0.92);
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fade-in 0.2s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .timetable-lightbox-toolbar {
          position: absolute;
          top: 1rem;
          right: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          z-index: 2010;
        }

        .timetable-lightbox-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.5rem 0.85rem;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(8px);
        }
        .timetable-lightbox-btn--close {
          padding: 0.5rem;
        }

        .timetable-lightbox-content {
          max-width: 96vw;
          max-height: 90vh;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .timetable-lightbox-img {
          max-width: 100%;
          max-height: 88vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  )
}
