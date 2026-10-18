'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  CalendarDays, Upload, Trash2, Pencil, X, Download,
  Maximize2, Plus, ChevronDown, ChevronLeft, ChevronRight,
  Building2, GraduationCap, Eye, Layers, Image as ImageIcon,
  CheckCircle2, FileText
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { uploadToStorage } from '@/lib/storage'
import { DEPARTMENTS } from '@/lib/constants'
import ConfirmDialog from '@/components/ConfirmDialog'
import { toast } from 'sonner'

export interface TimetableItem {
  id: string
  department: string
  year: string
  title?: string
  image_url: string
  images: string[]
  page_count?: number
  owner_id?: string
  created_at: string
  updated_at: string
}

interface PageUploadItem {
  id: string
  file?: File
  previewUrl: string
  isExisting?: boolean
}

const SCOPE_OPTIONS = [
  'All Years / Semesters (Combined)',
  '1st Year (Sem 1-2)',
  '2nd Year (Sem 3-4)',
  '3rd Year (Sem 5-6)',
  '4th Year (Sem 7-8)',
  'PG 1st Year',
  'PG 2nd Year',
]

const FILTER_YEAR_TABS = [
  'All',
  'Combined',
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'PG',
]

export default function TimetablePage() {
  const { profile, isAdmin } = useAuth()

  const [timetables, setTimetables] = useState<TimetableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userDept, setUserDept] = useState<string>('')

  // Active page per timetable card (for cards with multiple pages)
  const [activeCardPages, setActiveCardPages] = useState<Record<string, number>>({})

  // View mode per card: 'carousel' | 'stacked'
  const [cardViewModes, setCardViewModes] = useState<Record<string, 'carousel' | 'stacked'>>({})

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [selectedYearTab, setSelectedYearTab] = useState<string>('All')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TimetableItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Lightbox
  const [lightboxData, setLightboxData] = useState<{ images: string[]; activeIndex: number; title: string } | null>(null)

  // Form states (Admin)
  const [formDept, setFormDept] = useState('')
  const [formYear, setFormYear] = useState(SCOPE_OPTIONS[0])
  const [formTitle, setFormTitle] = useState('')
  const [pageItems, setPageItems] = useState<PageUploadItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load timetables from API
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

  // Filtered timetables list
  const filteredTimetables = useMemo(() => {
    return timetables.filter(item => {
      // Admin department filter
      if (isAdmin && selectedDept && selectedDept !== 'All' && item.department !== selectedDept) {
        return false
      }

      // Year tab filter
      if (selectedYearTab === 'All') return true
      if (selectedYearTab === 'Combined') {
        return item.year.includes('Combined') || item.year.includes('All Years')
      }

      // If a specific year tab is clicked (e.g. "1st Year", "2nd Year"):
      // Show matching year OR combined timetables (since combined covers all years!)
      const isCombined = item.year.includes('Combined') || item.year.includes('All Years')
      const isSpecificMatch = item.year.toLowerCase().includes(selectedYearTab.toLowerCase())
      return isCombined || isSpecificMatch
    })
  }, [timetables, selectedDept, selectedYearTab, isAdmin])

  // Open Add modal
  function handleOpenAdd() {
    setEditingItem(null)
    setFormDept(selectedDept !== 'All' && selectedDept ? selectedDept : (userDept || DEPARTMENTS[0]))
    setFormYear(SCOPE_OPTIONS[0])
    setFormTitle('')
    setPageItems([])
    setModalOpen(true)
  }

  // Open Edit modal
  function handleOpenEdit(item: TimetableItem) {
    setEditingItem(item)
    setFormDept(item.department)
    setFormYear(item.year || SCOPE_OPTIONS[0])
    setFormTitle(item.title || '')
    const existingImages = (item.images && item.images.length > 0) ? item.images : (item.image_url ? [item.image_url] : [])
    setPageItems(
      existingImages.map((url, idx) => ({
        id: `existing_${idx}_${Date.now()}`,
        previewUrl: url,
        isExisting: true,
      }))
    )
    setModalOpen(true)
  }

  // Handle file select (multi-file support)
  function handleFilesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles: PageUploadItem[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" is not an image file`)
        continue
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 15MB size limit`)
        continue
      }

      validFiles.push({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isExisting: false,
      })
    }

    setPageItems(prev => [...prev, ...validFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Remove a page during upload
  function removePageItem(id: string) {
    setPageItems(prev => prev.filter(p => p.id !== id))
  }

  // Move page up/down
  function movePage(index: number, direction: 'up' | 'down') {
    setPageItems(prev => {
      const copy = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= copy.length) return prev
      const temp = copy[index]
      copy[index] = copy[target]
      copy[target] = temp
      return copy
    })
  }

  // Save timetable (Admin)
  async function handleSave() {
    if (!formDept.trim()) {
      toast.error('Please select a department')
      return
    }
    if (pageItems.length === 0) {
      toast.error('Please upload at least 1 timetable photo page')
      return
    }

    setSubmitting(true)
    try {
      const uploadedUrls: string[] = []

      for (let i = 0; i < pageItems.length; i++) {
        const item = pageItems[i]
        if (item.isExisting && item.previewUrl) {
          uploadedUrls.push(item.previewUrl)
        } else if (item.file) {
          const ext = item.file.name.split('.').pop() || 'jpg'
          const safeDept = formDept.replace(/[^a-zA-Z0-9]/g, '_')
          const safeYear = formYear.replace(/[^a-zA-Z0-9]/g, '_')
          const path = `timetable/${safeDept}_${safeYear}_p${i + 1}_${Date.now()}.${ext}`
          const url = await uploadToStorage(item.file, path)
          uploadedUrls.push(url)
        }
      }

      if (uploadedUrls.length === 0) {
        throw new Error('No images could be uploaded')
      }

      if (editingItem) {
        await api.put(`/timetable/${editingItem.id}`, {
          department: formDept,
          year: formYear,
          title: formTitle,
          images: uploadedUrls,
          image_url: uploadedUrls[0],
        })
        toast.success(`Timetable updated successfully with ${uploadedUrls.length} page(s)!`)
      } else {
        await api.post('/timetable', {
          department: formDept,
          year: formYear,
          title: formTitle,
          images: uploadedUrls,
          image_url: uploadedUrls[0],
        })
        toast.success(`Official timetable published with ${uploadedUrls.length} page(s)!`)
      }

      setModalOpen(false)
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save timetable')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete timetable
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
      toast.success('Download started')
    } catch {
      window.open(url, '_blank')
    }
  }

  // Download all pages of a timetable
  async function downloadAllPages(item: TimetableItem) {
    const list = item.images && item.images.length > 0 ? item.images : [item.image_url]
    toast.info(`Downloading ${list.length} page(s)...`)
    for (let i = 0; i < list.length; i++) {
      await downloadImage(list[i], `${item.department}_Timetable_Page_${i + 1}.jpg`)
    }
  }

  // Helper for active page index on a card
  function getActivePageIndex(cardId: string, maxPages: number) {
    const idx = activeCardPages[cardId] || 0
    return Math.min(Math.max(0, idx), maxPages - 1)
  }

  function setCardActivePage(cardId: string, nextIdx: number) {
    setActiveCardPages(prev => ({ ...prev, [cardId]: nextIdx }))
  }

  function toggleCardViewMode(cardId: string) {
    setCardViewModes(prev => ({
      ...prev,
      [cardId]: prev[cardId] === 'stacked' ? 'carousel' : 'stacked',
    }))
  }

  // Keyboard navigation for Lightbox
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!lightboxData) return
      if (e.key === 'Escape') setLightboxData(null)
      if (e.key === 'ArrowLeft' && lightboxData.activeIndex > 0) {
        setLightboxData(prev => prev ? { ...prev, activeIndex: prev.activeIndex - 1 } : null)
      }
      if (e.key === 'ArrowRight' && lightboxData.activeIndex < lightboxData.images.length - 1) {
        setLightboxData(prev => prev ? { ...prev, activeIndex: prev.activeIndex + 1 } : null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxData])

  const effectiveDept = isAdmin
    ? (selectedDept === 'All' ? 'All Departments' : selectedDept)
    : (userDept || profile?.department || 'Your Department')

  return (
    <div className="timetable-container" style={{ paddingBottom: '5rem' }}>
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <header className="timetable-header">
        <div className="timetable-header-left">
          <div className="timetable-badge">
            <Building2 size={14} />
            <span>{effectiveDept}</span>
          </div>
          <h1 className="timetable-title">
            {isAdmin ? 'Campus Timetables' : `${effectiveDept} Timetable`}
          </h1>
          <p className="timetable-subtitle">
            {isAdmin
              ? 'Upload and manage official multi-page department schedules.'
              : 'Official class schedules, batch divisions, and lecture timings for your department.'}
          </p>
        </div>

        {isAdmin && (
          <button className="timetable-upload-btn" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Upload Timetable</span>
          </button>
        )}
      </header>

      {/* ── Filters & Navigation ────────────────────────────────────────── */}
      <div className="timetable-controls">
        {/* Department filter (Admin only) */}
        {isAdmin && (
          <div className="timetable-filter-group">
            <label className="timetable-filter-label">
              <Building2 size={13} /> Select Department:
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

        {/* Year Filter Tabs */}
        <div className="timetable-year-strip" role="tablist" aria-label="Year tabs">
          {FILTER_YEAR_TABS.map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={selectedYearTab === tab}
              className={`timetable-year-chip ${selectedYearTab === tab ? 'active' : ''}`}
              onClick={() => setSelectedYearTab(tab)}
            >
              {tab === 'All' ? 'All Timetables' : tab === 'Combined' ? '⚡ Combined (All Sems)' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content / Cards List ───────────────────────────────────── */}
      {loading ? (
        <div className="timetable-loading">
          <div className="spinner" />
          <p>Loading department timetable...</p>
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
              ? `There is no timetable uploaded for ${effectiveDept} (${selectedYearTab}).`
              : `The official timetable for ${effectiveDept} has not been published yet by the department office. Please check back later.`}
          </p>
          {isAdmin && (
            <button className="timetable-empty-action" onClick={handleOpenAdd}>
              <Plus size={16} /> Upload First Timetable
            </button>
          )}
        </div>
      ) : (
        /* Timetable Cards */
        <div className="timetable-grid">
          {filteredTimetables.map(item => {
            const pageList = (item.images && item.images.length > 0)
              ? item.images
              : (item.image_url ? [item.image_url] : [])
            const totalPages = pageList.length
            const activePageIdx = getActivePageIndex(item.id, totalPages)
            const activeImageUrl = pageList[activePageIdx] || item.image_url
            const isStacked = cardViewModes[item.id] === 'stacked'

            return (
              <article key={item.id} className="timetable-card">
                {/* Card Header */}
                <div className="timetable-card-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="timetable-card-tags">
                      <span className="timetable-tag-year">
                        <GraduationCap size={13} /> {item.year}
                      </span>
                      {totalPages > 1 && (
                        <span className="timetable-tag-pages">
                          <Layers size={12} /> {totalPages} Pages
                        </span>
                      )}
                      {isAdmin && (
                        <span className="timetable-tag-dept">
                          <Building2 size={13} /> {item.department}
                        </span>
                      )}
                    </div>
                    <h3 className="timetable-card-title">
                      {item.title ? item.title : `${item.department} Timetable`}
                    </h3>
                    <span className="timetable-card-date">
                      Published {new Date(item.updated_at || item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Actions for Admin */}
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

                {/* Multi-Page Navigation Bar (when 2+ pages) */}
                {totalPages > 1 && (
                  <div className="timetable-multipage-bar">
                    <div className="timetable-page-pills">
                      {pageList.map((_, pIdx) => (
                        <button
                          key={pIdx}
                          className={`timetable-page-pill-btn ${activePageIdx === pIdx && !isStacked ? 'active' : ''}`}
                          onClick={() => {
                            if (isStacked) toggleCardViewMode(item.id)
                            setCardActivePage(item.id, pIdx)
                          }}
                        >
                          Page {pIdx + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      className={`timetable-mode-toggle ${isStacked ? 'active' : ''}`}
                      onClick={() => toggleCardViewMode(item.id)}
                      title={isStacked ? 'Switch to single page view' : 'View all pages together'}
                    >
                      <Layers size={13} />
                      <span>{isStacked ? 'Single Page' : 'Show All Pages'}</span>
                    </button>
                  </div>
                )}

                {/* Timetable Image Viewport */}
                {isStacked && totalPages > 1 ? (
                  /* Stacked Multi-Page View */
                  <div className="timetable-stacked-wrap">
                    {pageList.map((pUrl, pIdx) => (
                      <div key={pIdx} className="timetable-stacked-page">
                        <div className="timetable-stacked-badge">
                          <span>Page {pIdx + 1} of {totalPages}</span>
                          <button
                            className="timetable-stacked-zoom-btn"
                            onClick={() =>
                              setLightboxData({
                                images: pageList,
                                activeIndex: pIdx,
                                title: item.title || `${item.department} Timetable`,
                              })
                            }
                          >
                            <Maximize2 size={13} /> Zoom
                          </button>
                        </div>
                        <img
                          src={pUrl}
                          alt={`${item.department} Page ${pIdx + 1}`}
                          className="timetable-img"
                          loading="lazy"
                          onClick={() =>
                            setLightboxData({
                              images: pageList,
                              activeIndex: pIdx,
                              title: item.title || `${item.department} Timetable`,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Carousel / Single Page View */
                  <div className="timetable-img-wrapper">
                    <img
                      src={activeImageUrl}
                      alt={`${item.department} - Page ${activePageIdx + 1}`}
                      className="timetable-img"
                      loading="lazy"
                      onClick={() =>
                        setLightboxData({
                          images: pageList,
                          activeIndex: activePageIdx,
                          title: item.title || `${item.department} Timetable`,
                        })
                      }
                    />

                    {/* Navigation Arrows for Multi-Page */}
                    {totalPages > 1 && (
                      <>
                        <button
                          className="timetable-nav-arrow timetable-nav-arrow--prev"
                          disabled={activePageIdx === 0}
                          onClick={e => {
                            e.stopPropagation()
                            setCardActivePage(item.id, activePageIdx - 1)
                          }}
                          aria-label="Previous Page"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          className="timetable-nav-arrow timetable-nav-arrow--next"
                          disabled={activePageIdx === totalPages - 1}
                          onClick={e => {
                            e.stopPropagation()
                            setCardActivePage(item.id, activePageIdx + 1)
                          }}
                          aria-label="Next Page"
                        >
                          <ChevronRight size={20} />
                        </button>

                        <div className="timetable-page-counter-tag">
                          Page {activePageIdx + 1} of {totalPages}
                        </div>
                      </>
                    )}

                    <div
                      className="timetable-img-overlay"
                      onClick={() =>
                        setLightboxData({
                          images: pageList,
                          activeIndex: activePageIdx,
                          title: item.title || `${item.department} Timetable`,
                        })
                      }
                    >
                      <span className="timetable-overlay-hint">
                        <Maximize2 size={15} /> Tap to expand & zoom
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="timetable-card-actions">
                  <button
                    className="timetable-action-pill"
                    onClick={() =>
                      setLightboxData({
                        images: pageList,
                        activeIndex: activePageIdx,
                        title: item.title || `${item.department} Timetable`,
                      })
                    }
                  >
                    <Eye size={15} /> Fullscreen Zoom
                  </button>

                  <button
                    className="timetable-action-pill timetable-action-pill--accent"
                    onClick={() =>
                      downloadImage(
                        activeImageUrl,
                        `${item.department}_${item.year}_Page_${activePageIdx + 1}.jpg`
                      )
                    }
                  >
                    <Download size={15} /> Download Page {totalPages > 1 ? activePageIdx + 1 : ''}
                  </button>

                  {totalPages > 1 && (
                    <button
                      className="timetable-action-pill"
                      onClick={() => downloadAllPages(item)}
                      title="Download all pages of this timetable"
                    >
                      <Download size={15} /> Download All ({totalPages})
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ── Admin Multi-Page Upload/Edit Modal ───────────────────────────── */}
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
                <p>Support for multi-page official department timetables</p>
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
                <label>Department (Same as Registration) *</label>
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

              {/* Year / Semester Scope */}
              <div className="timetable-form-field">
                <label>Year / Semester Scope *</label>
                <select
                  value={formYear}
                  onChange={e => setFormYear(e.target.value)}
                  disabled={submitting}
                >
                  {SCOPE_OPTIONS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="timetable-field-hint">
                  Most university timetables cover all semesters together. Choose &quot;All Years / Semesters (Combined)&quot; for full department timetables.
                </span>
              </div>

              {/* Title / Session Note */}
              <div className="timetable-form-field">
                <label>Title / Session Details (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. BCA Odd Semester Session 2026-27 w.e.f 06-10-2026"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Multi-Page Photo Upload */}
              <div className="timetable-form-field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label>Timetable Pages / Photos * ({pageItems.length} selected)</label>
                  <button
                    type="button"
                    className="timetable-add-page-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                  >
                    <Plus size={14} /> Add More Pages
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFilesSelect}
                  disabled={submitting}
                />

                {pageItems.length === 0 ? (
                  <div
                    className="timetable-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={32} className="timetable-dropzone-icon" />
                    <span className="timetable-dropzone-title">Click to upload timetable photos</span>
                    <span className="timetable-dropzone-sub">
                      You can select multiple pages at once (Page 1, Page 2, Page 3...)
                    </span>
                  </div>
                ) : (
                  <div className="timetable-pages-list">
                    {pageItems.map((p, idx) => (
                      <div key={p.id} className="timetable-page-row">
                        <span className="timetable-page-num-badge">Page {idx + 1}</span>
                        <div className="timetable-page-thumb-wrap">
                          <img src={p.previewUrl} alt={`Page ${idx + 1}`} className="timetable-page-thumb" />
                        </div>
                        <div className="timetable-page-row-info">
                          <strong>{p.file ? p.file.name : `Page ${idx + 1}`}</strong>
                          <small>{p.file ? `${(p.file.size / 1024 / 1024).toFixed(2)} MB` : 'Existing page'}</small>
                        </div>
                        <div className="timetable-page-row-actions">
                          {idx > 0 && (
                            <button
                              type="button"
                              className="timetable-page-mini-btn"
                              onClick={() => movePage(idx, 'up')}
                              title="Move up"
                            >
                              ↑
                            </button>
                          )}
                          {idx < pageItems.length - 1 && (
                            <button
                              type="button"
                              className="timetable-page-mini-btn"
                              onClick={() => movePage(idx, 'down')}
                              title="Move down"
                            >
                              ↓
                            </button>
                          )}
                          <button
                            type="button"
                            className="timetable-page-mini-btn timetable-page-mini-btn--danger"
                            onClick={() => removePageItem(p.id)}
                            title="Remove page"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
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
                disabled={submitting || pageItems.length === 0}
              >
                {submitting
                  ? 'Uploading & Saving...'
                  : (editingItem ? 'Update Timetable' : `Publish (${pageItems.length} Pages)`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Multi-Page Lightbox ────────────────────────────────────────── */}
      {lightboxData && (
        <div
          className="timetable-lightbox"
          onClick={() => setLightboxData(null)}
        >
          <div className="timetable-lightbox-toolbar" onClick={e => e.stopPropagation()}>
            <span className="timetable-lightbox-title">
              {lightboxData.title} · Page {lightboxData.activeIndex + 1} of {lightboxData.images.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="timetable-lightbox-btn"
                onClick={() =>
                  downloadImage(
                    lightboxData.images[lightboxData.activeIndex],
                    `Timetable_Page_${lightboxData.activeIndex + 1}.jpg`
                  )
                }
                title="Download this page"
              >
                <Download size={16} /> Download Page
              </button>
              <button
                className="timetable-lightbox-btn timetable-lightbox-btn--close"
                onClick={() => setLightboxData(null)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="timetable-lightbox-content" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxData.images[lightboxData.activeIndex]}
              alt={`Page ${lightboxData.activeIndex + 1}`}
              className="timetable-lightbox-img"
            />

            {/* Lightbox Next/Prev Arrows */}
            {lightboxData.images.length > 1 && (
              <>
                <button
                  className="timetable-lightbox-arrow timetable-lightbox-arrow--prev"
                  disabled={lightboxData.activeIndex === 0}
                  onClick={() =>
                    setLightboxData(prev =>
                      prev && prev.activeIndex > 0 ? { ...prev, activeIndex: prev.activeIndex - 1 } : prev
                    )
                  }
                  title="Previous Page"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  className="timetable-lightbox-arrow timetable-lightbox-arrow--next"
                  disabled={lightboxData.activeIndex === lightboxData.images.length - 1}
                  onClick={() =>
                    setLightboxData(prev =>
                      prev && prev.activeIndex < prev.images.length - 1
                        ? { ...prev, activeIndex: prev.activeIndex + 1 }
                        : prev
                    )
                  }
                  title="Next Page"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ─────────────────────────────────── */}
      {deleteId && (
        <ConfirmDialog
          title="Delete Timetable?"
          message="Are you sure you want to delete this timetable and all its pages? Students from this department will no longer see this schedule."
          confirmLabel="Delete Timetable"
          danger={true}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* ── Component Styles ───────────────────────────────────────────── */}
      <style jsx>{`
        .timetable-container {
          max-width: 860px;
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
          padding: 0.65rem 1.15rem;
          border-radius: 12px;
          background: var(--accent);
          color: #172033;
          font-weight: 700;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(242, 169, 59, 0.25);
          transition: transform 0.15s ease;
        }
        .timetable-upload-btn:hover {
          transform: translateY(-1px);
        }

        /* Controls */
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
          gap: 5px;
          font-size: 0.825rem;
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
          padding: 0.45rem 2.2rem 0.45rem 0.85rem;
          border-radius: 10px;
          cursor: pointer;
        }

        .timetable-select-arrow {
          position: absolute;
          right: 9px;
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
          display: inline-flex;
          align-items: center;
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
          color: var(--ink);
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
        }
        .timetable-year-chip.active {
          background: var(--accent);
          color: #172033;
          border-color: var(--accent);
          font-weight: 700;
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

        /* Card Styles */
        .timetable-grid {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .timetable-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
          transition: border-color 0.2s;
        }
        .timetable-card:hover {
          border-color: rgba(242, 169, 59, 0.35);
        }

        .timetable-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 1.15rem 1.35rem;
          border-bottom: 1px solid var(--border);
        }

        .timetable-card-tags {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 0.4rem;
          flex-wrap: wrap;
        }

        .timetable-tag-year {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2.5px 8px;
          border-radius: 6px;
          background: rgba(242, 169, 59, 0.14);
          color: var(--accent);
        }

        .timetable-tag-pages {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2.5px 7px;
          border-radius: 6px;
          background: rgba(82, 110, 242, 0.12);
          color: #7b94ff;
        }

        .timetable-tag-dept {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2.5px 7px;
          border-radius: 6px;
          background: var(--surface-2, rgba(255, 255, 255, 0.06));
          color: var(--ink-muted);
        }

        .timetable-card-title {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 0.25rem;
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
        }
        .timetable-icon-btn:hover {
          color: var(--ink);
          background: var(--surface-2, rgba(255, 255, 255, 0.08));
        }
        .timetable-icon-btn--danger:hover {
          color: var(--danger);
          background: rgba(232, 93, 78, 0.12);
        }

        /* Multipage Bar */
        .timetable-multipage-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          background: var(--surface-2, rgba(255, 255, 255, 0.02));
          border-bottom: 1px solid var(--border);
        }

        .timetable-page-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
        }

        .timetable-page-pill-btn {
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-muted);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .timetable-page-pill-btn.active {
          background: var(--accent);
          color: #172033;
          border-color: var(--accent);
          font-weight: 700;
        }

        .timetable-mode-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--ink-muted);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
        }
        .timetable-mode-toggle.active {
          color: var(--accent);
          border-color: rgba(242, 169, 59, 0.35);
          background: rgba(242, 169, 59, 0.1);
        }

        /* Image Viewport */
        .timetable-img-wrapper {
          position: relative;
          background: #0d121f;
          cursor: zoom-in;
          overflow: hidden;
          min-height: 280px;
          max-height: 560px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .timetable-img {
          width: 100%;
          height: auto;
          max-height: 560px;
          object-fit: contain;
          display: block;
        }

        .timetable-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.4) 0%, transparent 40%);
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
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 5px 11px;
          border-radius: 8px;
        }

        .timetable-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 5;
          transition: background 0.15s;
        }
        .timetable-nav-arrow:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.85);
        }
        .timetable-nav-arrow:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .timetable-nav-arrow--prev {
          left: 12px;
        }
        .timetable-nav-arrow--next {
          right: 12px;
        }

        .timetable-page-counter-tag {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          z-index: 5;
        }

        /* Stacked Multi-page View */
        .timetable-stacked-wrap {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.25rem;
          background: #0d121f;
        }

        .timetable-stacked-page {
          border-radius: 12px;
          overflow: hidden;
          background: #141b2d;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .timetable-stacked-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.85rem;
          background: rgba(0, 0, 0, 0.4);
          font-size: 0.75rem;
          font-weight: 700;
          color: #ffffff;
        }

        .timetable-stacked-zoom-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 0.72rem;
          cursor: pointer;
        }

        /* Card Footer Actions */
        .timetable-card-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.85rem 1.25rem;
          background: var(--surface);
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
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

        /* Modal Sheet */
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
          max-width: 540px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
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
        .timetable-field-hint {
          font-size: 0.73rem;
          color: var(--ink-muted);
          line-height: 1.35;
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
        }
        .timetable-form-field select:focus,
        .timetable-form-field input[type='text']:focus {
          border-color: var(--accent);
        }

        .timetable-add-page-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface-2, rgba(255, 255, 255, 0.05));
          color: var(--accent);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
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

        /* Page items list in modal */
        .timetable-pages-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .timetable-page-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.85rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .timetable-page-num-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
          background: var(--accent);
          color: #172033;
          white-space: nowrap;
        }

        .timetable-page-thumb-wrap {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          overflow: hidden;
          background: #0d121f;
          flex-shrink: 0;
        }

        .timetable-page-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .timetable-page-row-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .timetable-page-row-info strong {
          font-size: 0.8125rem;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .timetable-page-row-info small {
          font-size: 0.7rem;
          color: var(--ink-muted);
        }

        .timetable-page-row-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .timetable-page-mini-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .timetable-page-mini-btn--danger:hover {
          color: var(--danger);
          background: rgba(232, 93, 78, 0.12);
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
        }
        .timetable-btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Lightbox */
        .timetable-lightbox {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(0, 0, 0, 0.94);
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .timetable-lightbox-toolbar {
          position: absolute;
          top: 1rem;
          left: 1rem;
          right: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2010;
        }

        .timetable-lightbox-title {
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
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
          max-height: 88vh;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .timetable-lightbox-img {
          max-width: 100%;
          max-height: 86vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
        }

        .timetable-lightbox-arrow {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 2020;
        }
        .timetable-lightbox-arrow:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.9);
        }
        .timetable-lightbox-arrow:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }
        .timetable-lightbox-arrow--prev {
          left: 20px;
        }
        .timetable-lightbox-arrow--next {
          right: 20px;
        }
      `}</style>
    </div>
  )
}
