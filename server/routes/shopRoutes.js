const express = require('express');
const router =express.Router();

//controller

const shopController = require('../controller/shopController');

//getHome
router.get('/', shopController.userHome);

module.exports = router