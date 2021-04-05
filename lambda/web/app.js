// An OpenID Connect client for the AWS Cognito user pool.
const oidcClient = new Oidc.UserManager({
  authority:     'https://cognito-idp.{{cognitoRegion}}.amazonaws.com/{{cognitoUserPoolId}}/.well-known/openid-configuration',
  client_id:     '{{cognitoClientId}}',
  redirect_uri:  '{{cognitoRedirectUrl}}',
  response_type: 'code',
  scope:         'openid profile email',
});

// ExampleApp binds to the "Sign In" and "Sign Out" buttons to sign the user in
// and out of AWS Cognito, and binds to the "Connect" and "Disconnect" buttons
// to connect or disconnect from Ably using a custom authCallback.
class ExampleApp {
  constructor() {
    this.user   = null;
    this.client = null;

    this.signInBtn     = document.getElementById('sign_in');
    this.signOutBtn    = document.getElementById('sign_out');
    this.connectBtn    = document.getElementById('connect');
    this.disconnectBtn = document.getElementById('disconnect');
    this.userBox       = document.getElementById('user');
    this.idTokenBox    = document.getElementById('id_token');
    this.ablyTokenBox  = document.getElementById('ably_token');
    this.connectionBox = document.getElementById('ably_connection');

    this.signInBtn.addEventListener('click', this.signIn.bind(this), false);
    this.signOutBtn.addEventListener('click', this.signOut.bind(this), false);
    this.connectBtn.addEventListener('click', this.connect.bind(this), false);
    this.disconnectBtn.addEventListener('click', this.disconnect.bind(this), false);
  }

  async init() {
    // Handle an OpenID Connect response from AWS Cognito if the user has just
    // signed in and redirected back with an authorization code in the URL.
    if(window.location.search.includes('code=')) {
      await oidcClient.signinRedirectCallback();
      window.location.replace('/');
      return;
    }

    // Set the user if they're already signed in.
    const user = await oidcClient.getUser();
    if(user) {
      this.setUser(user);
    }
  }

  // Handle the "Sign In" and "Sign Out" buttons being clicked by redirecting
  // to AWS Cognito.
  signIn() {
    oidcClient.signinRedirect();
  }

  signOut() {
    oidcClient.removeUser().then(function() {
      window.location.replace('https://{{cognitoDomain}}.auth.{{cognitoRegion}}.amazoncognito.com/logout?client_id={{cognitoClientId}}&logout_uri={{cognitoRedirectUrl}}');
    });
  }

  // Handle the "Connect" button being clicked by creating an Ably Realtime
  // client with a custom authCallback.
  connect() {
    const client = this.client = new Ably.Realtime({
      authCallback: this.authCallback.bind(this),
    });

    // Update the UI when the connection state changes.
    const connectionBox = this.connectionBox;
    client.connection.on('connecting', function() {
      connectionBox.innerText = 'connecting';
    });
    client.connection.on('connected', function() {
      connectionBox.innerText = `connected (id: ${client.connection.id})`;
    });
    client.connection.on('closed', function() {
      connectionBox.innerText = 'disconnected';
    });

    this.connectBtn.disabled = true;
    this.disconnectBtn.disabled = false;
  }

  // Handle the "Disconnect" button being clicked by closing the Ably Realtime
  // client.
  disconnect() {
    this.client.close();
    this.ablyTokenBox.innerText = '-';
    this.connectBtn.disabled = false;
    this.disconnectBtn.disabled = true;
  }

  // Define an Ably authCallback which retrieves an Ably JWT token from the API
  // Gateway 'POST /token' endpoint using the user's ID token.
  //
  // See https://ably.com/documentation/realtime/authentication#auth-options
  authCallback(tokenParams, callback) {
    const promise = this.authCallbackAsync(tokenParams);

    promise.then(function(token) {
      callback(null, token);
    }).catch(function(error) {
      callback(error, null);
    });
  }

  async authCallbackAsync(tokenParams) {
    // Refresh the user's ID token if it has expired.
    if(this.user.expired) {
      const user = await oidcClient.signinSilent();
      this.setUser(user);
    }

    // Retrieve an Ably JWT token by POSTing the token params to the token
    // endpoint with the user's ID token in the Authorization header.
    const res = await fetch('/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.user.id_token}`,
      },
      body: JSON.stringify(tokenParams),
    });

    if(!res.ok) {
      const body = await res.text();
      throw new Error(`Unexpected token response: ${res.status}: ${body}`);
    }

    // The body of the response is the Ably JWT token.
    const ablyToken = await res.text();
    this.ablyTokenBox.innerText = ablyToken;
    return ablyToken;
  }

  setUser(user) {
    this.user = user;

    this.userBox.innerText    = user.profile.email;
    this.idTokenBox.innerText = user.id_token;

    this.signInBtn.disabled  = true;
    this.signOutBtn.disabled = false;
    this.connectBtn.disabled = false;
  }
}

const app = new ExampleApp();
app.init();
