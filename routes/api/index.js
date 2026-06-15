const router = require('express').Router();
const userController = require('../../controller/user');
const transactionController = require('../../controller/bank');
const middleware = require('../../middleware/auth');



// user routes
router.post('/register', userController.register);
router.get('/getusers', userController.getusers);

// admin routes
router.get('/admin/users', middleware.authcheck, middleware.isAdmin, userController.getAllUsersAdmin);
router.get('/admin/users/deleted', middleware.authcheck, middleware.isAdmin, userController.getDeletedUsers);
router.get('/admin/users/:id', middleware.authcheck, middleware.isAdmin, userController.getUserFullDetails);

router.patch('/:updateid', middleware.authcheck,userController.updateProfile);
router.post('/login', userController.login);
router.post('/forgotpassword', userController.forgotpassword);
router.post('/verifyotp', userController.verifyotp);
router.post('/resetpassword', userController.resetpassword);
router.delete('/user/delete', middleware.authcheck, userController.deleteAccount);

// transaction routes
router.post('/transaction/transaction', middleware.authcheck, transactionController.transaction);
router.get('/transaction/alldata', middleware.authcheck, transactionController.alldata);
router.get('/transaction/recent', middleware.authcheck, transactionController.recentTransactions);
router.get('/transaction/history/:id', middleware.authcheck, transactionController.history);
router.get('/transaction/statement', middleware.authcheck, transactionController.downloadStatement);
router.post('/transaction/transfer', middleware.authcheck, transactionController.transfer);
router.post('/transaction/add-beneficiary', middleware.authcheck, transactionController.addBeneficiary);
router.get('/admin/users/:id/statement', middleware.authcheck, middleware.isAdmin, transactionController.downloadStatementAdmin);


module.exports = router;
