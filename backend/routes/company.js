const router = require('express').Router();
const companyController = require('../controllers/company');
const requireAuth = require('../middleware/requireAuth');
const requireRoles = require('../middleware/requireRoles');
const ROLES_LIST = require('../config/rolesList');

router.use(requireAuth);
router.use(requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]));

// 🆕 Створення компанії
router.post('/', companyController.create);

// 📋 Отримання всіх компаній з фільтрацією/сортуванням/пагінацією
router.get('/', companyController.getAll);

// ✏️ Оновлення компанії (через body)
router.patch('/', companyController.update);

router.get('/:id', companyController.getOne);

router.get(
    '/:id/users',
    requireRoles([ROLES_LIST.Admin, ROLES_LIST.Root]),
    companyController.getUsersOfCompany
);

// ✏️ Оновлення компанії (RESTful: /:id)
router.patch('/:id', (req, res, next) => {
    req.body.id = req.params.id;
    companyController.update(req, res, next);
});


// ❌ Видалення компанії
router.delete('/:id', companyController.delete);

module.exports = router;
