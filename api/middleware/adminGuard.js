// Campus Wall — Admin Middleware
// adminGuard:      moderator OR super_admin (routine moderation)
// superAdminGuard: super_admin ONLY (manage admin accounts, view admin list)
//
// Role capability matrix:
// ┌─────────────────────────────────────────────┬───────────┬─────────────┐
// │ Action                                       │ moderator │ super_admin │
// ├─────────────────────────────────────────────┼───────────┼─────────────┤
// │ View pending signups                         │     ✓     │      ✓      │
// │ Approve / reject signups                     │     ✓     │      ✓      │
// │ View / search all users                      │     ✓     │      ✓      │
// │ Suspend / activate users                     │     ✓     │      ✓      │
// │ Ban users                                    │     ✓     │      ✓      │
// │ View / resolve password reset requests       │     ✓     │      ✓      │
// │ Delete / hide posts and comments             │     ✓     │      ✓      │
// │ Resolve reports                              │     ✓     │      ✓      │
// │ Reveal anonymous post author                 │     ✓     │      ✓      │
// │ Post notices                                 │     ✓     │      ✓      │
// ├─────────────────────────────────────────────┼───────────┼─────────────┤
// │ View admin team list                         │     ✗     │      ✓      │
// │ Promote student → moderator / super_admin    │     ✗     │      ✓      │
// │ Demote moderator → student                   │     ✗     │      ✓      │
// │ Demote another super_admin → student         │     ✗     │      ✓      │
// └─────────────────────────────────────────────┴───────────┴─────────────┘

// NOTE: Both guards assume router.use(adminGuard) has already run at the
// router level, so req.profile is already populated. superAdminGuard does
// NOT re-invoke authGuard — it just checks the role already on req.profile.

/**
 * adminGuard — default export.
 * Runs full authGuard (JWT verify + profile fetch + status checks),
 * then requires role = 'moderator' OR 'super_admin'.
 * Mount at router level: router.use(adminGuard)
 */
const adminGuard = (req, res, next) => {
  const { authGuard } = require('./authGuard');
  authGuard(req, res, () => {
    if (
      !req.profile ||
      (req.profile.role !== 'moderator' && req.profile.role !== 'super_admin')
    ) {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'FORBIDDEN',
      });
    }
    next();
  });
};

/**
 * superAdminGuard — named export.
 * Requires role = 'super_admin' ONLY.
 * Use as per-route middleware AFTER router.use(adminGuard) has already run.
 * Does NOT re-run authGuard — req.profile is already populated.
 *
 * Usage: router.get('/admins', superAdminGuard, handler)
 */
const superAdminGuard = (req, res, next) => {
  // req.profile is guaranteed to exist here because adminGuard already ran.
  if (!req.profile || req.profile.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Super admin access required',
      code: 'SUPER_ADMIN_REQUIRED',
    });
  }
  next();
};

module.exports = adminGuard; // default: router.use(adminGuard)
module.exports.adminGuard = adminGuard;
module.exports.superAdminGuard = superAdminGuard;
