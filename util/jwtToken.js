const jwt = require("jsonwebtoken");

const generate = (object, secretSignature, tokenLife) => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        data: object,
      },
      secretSignature,
      {
        algorithm: "HS256",
        expiresIn: tokenLife,
      },
      (error, token) => {
        if (error) {
          return reject(error);
        }
        resolve(token);
      }
    );
  });
};

const verify = (token, secretKey) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        return reject(error);
      }
      resolve(decoded);
    });
  });
};

module.exports = {
  generate: generate,
  verify: verify,
};
