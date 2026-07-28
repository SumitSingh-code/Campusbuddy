'use strict';

// Campus Wall — Reports Route (admin-only)
// Handles the reports queue: list with content previews, dismiss, delete content, warn author.

const express = require('express');
const router  = express.Router();
const { adminGuard }      = require('../middleware/adminGuard');
const { supabaseAdmin }   = require('../lib/supabase');
const { notify }          = require('../lib/notify');

router.use(adminGuard);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABLE_MAP = {
  post:         'posts',
  anon_post:    'anon_posts',
  comment:      'comments',
  anon_comment: 'anon_comments',
};

async function getContentRow(refType, refId) {
  const table = TABLE_MAP[refType];
  if (!table) return null;
  const { data } = await supabaseAdmin
    .from(table)
    .select('id, content, user_id, status')
    .eq('id', refId)
    .maybeSingle();
  return data;
}

async function softDeleteContent(refType, refId) {
  const table = TABLE_MAP[refType];
  if (!table) return { error: `Unknown ref_type: ${refType}` };
  const { error } = await supabaseAdmin
    .from(table)
    .update({ status: 'deleted' })
    .eq('id', refId);
  return { error };
}

async function closeReport(reportId, status, resolvedById) {
  const { error } = await supabaseAdmin
    .from('reports')
    .update({
      status,
      resolved_by: resolvedById,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  return { error };
}

// ─── GET / — List reports ─────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const {
      status   = 'open',
      ref_type = '',
      page     = 1,
      limit    = 20,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * pageSize;

    let query = supabaseAdmin
      .from('reports')
      .select('id, reporter_id, ref_id, ref_type, reason, status, created_at, resolved_by, resolved_at', { count: 'exact' })
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (status)   query = query.eq('status', status);
    if (ref_type) query = query.eq('ref_type', ref_type);

    const { data: reports, count, error } = await query;
    if (error) {
      console.error('[reports GET /]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!reports || reports.length === 0) {
      return res.json({ data: [], total: 0, page: pageNum, limit: pageSize, has_more: false });
    }

    // ── Batch fetch content previews ───────────────────────────────────────
    const byType = {};
    reports.forEach(r => {
      if (!byType[r.ref_type]) byType[r.ref_type] = [];
      byType[r.ref_type].push(r.ref_id);
    });

    const contentFetches = Object.entries(byType).map(([rType, ids]) => {
      const table = TABLE_MAP[rType];
      if (!table) return Promise.resolve({ data: [] });
      return supabaseAdmin
        .from(table)
        .select('id, content, user_id, status')
        .in('id', ids);
    });

    const contentResults = await Promise.all(contentFetches);
    const contentMap = {};
    contentResults.forEach(({ data }) => {
      (data || []).forEach(row => {
        contentMap[row.id] = { content: row.content, user_id: row.user_id, status: row.status };
      });
    });

    // ── Batch fetch reporter profiles ─────────────────────────────────────
    const reporterIds = [...new Set(reports.map(r => r.reporter_id).filter(Boolean))];
    const { data: reporters } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, roll_number')
      .in('id', reporterIds);
    const reporterMap = {};
    (reporters || []).forEach(p => { reporterMap[p.id] = p; });

    // ── Assemble response ─────────────────────────────────────────────────
    const data = reports.map(r => {
      const contentRow    = contentMap[r.ref_id];
      const reporterProfile = reporterMap[r.reporter_id];
      return {
        id:              r.id,
        status:          r.status,
        ref_type:        r.ref_type,
        ref_id:          r.ref_id,
        reason:          r.reason,
        created_at:      r.created_at,
        resolved_at:     r.resolved_at,
        reporter:        reporterProfile || null,
        content_preview: contentRow
          ? contentRow.content?.substring(0, 300)
          : '[Content not found — may already be deleted]',
        content_status:  contentRow?.status || null,
        content_author_id: contentRow?.user_id || null,
        is_content_deleted: contentRow?.status === 'deleted' || !contentRow,
      };
    });

    res.json({
      data,
      total:    count || 0,
      page:     pageNum,
      limit:    pageSize,
      has_more: offset + pageSize < (count || 0),
    });
  } catch (err) {
    console.error('[reports GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id/dismiss — Dismiss report (no content action) ─────────────────

router.patch('/:id/dismiss', async (req, res) => {
  try {
    const { error } = await closeReport(req.params.id, 'dismissed', req.profile.id);
    if (error) {
      console.error('[reports PATCH /dismiss]', error);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[reports PATCH /dismiss]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id/delete-content — Delete content and close report ──────────────

router.patch('/:id/delete-content', async (req, res) => {
  try {
    const { data: report } = await supabaseAdmin
      .from('reports')
      .select('id, ref_type, ref_id, status')
      .eq('id', req.params.id)
      .single();

    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.status !== 'open') {
      return res.status(400).json({ error: 'Report is already closed' });
    }

    // Find content author before deleting (for notification)
    const contentRow = await getContentRow(report.ref_type, report.ref_id);

    // Soft-delete the content
    const { error: deleteErr } = await softDeleteContent(report.ref_type, report.ref_id);
    if (deleteErr) {
      console.error('[reports PATCH /delete-content] delete error:', deleteErr);
      return res.status(500).json({ error: 'Failed to delete content' });
    }

    // Close the report
    const { error: closeErr } = await closeReport(req.params.id, 'resolved', req.profile.id);
    if (closeErr) {
      console.error('[reports PATCH /delete-content] close error:', closeErr);
      return res.status(500).json({ error: 'Failed to close report' });
    }

    // Notify content author (best-effort)
    if (contentRow?.user_id) {
      const typeLabel = report.ref_type.replace('_', ' ');
      await notify(contentRow.user_id, {
        type:    'admin',
        title:   'Your content was removed',
        body:    `A ${typeLabel} you made was removed by moderation for violating community guidelines.`,
        refId:   null,
        refType: null,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[reports PATCH /delete-content]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /:id/warn-user — Warn content author, close report ────────────────

router.patch('/:id/warn-user', async (req, res) => {
  try {
    const { data: report } = await supabaseAdmin
      .from('reports')
      .select('id, ref_type, ref_id, status')
      .eq('id', req.params.id)
      .single();

    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.status !== 'open') {
      return res.status(400).json({ error: 'Report is already closed' });
    }

    const contentRow = await getContentRow(report.ref_type, report.ref_id);

    if (contentRow?.user_id) {
      const typeLabel = report.ref_type.replace('_', ' ');
      await notify(contentRow.user_id, {
        type:  'admin',
        title: '⚠️ Community Guidelines Warning',
        body:  `Your ${typeLabel} was flagged by the community. Please review our community guidelines to avoid further action.`,
      });
    }

    const { error } = await closeReport(req.params.id, 'dismissed', req.profile.id);
    if (error) {
      console.error('[reports PATCH /warn-user]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[reports PATCH /warn-user]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
