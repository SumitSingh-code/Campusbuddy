'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { Post } from './PostCard'
import { compressImage } from '@/lib/image'
import { uploadToStorage, deleteFromStorage } from '@/lib/storage'
import { ImagePlus, X } from 'lucide-react'

interface EditPostDialogProps {
  post: Post
  endpoint: string // e.g. '/feed'
  onClose: () => void
  onSaved: (updated: Post) => void
}

export default function EditPostDialog({ post, endpoint, onClose, onSaved }: EditPostDialogProps) {
  const [content, setContent] = useState(post.content)
  const [imageUrl, setImageUrl] = useState(post.image_url || null)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return }
    try {
      const compressed = await compressImage(file, 1200, 250)
      setNewImage(compressed)
      setNewImagePreview(URL.createObjectURL(compressed))
    } catch { toast.error('Failed to process image') }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && !imageUrl && !newImage) {
      setError('Post cannot be empty')
      return
    }
    setSaving(true)
    setError('')
    try {
      let finalImageUrl = imageUrl

      // Upload new image if any
      if (newImage) {
        if (post.image_url) {
          await deleteFromStorage(post.image_url).catch(() => {})
        }
        finalImageUrl = await uploadToStorage(newImage, `posts/${Date.now()}`)
      }

      const updated = await api.patch<{ data: Post }>(`${endpoint}/${post.id}`, {
        content: content.trim(),
        image_url: finalImageUrl,
      })
      onSaved(updated.data)
      toast.success('Post updated!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 600, zIndex: 51,
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        padding: '1.25rem',
        paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom,0))',
        boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
        animation: 'sheet-in .25s cubic-bezier(.32,0,.12,1)',
      }}>
        <style>{`@keyframes sheet-in{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}`}</style>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 1rem' }} />
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>Edit Post</h3>

        <form onSubmit={handleSave}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={1000}
            rows={5}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--ink)', fontSize: '0.9375rem', lineHeight: 1.5,
              resize: 'none', fontFamily: 'inherit', outline: 'none',
              marginBottom: '0.75rem',
            }}
          />

          {/* Current image */}
          {imageUrl && !newImagePreview && (
            <div style={{ position: 'relative', marginBottom: '0.75rem', display: 'inline-block' }}>
              <img src={imageUrl} alt="" style={{ maxHeight: 140, borderRadius: 10, objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              ><X size={12} /></button>
            </div>
          )}

          {/* New image preview */}
          {newImagePreview && (
            <div style={{ position: 'relative', marginBottom: '0.75rem', display: 'inline-block' }}>
              <img src={newImagePreview} alt="" style={{ maxHeight: 140, borderRadius: 10, objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => { setNewImage(null); setNewImagePreview(null) }}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              ><X size={12} /></button>
            </div>
          )}

          {error && (
            <div style={{ padding: '0.6rem 0.75rem', borderRadius: 8, background: 'var(--danger-light)', color: 'var(--danger-text)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{error}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ cursor: 'pointer', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem' }}>
              <ImagePlus size={18} />
              <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
            </label>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '0.6rem 1.25rem', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Cancel</button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
              >{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
