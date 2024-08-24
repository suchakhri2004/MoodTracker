import express from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';

const app = express();

const config = {
    auth: {
        clientId: '739bdd0c-f4ae-4720-b32c-5b66caed0b0e',
        authority: 'https://login.microsoftonline.com/fc3b5e66-bc10-46aa-8e59-8c5f6d21ecf8',
        clientSecret: 'YEC8Q~2UWRZhX.yrMZjtttzet_SUr76plK1CcasU',
    },
};

const cca = new ConfidentialClientApplication(config);

app.get('/login', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: 'http://localhost:3000/redirect',
  };

  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  }).catch((error) => {
    console.log('Error generating auth URL: ', error);
    res.status(500).send('Error in generating auth URL');
  });
});

app.get('/redirect', (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  const tokenRequest = {
    code: code,
    scopes: ['user.read'],
    redirectUri: 'http://localhost:3000/redirect',
  };

  cca.acquireTokenByCode(tokenRequest).then((response) => {
    console.log('Access token:', response.accessToken);
    res.send('Login successful! Access token received.');
  }).catch((error) => {
    console.log('Error acquiring token: ', error);
    res.status(500).send('Error in acquiring token');
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the Office 365 login example. Go to /login to start the login process.');
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
