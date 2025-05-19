const router = require('express').Router();
const usersController = require('../controllers/user');
const requireAuth = require('../middleware/requireAuth');
const requireRoles = require('../middleware/requireRoles');
const ROLES_LIST = require('../config/rolesList');

// 🔐 Всі маршрути вимагають авторизацію
router.use(requireAuth);

// 📋 GET all users
router.get(
    '/',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]),
    usersController.getAll
);


// 🆕 POST create user
router.post(
    '/',
    requireRoles([ROLES_LIST.Root]),
    usersController.create
);

// ✏️ PATCH update user (через body)
router.patch(
    '/',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]),
    usersController.update
);

router.patch(
    '/me',
    requireRoles([ROLES_LIST.User, ROLES_LIST.Admin, ROLES_LIST.Root]),
    usersController.updateSelf
);


// ✏️ PATCH update user (через :id в URL — RESTful варіант)
router.patch(
    '/:id',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]),
    (req, res, next) => {
        req.body.id = req.params.id; // Підставляємо id з URL у body
        usersController.update(req, res, next);
    }
);

router.get(
    '/me',
    requireRoles([ROLES_LIST.User, ROLES_LIST.Admin, ROLES_LIST.Root]),
    usersController.getCurrent
);

// 🔍 GET one user
router.get(
    '/:id',
    requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]),
    usersController.getOne
);



// ❌ DELETE user
router.delete(
    '/:id',
    requireRoles([ROLES_LIST.Root]),
    usersController.delete
);

module.exports = router;
