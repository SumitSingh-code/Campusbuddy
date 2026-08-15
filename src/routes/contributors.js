'use strict';

const express = require('express');
const router  = express.Router();
const { adminGuard }    = require('../middleware/adminGuard');
const { supabaseAdmin } = require('../lib/supabase');

// Public: GET all contributors (for About page)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contributors')
      .select('id, name, role, dept, detail, photo_url, sort_order')
      .order('sort_order', { ascending: true });
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

// Admin: POST create contributor
router.post('/', adminGuard, async (req, res) => {
  const { name, role, dept, detail, photo_url } = req.body;
  if (!name || !role || !detail) return res.status(400).json({ error: 'name, role, detail required' });
  try {
    const { data, error } = await supabaseAdmin
      .from('contributors')
      .insert({ name, role, dept: dept || null, detail, photo_url: photo_url || null })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: PUT update contributor
router.put('/:id', adminGuard, async (req, res) => {
  const { name, role, dept, detail, photo_url } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('contributors')
      .update({ name, role, dept: dept || null, detail, photo_url: photo_url || null })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: DELETE contributor
router.delete('/:id', adminGuard, async (req, res) => {
  try {
    await supabaseAdmin.from('contributors').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
