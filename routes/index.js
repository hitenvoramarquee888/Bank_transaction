const router = require('express').Router();

const midelewere = require('../middleware/auth');

router.use('/', require('./web/index'));


router.use('/api/v1', require('./api/index'));

module.exports = router;
