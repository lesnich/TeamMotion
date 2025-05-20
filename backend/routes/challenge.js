const router = require('express').Router();
const challengeController = require('../controllers/challenge');
const requireAuth = require('../middleware/requireAuth');
const requireRoles = require('../middleware/requireRoles');
const ROLES_LIST = require('../config/rolesList');

router.use(requireAuth);

router.get(
    '/',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin, ROLES_LIST.User]), // 👈 додали User
    challengeController.getAll
);


router.post(
    '/',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]),
    challengeController.create
);

router.get(
    '/:id',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]),
    challengeController.getOne
);

router.patch(
    '/:id',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]),
    challengeController.update
);

router.delete(
    '/:id',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]),
    challengeController.delete
);

module.exports = router;
