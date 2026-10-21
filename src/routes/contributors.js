'use strict';

const express = require('express');
const router  = express.Router();
const { adminGuard, superAdminGuard } = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase-admin');

// Public: GET all contributors (for About page & Wall)
// Ordered by sort_order ASC, then created_at ASC as tie-breaker
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contributors')
      .select('id, name, role, dept, detail, photo_url, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: GET single contributor
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contributors')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin only: POST create contributor
router.post('/', [adminGuard, superAdminGuard], async (req, res) => {
  const { name, role, dept, detail, photo_url, sort_order } = req.body;
  if (!name || !role || !detail) return res.status(400).json({ error: 'name, role, detail required' });

  const parsedSort = parseInt(sort_order, 10);
  const finalSortOrder = isNaN(parsedSort) ? 1 : parsedSort;

  try {
    const { data, error } = await supabaseAdmin
      .from('contributors')
      .insert({
        name: name.trim(),
        role: role.trim(),
        dept: dept ? dept.trim() : null,
        detail: detail.trim(),
        photo_url: photo_url ? photo_url.trim() : null,
        sort_order: finalSortOrder
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin only: PUT update contributor
router.put('/:id', [adminGuard, superAdminGuard], async (req, res) => {
  const { name, role, dept, detail, photo_url, sort_order } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (role !== undefined) updateData.role = role.trim();
  if (dept !== undefined) updateData.dept = dept ? dept.trim() : null;
  if (detail !== undefined) updateData.detail = detail.trim();
  if (photo_url !== undefined) updateData.photo_url = photo_url ? photo_url.trim() : null;
  if (sort_order !== undefined) {
    const parsedSort = parseInt(sort_order, 10);
    updateData.sort_order = isNaN(parsedSort) ? 1 : parsedSort;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('contributors')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin only: DELETE contributor
router.delete('/:id', [adminGuard, superAdminGuard], async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('contributors')
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
