const router = require('express').Router()
const Company = require('../models/Company')
const requireAuth = require('../middleware/requireAuth')
const requireRoles = require('../middleware/requireRoles')
const ROLES_LIST = require('../config/rolesList')

router.use(requireAuth)

// Створити компанію (Root або Admin)
router.post('/', requireRoles([ROLES_LIST.Root, ROLES_LIST.Admin]), async (req, res) => {
    const { name } = req.body
    const newCompany = await Company.create({ name, createdBy: req.user, users: [] })
    res.status(201).json(newCompany)
})

// Отримати список усіх компаній
router.get('/', requireRoles([ROLES_LIST.Root]), async (req, res) => {
    const companies = await Company.find().lean()
    res.status(200).json(companies)
})

// Отримати всіх користувачів компанії
router.get('/:id/users', async (req, res) => {
    const company = await Company.findById(req.params.id).populate('users', 'name email department isApproved').lean()
    if (!company) return res.status(404).json({ error: 'Company not found' })
    res.status(200).json(company.users)
})

// Підтвердити користувача
router.patch('/approve/:id', requireRoles([ROLES_LIST.Admin, ROLES_LIST.Root]), async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.status(200).json(user)
})

// Додати користувача у компанію/відділ
router.patch('/assign/:id', requireRoles([ROLES_LIST.Admin, ROLES_LIST.Root]), async (req, res) => {
    const { companyId, department } = req.body

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const company = await Company.findById(companyId)
    if (!company) return res.status(404).json({ error: 'Company not found' })

    user.company = companyId
    user.department = department
    user.isApproved = true
    await user.save()

    if (!company.users.includes(user._id)) company.users.push(user._id)

    const dep = company.departments.find(d => d.name === department)
    if (dep) {
        if (!dep.members.includes(user._id)) dep.members.push(user._id)
    } else {
        company.departments.push({ name: department, members: [user._id] })
    }

    await company.save()
    res.status(200).json(user)
})

// Видалити користувача з компанії
router.patch('/remove/:id', requireRoles([ROLES_LIST.Admin, ROLES_LIST.Root]), async (req, res) => {
    const user = await User.findById(req.params.id)
    if (!user || !user.company) return res.status(404).json({ error: 'User not part of any company' })

    const company = await Company.findById(user.company)
    if (company) {
        company.users = company.users.filter(u => u.toString() !== user._id.toString())
        company.departments.forEach(dep => {
            dep.members = dep.members.filter(m => m.toString() !== user._id.toString())
        })
        await company.save()
    }

    user.company = null
    user.department = ''
    user.isApproved = false
    await user.save()

    res.status(200).json(user)
})

module.exports = router