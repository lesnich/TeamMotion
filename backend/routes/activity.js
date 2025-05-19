const router = require('express').Router();
const activityController = require('../controllers/activity');
const requireAuth = require('../middleware/requireAuth');
const requireRoles = require('../middleware/requireRoles');
const ROLES_LIST = require('../config/rolesList');

router.use(requireAuth); // авторизація обов’язкова для всіх

// 🔓 Дозволено: Root, Admin, User (тільки свої активності)
router.get('/', requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin, ROLES_LIST.User]), activityController.getAll);
router.post('/', requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin, ROLES_LIST.User]), activityController.create);

// 🔐 Інші дії — лише Root, Admin
router.get('/:id', requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]), activityController.getOne);
router.patch('/:id', requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]), activityController.update);
router.delete('/:id', requireRoles([ROLES_LIST.Root]), activityController.delete);

module.exports = router;
