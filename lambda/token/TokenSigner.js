const crypto = require('crypto');

// TokenSigner signs token details (i.e. clientId, capability, and expiry) using
// an Ably API key to generate signed Ably JWT tokens.
//
// See https://ably.com/documentation/core-features/authentication#ably-jwt-process
//
// As mentioned on the above page, this demonstrates creating an Ably JWT manually,
// but you should consider using a JWT library instead (see https://jwt.io/).
class TokenSigner {
  // Initialise a TokenSigner with an Ably API Key.
  //
  // The key has the following format:
  //
  //   <keyName>:<keySecret>
  //
  // The keyName is used as the "kid" value in the header of the Ably JWT
  // token, and keySecret is used to sign the token using the HS256 algorithm.
  constructor(ablyKey) {
    const keyParts = ablyKey.split(':', 2);
    this.keyName   = keyParts[0];
    this.keySecret = keyParts[1];
  }

  // Sign a JWT of the given token details using the keySecret and return the
  // resulting signed Ably JWT token.
  //
  // The steps used are specified at https://tools.ietf.org/html/rfc7515#section-3.3
  sign(tokenDetails) {
    const header = {
      typ: 'JWT',
      kid: this.keyName,
      alg: 'HS256',
    };

    const jwt = {
      'iat':               tokenDetails.issued,
      'exp':               tokenDetails.expires,
      'x-ably-capability': tokenDetails.capapility,
      'x-ably-clientId':   tokenDetails.clientId,
    };

    const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(jwt))}`;

    const hmac = crypto.createHmac('sha256', this.keySecret);
    hmac.update(signingInput);
    const signature = base64url(hmac.digest());

    return `${signingInput}.${signature}`;
  }
}

function base64url(input) {
  if (!Buffer.isBuffer(input)) {
    input = Buffer.from(input, 'utf8');
  }
  return input.toString('base64')
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

exports.TokenSigner = TokenSigner;
