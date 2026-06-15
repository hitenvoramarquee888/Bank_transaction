const user = require('../model/user')
const jwt = require('jsonwebtoken')

module.exports.authcheck = async (req, res, next) => {
    try {

        const token = req.headers.authorization ? req.headers.authorization.split(" ")[1] : null
        console.log(token)

        if (!token) throw new Error('attach token')

        const tokenVerify = jwt.verify(token, process.env.JWT_SECRET)
        console.log(tokenVerify);
        if (!tokenVerify) throw new Error('invalid token')
        const userVerify = await user.findById(tokenVerify.id)

        if (!userVerify) throw new Error('invalid user')
        if (userVerify.isDeleted)
            throw new Error(
                "Account has been deleted"
            );

        req.user = userVerify;

        next()


    } catch (error) {
        res.status(401).json({
            status: 'fail',
            message: error.message

        })
    }
}

module.exports.isAdmin = (req, res, next) => {
    try {
        if (req.user.role !== "admin") {
            throw new Error("Access denied. Admins only.");
        }
        next();
    } catch (error) {
        res.status(403).json({
            status: 'fail',
            message: error.message
        });
    }
}

