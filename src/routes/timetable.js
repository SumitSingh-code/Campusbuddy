'use strict';

/**
 * Campus Wall — Timetable Route
 * 
 * Rules:
 * 1. Only admin team (moderator, super_admin) can upload, update, or delete timetables.
 * 2. Students ONLY see the official timetable for their registered department.
 * 3. Timetables are photo/image-based and support MULTI-PAGE uploads (1, 2, 3 or more pages).
 * 4. A single timetable can cover "All Years / All Semesters (Combined)" or a specific year/semester.
 * 5. Returns all registered and official departments without duplication.
 */

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { adminGuard }    = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase-admin');

router.use(authGuard);

const OFFICIAL_DEPARTMENTS = [
  'Computer Science & Engineering',
  'Computer science and applications',
  'DCSA (B.tech AI & ML)',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Commerce',
  'Management',
  'Economics',
  'Law',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Political Science',
  'History',
  'English',
  'Hindi',
  'Punjabi',
  'Sociology',
  'Geography',
  'Education',
  'Physical Education',
  'Fine Arts',
  'Music',
  'Library Science',
  'Other',
];

function formatTimetableRow(row) {
  const slotsData = typeof row.slots === 'object' && row.slots !== null && !Array.isArray(row.slots)
    ? row.slots
    : (Array.isArray(row.slots) && row.slots[0] && typeof row.slots[0] === 'object' ? row.slots[0] : {});

  // Extract images array, with fallback to single image_url
  let images = [];
  if (Array.isArray(slotsData.images) && slotsData.images.length > 0) {
    images = slotsData.images.filter(img => typeof img === 'string' && img.trim().length > 0);
  } else if (slotsData.image_url && typeof slotsData.image_url === 'string') {
    images = [slotsData.image_url];
  }

  return {
    id: row.id,
    department: row.department,
    title: row.label || '',
    year: slotsData.year || 'All Years (Combined)',
    image_url: images[0] || slotsData.image_url || null,
    images: images,
    page_count: images.length,
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

    // Fetch all registered departments from profiles table so any student's department is guaranteed to be present
    const { data: profileDepts } = await supabaseAdmin
      .from('profiles')
      .select('department')
      .not('department', 'is', null);

    const registeredDepts = Array.from(new Set((profileDepts || []).map(p => p.department).filter(Boolean)));
    const allDepartments = Array.from(new Set([...registeredDepts, ...OFFICIAL_DEPARTMENTS]));

    let query = supabaseAdmin
      .from('timetables')
      .select('id, department, label, slots, is_master, created_at, updated_at, owner_id')
      .eq('is_master', true)
      .order('created_at', { ascending: false });

    // Students only ever see their own department's timetable (case-insensitive match)
    if (!isAdmin) {
      if (!userDept) {
        return res.json({ data: [], user_department: '', is_admin: false, departments: allDepartments });
      }
      query = query.ilike('department', userDept);
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
      departments: allDepartments,
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
    const { department, year, images, image_url, title } = req.body;

    if (!department || typeof department !== 'string' || !department.trim()) {
      return res.status(400).json({ error: 'Department is required' });
    }
    if (!year || typeof year !== 'string' || !year.trim()) {
      return res.status(400).json({ error: 'Year / Scope is required' });
    }

    // Support both multi-image array and single image_url
    let finalImages = [];
    if (Array.isArray(images) && images.length > 0) {
      finalImages = images.map(img => (typeof img === 'string' ? img.trim() : '')).filter(Boolean);
    } else if (image_url && typeof image_url === 'string' && image_url.trim()) {
      finalImages = [image_url.trim()];
    }

    if (finalImages.length === 0) {
      return res.status(400).json({ error: 'At least one timetable page/image is required' });
    }

    const slots = {
      images: finalImages,
      image_url: finalImages[0],
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
    const { department, year, images, image_url, title } = req.body;

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

    let finalImages = prevSlots.images || (prevSlots.image_url ? [prevSlots.image_url] : []);
    if (Array.isArray(images) && images.length > 0) {
      finalImages = images.map(img => (typeof img === 'string' ? img.trim() : '')).filter(Boolean);
    } else if (image_url && typeof image_url === 'string' && image_url.trim()) {
      finalImages = [image_url.trim()];
    }

    const updatedSlots = {
      ...prevSlots,
      images: finalImages,
      image_url: finalImages[0] || null,
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
