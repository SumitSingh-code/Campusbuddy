'use strict';

/**
 * Campus Wall — Timetable Route
 * 
 * Rules:
 * 1. Only admin team (moderator, super_admin) can upload, update, or delete timetables.
 * 2. Students ONLY see the official timetable for their registered department.
 * 3. Timetables are photo/image-based with department and year tags.
 */

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { adminGuard }    = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase-admin');

router.use(authGuard);

function formatTimetableRow(row) {
  const slotsData = typeof row.slots === 'object' && row.slots !== null && !Array.isArray(row.slots)
    ? row.slots
    : (Array.isArray(row.slots) && row.slots[0] && typeof row.slots[0] === 'object' ? row.slots[0] : {});

  return {
    id: row.id,
    department: row.department,
    title: row.label || '',
    year: slotsData.year || '1st Year',
    image_url: slotsData.image_url || null,
    owner_id: row.owner_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── GET / & GET /mine — Fetch department timetables ────────────────────────
async function getTimetablesHandler(req, res) {
  try {
    const role = req.profile?.role || 'student';
    const isAdmin = ['moderator', 'super_admin'].includes(role);
    const userDept = req.profile?.department || '';

    let query = supabaseAdmin
      .from('timetables')
      .select('id, department, label, slots, is_master, created_at, updated_at, owner_id')
      .eq('is_master', true)
      .order('created_at', { ascending: false });

    // Students only ever see their own department's timetable
    if (!isAdmin) {
      if (!userDept) {
        return res.json({ data: [], user_department: '', is_admin: false });
      }
      query = query.eq('department', userDept);
    } else if (req.query.department && req.query.department !== 'All') {
      // Admins can filter by department if query param is passed
      query = query.eq('department', req.query.department);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[timetable GET error]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const timetables = (data || []).map(formatTimetableRow);

    res.json({
      data: timetables,
      user_department: userDept,
      is_admin: isAdmin,
    });
  } catch (err) {
    console.error('[timetable GET]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

router.get('/', getTimetablesHandler);
router.get('/mine', getTimetablesHandler);

// ─── POST / — Upload timetable (Admin only) ─────────────────────────────────
router.post('/', adminGuard, async (req, res) => {
  try {
    const { department, year, image_url, title } = req.body;

    if (!department || typeof department !== 'string' || !department.trim()) {
      return res.status(400).json({ error: 'Department is required' });
    }
    if (!year || typeof year !== 'string' || !year.trim()) {
      return res.status(400).json({ error: 'Year is required' });
    }
    if (!image_url || typeof image_url !== 'string' || !image_url.trim()) {
      return res.status(400).json({ error: 'Timetable image is required' });
    }

    const slots = {
      image_url: image_url.trim(),
      year: year.trim(),
    };

    const { data: row, error } = await supabaseAdmin
      .from('timetables')
      .insert({
        owner_id:   req.profile.id,
        department: department.trim(),
        label:      title?.trim() || null,
        slots,
        is_master:  true,
      })
      .select()
      .single();

    if (error) {
      console.error('[timetable POST error]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      success: true,
      data: formatTimetableRow(row),
    });
  } catch (err) {
    console.error('[timetable POST]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /:id — Update timetable (Admin only) ───────────────────────────────
router.put('/:id', adminGuard, async (req, res) => {
  try {
    const { department, year, image_url, title } = req.body;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('timetables')
      .select('id, slots')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    const prevSlots = typeof existing.slots === 'object' && existing.slots !== null && !Array.isArray(existing.slots)
      ? existing.slots
      : {};

    const updatedSlots = {
      ...prevSlots,
      ...(image_url ? { image_url: image_url.trim() } : {}),
      ...(year ? { year: year.trim() } : {}),
    };

    const updateFields = {
      slots: updatedSlots,
      updated_at: new Date().toISOString(),
    };

    if (department) updateFields.department = department.trim();
    if (title !== undefined) updateFields.label = title ? title.trim() : null;

    const { data: row, error } = await supabaseAdmin
      .from('timetables')
      .update(updateFields)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('[timetable PUT error]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      success: true,
      data: formatTimetableRow(row),
    });
  } catch (err) {
    console.error('[timetable PUT]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /:id — Delete timetable (Admin only) ────────────────────────────
router.delete('/:id', adminGuard, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('timetables')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('[timetable DELETE error]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true, message: 'Timetable deleted successfully' });
  } catch (err) {
    console.error('[timetable DELETE]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
