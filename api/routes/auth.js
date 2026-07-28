const express = require('express');
const router = express.Router();
const { verifyJwtOnly } = require('../middleware/authGuard');
const { supabaseAdmin } = require('../lib/supabase');

router.post('/signup', verifyJwtOnly, async (req, res) => {
  try {
    const { full_name, roll_number, department, phone_number, email, auth_provider } = req.body;

    if (!full_name || full_name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters long' });
    }
    if (!roll_number || roll_number.trim().length < 3) {
      return res.status(400).json({ error: 'Roll number must be at least 3 characters long' });
    }
    if (!department || department.trim().length < 2) {
      return res.status(400).json({ error: 'Department must be at least 2 characters long' });
    }
    
    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const cleaned_phone = String(phone_number).replace(/\D/g, '');
    if (cleaned_phone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const cleanRollNumber = roll_number.trim().toUpperCase();
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    // Check uniqueness manually before insert to give specific error messages
    const { data: existingProfiles, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('roll_number, phone_number, email')
      .or(`roll_number.eq.${cleanRollNumber},phone_number.eq.${cleaned_phone}${cleanEmail ? `,email.eq.${cleanEmail}` : ''}`);

    if (checkError) {
      console.error('Signup check error:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingProfiles && existingProfiles.length > 0) {
      for (const p of existingProfiles) {
        if (p.roll_number === cleanRollNumber) return res.status(409).json({ error: 'Roll number already registered' });
        if (p.phone_number === cleaned_phone) return res.status(409).json({ error: 'Phone number already registered' });
        if (cleanEmail && p.email === cleanEmail) return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const newProfile = {
      id: req.user.id,
      university_name: 'Chaudhary Ranbir Singh University',
      full_name: full_name.trim(),
      roll_number: cleanRollNumber,
      department: department.trim(),
      phone_number: cleaned_phone,
      email: cleanEmail,
      auth_provider: auth_provider || 'email',
      status: 'pending',
      role: 'student'
    };

    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert(newProfile);

    if (insertError) {
      console.error('Signup insert error:', insertError);
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'A profile with this information already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      success: true,
      profile: {
        id: req.user.id,
        status: 'pending',
        full_name: newProfile.full_name,
        roll_number: newProfile.roll_number
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', verifyJwtOnly, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Status check DB error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      user: { id: req.user.id, email: req.user.email },
      profile: profile || null,
      needs_profile: !profile
    });
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { roll_number, phone_number } = req.body;
    
    if (!roll_number || !phone_number) {
      return res.status(400).json({ error: 'Roll number and phone number are required' });
    }

    const cleanRollNumber = String(roll_number).trim().toUpperCase();
    const cleaned_phone = String(phone_number).replace(/\D/g, '');

    if (cleaned_phone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, status')
      .eq('roll_number', cleanRollNumber)
      .eq('phone_number', cleaned_phone)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Forgot password DB error:', profileError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Always return success even if not found to prevent user enumeration
    const successResponse = { success: true, message: 'If your details match our records, a reset request has been submitted.' };

    if (profile) {
      if (['pending', 'rejected', 'banned'].includes(profile.status)) {
        return res.status(400).json({ error: 'Account is not eligible for password reset' });
      }

      const { error: insertError } = await supabaseAdmin
        .from('password_reset_requests')
        .insert({
          roll_number: cleanRollNumber,
          phone_number: cleaned_phone,
          status: 'pending' 
        });

      if (insertError) {
        console.error('Forgot password insert error:', insertError);
        return res.status(500).json({ error: 'Database error' });
      }
    }

    res.json(successResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/change-password', verifyJwtOnly, async (req, res) => {
  try {
    const { new_password } = req.body;
    
    if (!new_password || new_password.length < 8 || !/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one letter and one number' });
    }

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      password: new_password
    });

    if (updateAuthError) {
      console.error('Change password auth error:', updateAuthError);
      return res.status(500).json({ error: 'Error updating password' });
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', req.user.id);

    if (updateProfileError) {
      console.error('Change password profile DB error:', updateProfileError);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
