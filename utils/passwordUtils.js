const crypto = require('crypto');
const jsonwebtoken = require('jsonwebtoken');
const path = require('path');
const fs = require('fs')

const pathToKey = path.join(__dirname + '/../keys', 'id_rsa_priv.pem');
const PRIV_KEY = fs.readFileSync(pathToKey, 'utf8');



function genPassword(password) {
    var salt = crypto.randomBytes(32).toString('hex');
    var genHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');

    return {
        salt: salt,
        hash: genHash
    };
}

function validPassword(password, hash, salt) {
    var hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash == hashVerify;
}

function issueJWT(user) {
    const _id = user._id;
    const role = user.role;
    const expiresIn = '7d';

    const payload = {
        sub: _id,
        role: role,
        iat: Date.now()
    };

    const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, { expiresIn: expiresIn, algorithm: 'RS256' });

    return {
        token: 'Bearer ' + signedToken,
        expires: expiresIn,
    }
}



module.exports.validPassword = validPassword;
module.exports.genPassword = genPassword;
module.exports.issueJWT = issueJWT;