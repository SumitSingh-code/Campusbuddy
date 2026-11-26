'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link2,
  Building2,
  GraduationCap,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { uploadToStorage } from '@/lib/storage'
import { fmtBytes } from '@/lib/format'
import { DEPARTMENTS as CRSU_DEPARTMENTS } from '@/lib/constants'
import { toast } from 'sonner'

export default function PYQUploadPage() {
  const router = useRouter()
  const { user, profile, isAdmin } = useAuth()

  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file')
  const [linkUrl, setLinkUrl] = useState('')
  const [subject, setSubject] = useState('')
  const [semester, setSemester] = useState('')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [department, setDepartment] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const studentDept = (profile?.department || '').trim()

  // 1. Restore saved draft on mount (survives any aggressive OS kills)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('unigram_pyq_draft')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.subject) setSubject(d.subject)
        if (d.semester) setSemester(d.semester)
        if (d.year) setYear(d.year)
        if (d.department) setDepartment(d.department)
        if (d.linkUrl) setLinkUrl(d.linkUrl)
        if (d.uploadMode) setUploadMode(d.uploadMode)
      }
    } catch {}
  }, [])

  // 2. Persist draft on every keystroke
  useEffect(() => {
    try {
      localStorage.setItem(
        'unigram_pyq_draft',
        JSON.stringify({
          subject,
          semester,
          year,
          department,
          linkUrl,
          uploadMode,
        })
      )
    } catch {}
  }, [subject, semester, year, department, linkUrl, uploadMode])

  // 3. Auto-populate department
  useEffect(() => {
    if (!isAdmin && studentDept) {
      setDepartment(studentDept)
    } else if (!department && studentDept) {
      setDepartment(studentDept)
    } else if (!department && CRSU_DEPARTMENTS.length > 0) {
      setDepartment(CRSU_DEPARTMENTS[0])
    }
  }, [studentDept, isAdmin, department])

  // Clear form error when user edits any field
  useEffect(() => {
    if (formError) setFormError(null)
  }, [subject, semester, year, department, linkUrl, uploadMode, file])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFormError(null)
    const f = e.target.files?.[0]
    if (!f) return

    if (f.size > 15 * 1024 * 1024) {
      setFormError(`PDF file is ${fmtBytes(f.size)}, max allowed size is 15MB.`)
      toast.error('File exceeds 15MB limit')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFile(f)
    toast.success(`Selected: ${f.name} (${fmtBytes(f.size)})`)
  }

  async function handleUpload() {
    setFormError(null)
    const finalDept = !isAdmin && studentDept ? studentDept : department.trim()
    if (!subject.trim()) {
      setFormError('Please enter the subject name')
      toast.error('Please enter the subject name')
      return
    }
    if (!semester) {
      setFormError('Please select a semester (Sem 1 to 8)')
      toast.error('Please select the semester')
      return
    }
    if (!year || isNaN(parseInt(year))) {
      setFormError('Please enter a valid exam year (e.g. 2024)')
      toast.error('Please enter a valid exam year')
      return
    }
    if (!finalDept) {
      setFormError('Please select a department')
      toast.error('Please select a department')
      return
    }

    if (uploadMode === 'link') {
      const trimmedLink = linkUrl.trim()
      if (!trimmedLink) {
        setFormError('Please enter the PDF or Google Drive share link')
        toast.error('Please enter the PDF or Google Drive link')
        return
      }
      if (!trimmedLink.startsWith('http://') && !trimmedLink.startsWith('https://')) {
        setFormError('Please enter a valid URL starting with https://')
        toast.error('Please enter a valid URL starting with https://')
        return
      }
    } else {
      if (!file) {
        setFormError('Please tap the box above to select your PDF question paper')
        toast.error('Please select a PDF file first')
        return
      }
      if (file.size > 15 * 1024 * 1024) {
        setFormError('PDF file is too large (max 15MB).')
        toast.error('PDF file is too large (max 15MB).')
        return
      }
    }

    setUploading(true)
    setUploadStep('Connecting to university vault…')
    try {
      let finalUrl = ''
      let finalFileName = ''
      let finalFileSize = 0

      if (uploadMode === 'link') {
        finalUrl = linkUrl.trim()
        finalFileName = `${subject.trim()}_CRSU.pdf`
        finalFileSize = 0
      } else {
        const uploaderId = user?.id || profile?.id || 'admin'
        setUploadStep('Uploading PDF directly to secure vault…')
        finalUrl = await uploadToStorage(file!, `pyq/${uploaderId}/${Date.now()}_${file!.name}`)
        finalFileName = file!.name
        finalFileSize = file!.size
      }

      setUploadStep('Publishing to student directory…')
      await api.post('/pyq', {
        title: subject.trim(),
        subject: subject.trim(),
        semester: parseInt(semester),
        year: parseInt(year),
        exam_type: 'end',
        department: finalDept,
        file_url: finalUrl,
        file_name: finalFileName,
        file_size: finalFileSize,
        file_size_bytes: finalFileSize,
      })

      toast.success('Question paper published successfully! 🎉')
      try {
        localStorage.removeItem('unigram_pyq_draft')
      } catch {}

      // Return to PYQ catalog
      router.push('/pyq')
    } catch (e: unknown) {
      console.error('[pyq-upload-page]', e)
      const errMsg = (e as Error)?.message || 'Upload failed'
      if (errMsg.includes('413') || errMsg.toLowerCase().includes('payload') || errMsg.toLowerCase().includes('large')) {
        setFormError('File size is too large for mobile network. Please use the Google Drive link tab.')
        toast.error('File size too large for mobile network')
      } else if (errMsg.includes('504') || errMsg.toLowerCase().includes('timeout')) {
        setFormError('Upload timed out on mobile connection. Please retry or use Google Drive link tab.')
        toast.error('Upload timed out on mobile data')
      } else {
        setFormError(errMsg)
        toast.error(errMsg)
      }
    } finally {
      setUploading(false)
      setUploadStep('')
    }
  }

  return (
    <div className="pyq-upload-page">
      {/* Top Bar */}
      <div className="pyq-up-nav">
        <Link href="/pyq" className="pyq-up-back-btn">
          <ArrowLeft size={18} />
          <span>Back to PYQs</span>
        </Link>
        <h1 className="pyq-up-title">Upload Question Paper</h1>
      </div>

      <div className="pyq-up-card">
        {/* Method Switcher */}
        <div className="pyq-up-switcher">
          <button
            type="button"
            className={`pyq-up-switch-btn ${uploadMode === 'file' ? 'active' : ''}`}
            onClick={() => setUploadMode('file')}
          >
            <Upload size={16} />
            <span>Upload PDF File</span>
          </button>
          <button
            type="button"
            className={`pyq-up-switch-btn ${uploadMode === 'link' ? 'active' : ''}`}
            onClick={() => setUploadMode('link')}
          >
            <Link2 size={16} />
            <span>Google Drive Link</span>
          </button>
        </div>

        {/* Subject */}
        <div className="pyq-up-field">
          <label className="pyq-up-label">Subject Name *</label>
          <input
            className="pyq-up-input"
            placeholder="e.g. Operating Systems, Data Structures, English..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        {/* Semester & Year */}
        <div className="pyq-up-grid">
          <div className="pyq-up-field">
            <label className="pyq-up-label">Semester *</label>
            <select
              className="pyq-up-input"
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

          <div className="pyq-up-field">
            <label className="pyq-up-label">Exam Year *</label>
            <input
              className="pyq-up-input"
              type="number"
              min="2000"
              max={new Date().getFullYear() + 2}
              value={year}
              onChange={e => setYear(e.target.value)}
            />
          </div>
        </div>

        {/* Department */}
        <div className="pyq-up-field">
          <label className="pyq-up-label">Department *</label>
          {!isAdmin && studentDept ? (
            <div>
              <input
                className="pyq-up-input"
                value={studentDept}
                disabled
                readOnly
                style={{ opacity: 0.85, background: 'var(--surface2)', cursor: 'not-allowed' }}
              />
              <p className="pyq-up-hint">Locked to your registered university department</p>
            </div>
          ) : (
            <select
              className="pyq-up-input"
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

        {/* File Box or Link Box */}
        {uploadMode === 'file' ? (
          <div className="pyq-up-field">
            <label className="pyq-up-label">Question Paper PDF *</label>
            <div className="pyq-up-filebox">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="pyq-up-native-input"
                onChange={handleFileSelect}
              />

              {file ? (
                <div className="pyq-up-file-selected">
                  <div className="pyq-up-file-header">
                    <FileText size={28} className="pyq-up-pdf-icon" />
                    <div className="pyq-up-file-meta">
                      <span className="pyq-up-file-name">{file.name}</span>
                      <div className="pyq-up-file-badges">
                        <span className="pyq-up-badge-ready">READY</span>
                        <span className="pyq-up-badge-size">{fmtBytes(file.size)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pyq-up-remove-btn"
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        setFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <span className="pyq-up-change-hint">Tap card to select a different PDF</span>
                </div>
              ) : (
                <div className="pyq-up-file-empty">
                  <Upload size={32} className="pyq-up-upload-icon" />
                  <span className="pyq-up-file-cta">Tap to select PDF from device</span>
                  <span className="pyq-up-file-subtext">PDF document up to 15MB</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pyq-up-field">
            <label className="pyq-up-label">Google Drive or Cloud PDF Link *</label>
            <input
              className="pyq-up-input"
              placeholder="https://drive.google.com/file/d/... or any shareable PDF link"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
            />
            <p className="pyq-up-hint">
              ⚡ <strong>100% Instant &amp; Crash-Proof:</strong> Paste any shareable Google Drive, Dropbox, or OneDrive link.
            </p>
          </div>
        )}

        {/* Live Error Banner */}
        {formError && (
          <div className="pyq-up-error-banner" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        {/* Live Progress Banner */}
        {uploading && (
          <div className="pyq-up-progress-banner">
            <Loader2 size={18} className="pyq-up-spin" />
            <span>{uploadStep || 'Publishing paper…'}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          className="pyq-up-submit-btn"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="pyq-up-spin" />
              <span>{uploadStep || 'Publishing Paper…'}</span>
            </>
          ) : (
            'Publish Question Paper'
          )}
        </button>
      </div>

      <style jsx>{`
        .pyq-upload-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem 1rem 4rem;
        }
        .pyq-up-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .pyq-up-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--ink-muted);
          text-decoration: none;
          font-size: 0.825rem;
          font-weight: 600;
          width: fit-content;
        }
        .pyq-up-back-btn:hover {
          color: var(--accent);
        }
        .pyq-up-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }
        .pyq-up-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .pyq-up-switcher {
          display: flex;
          gap: 6px;
          background: var(--surface2);
          padding: 4px;
          border-radius: 12px;
        }
        .pyq-up-switch-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 9px;
          border: none;
          font-weight: 700;
          font-size: 0.8125rem;
          cursor: pointer;
          background: transparent;
          color: var(--ink-muted);
          transition: all 0.15s ease;
        }
        .pyq-up-switch-btn.active {
          background: var(--accent);
          color: var(--bg);
        }
        .pyq-up-field {
          display: flex;
          flex-direction: column;
        }
        .pyq-up-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 0.35rem;
        }
        .pyq-up-hint {
          font-size: 0.72rem;
          color: var(--ink-muted);
          margin: 0.3rem 0 0;
          line-height: 1.4;
        }
        .pyq-up-input {
          width: 100%;
          background: var(--bg);
          border: 1.5px solid var(--border);
          border-radius: 10px;
          padding: 0.7rem 0.85rem;
          font-size: 0.875rem;
          color: var(--ink);
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }
        .pyq-up-input:focus {
          border-color: var(--accent);
        }
        .pyq-up-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .pyq-up-filebox {
          position: relative;
          border: 2px dashed var(--border);
          border-radius: 14px;
          padding: 1.5rem 1rem;
          background: var(--bg);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          overflow: hidden;
        }
        .pyq-up-filebox:hover {
          border-color: var(--accent);
        }
        .pyq-up-native-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          z-index: 5;
        }
        .pyq-up-file-empty {
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.35rem;
        }
        .pyq-up-upload-icon {
          color: var(--accent);
          margin-bottom: 4px;
        }
        .pyq-up-file-cta {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--ink);
        }
        .pyq-up-file-subtext {
          font-size: 0.725rem;
          color: var(--ink-muted);
        }
        .pyq-up-file-selected {
          position: relative;
          z-index: 6;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pyq-up-file-header {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .pyq-up-pdf-icon {
          color: var(--accent);
          flex-shrink: 0;
        }
        .pyq-up-file-meta {
          flex: 1;
          min-width: 0;
          text-align: left;
        }
        .pyq-up-file-name {
          display: block;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pyq-up-file-badges {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }
        .pyq-up-badge-ready {
          font-size: 0.68rem;
          font-weight: 800;
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .pyq-up-badge-size {
          font-size: 0.72rem;
          color: var(--ink-muted);
        }
        .pyq-up-remove-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: var(--surface2);
          color: var(--ink-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          z-index: 10;
        }
        .pyq-up-change-hint {
          font-size: 0.72rem;
          color: var(--accent);
          font-weight: 600;
          text-decoration: underline;
          text-align: center;
        }
        .pyq-up-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .pyq-up-progress-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(212, 175, 55, 0.12);
          border: 1px solid rgba(212, 175, 55, 0.35);
          color: var(--accent);
          font-size: 0.85rem;
          font-weight: 700;
        }
        .pyq-up-submit-btn {
          width: 100%;
          padding: 0.9rem;
          background: var(--accent);
          color: var(--bg);
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.15s;
        }
        .pyq-up-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .pyq-up-spin {
          animation: pyqSpin 1s linear infinite;
        }
        @keyframes pyqSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
