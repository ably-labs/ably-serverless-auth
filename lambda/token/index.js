// Initialise a TokenSigner using the Ably API key set in the ABLY_KEY
// environment variable.
const { TokenSigner } = require('./TokenSigner');
const tokenSigner = new TokenSigner(process.env.ABLY_KEY);

// The Lambda function handler receives requested token details from the client
// via API Gateway, signs them with the Ably API key, and returns the resulting
// Ably JWT token.
exports.handler = async (event) => {
  // Read the token details from the request, which have the following format:
  //
  // https://ably.com/documentation/core-features/authentication#ably-tokens
  const tokenDetails = JSON.parse(event.body);

  // This is an opportunity to modify the token details.
  //
  // For example, when using an API Gateway JWT authorizer, we could set the
  // client ID to the user's email address from the incoming authenticated
  // request context:
  //
  //     tokenDetails.clientId = event.requestContext.authorizer.jwt.claims.email;
  //
  // Or we could override the capabilities to only allow subscribing to a
  // single "example" channel:
  //
  //     tokenDetails.capabilities = '{"example":["subscribe"]}';
  //
  // Here, we just accept the requested client ID and capabilities (if any),
  // but always set the issued and expires fields.
  tokenDetails.issued  = Math.round(Date.now()/1000);
  tokenDetails.expires = tokenDetails.issued + 3600; // 1 hour expiry

  // Sign the token details to form the Ably JWT token.
  const token = tokenSigner.sign(tokenDetails);

  // Respond with the Ably JWT token.
  return {
    statusCode: 200,
    headers:    { 'Content-Type': 'application/jwt' },
    body:       token,
  };
}
