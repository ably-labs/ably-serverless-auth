const fs = require('fs');
const path = require('path');

const indexHTML = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

// Replace the placeholder Cognito settings in app.js with values from the environment variables.
const appJS = fs.readFileSync(path.resolve(__dirname, './app.js'), 'utf8')
  .replace(/{{cognitoRegion}}/g,      process.env.COGNITO_REGION)
  .replace(/{{cognitoUserPoolId}}/g,  process.env.COGNITO_USER_POOL_ID)
  .replace(/{{cognitoClientId}}/g,    process.env.COGNITO_CLIENT_ID)
  .replace(/{{cognitoDomain}}/g,      process.env.COGNITO_DOMAIN)
  .replace(/{{cognitoRedirectUrl}}/g, process.env.COGNITO_REDIRECT_URL);

exports.handler = async (event) => {
  const response = {
    statusCode: 200,
  };

  if(event.requestContext.http.path == '/app.js') {
    response.headers = {
      'Content-Length': appJS.length,
      'Content-Type':   'application/javascript',
    };
    response.body = appJS;
  } else {
    response.headers = {
      'Content-Length': indexHTML.length,
      'Content-Type':   'text/html',
    };
    response.body = indexHTML;
  }
  return response;
};
