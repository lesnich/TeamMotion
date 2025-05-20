const router = require('express').Router();
const controller = require('../controllers/challengeProgress');
const requireAuth = require('../middleware/requireAuth');
const requireRoles = require('../middleware/requireRoles');
const ROLES_LIST = require('../config/rolesList');

const roles = [ROLES_LIST.User, ROLES_LIST.Admin, ROLES_LIST.Root];

router.use(requireAuth);

router.get('/', requireRoles(roles), controller.getAll);
router.get('/:id', requireRoles(roles), controller.getOne);
router.post('/', requireRoles(roles), controller.create);
router.patch('/:id', requireRoles(roles), controller.update);
router.delete('/:id', requireRoles(roles), controller.delete);

module.exports = router;
