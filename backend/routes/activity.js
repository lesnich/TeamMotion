const router = require('express').Router();
const activityController = require('../controllers/activity');
const requireAuth = require('../middleware/requireAuth');
const requireRoles = require('../middleware/requireRoles');
const ROLES_LIST = require('../config/rolesList');

router.use(requireAuth);

// 🔓 Усі ролі можуть переглядати, створювати, оновлювати, видаляти (обмеження — в контролері)
const allowedRoles = [ROLES_LIST.User, ROLES_LIST.Admin, ROLES_LIST.Root];

router.get(
    '/',
    requireRoles(allowedRoles),
    activityController.getAll
);

router.post(
    '/',
    requireRoles(allowedRoles),
    activityController.create
);

router.get(
    '/:id',
    requireRoles(allowedRoles),
    activityController.getOne
);

router.patch(
    '/:id',
    requireRoles(allowedRoles),
    activityController.update
);

router.delete(
    '/:id',
    requireRoles(allowedRoles),
    activityController.delete
);

module.exports = router;
