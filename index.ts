import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { OIDCStrategy, IOIDCStrategyOptionWithRequest, VerifyCallback } from 'passport-azure-ad';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

const clientID = process.env.CLIENT_ID as string;
const clientSecret = process.env.CLIENT_SECRET as string;
const tenantID = process.env.TENANT_ID as string;
const jwtSecret = process.env.JWT_SECRET as string;

if (!clientID || !clientSecret || !tenantID || !jwtSecret) {
    throw new Error("Missing environment variables");
}

interface AzureADProfile {
    oid: string;
    displayName: string;
    upn: string;
    [key: string]: any;
}

passport.use(new OIDCStrategy({
  identityMetadata: `https://login.microsoftonline.com/${tenantID}/v2.0/.well-known/openid-configuration`,
  clientID: clientID,
  clientSecret: clientSecret,
  responseType: 'code',
  responseMode: 'query',
  redirectUrl: 'http://localhost:3000/auth/office365/callback',
  allowHttpForRedirectUrl: true,
  passReqToCallback: true,
  scope: ['profile', 'email', 'openid', 'User.Read'],
} as IOIDCStrategyOptionWithRequest, 
function (
  req: Request,
  iss: string,
  sub: string,
  profile: any,
  accessToken: string,
  refreshToken: string,
  params: any,
  done: VerifyCallback
) {
    console.log('Profile:', profile);
    console.log('AccessToken:', accessToken);
    console.log('RefreshToken:', refreshToken);
    console.log('Params:', params);

    const azureADProfile: AzureADProfile = {
        oid: profile.oid || '',
        displayName: profile.displayName || '',
        upn: profile.upn || '',
    };

    return done(null, azureADProfile);
}));

app.get('/auth/office365',
    passport.authenticate('azuread-openidconnect', { session: false })
);

app.get('/auth/office365/callback',
    passport.authenticate('azuread-openidconnect', { session: false }),
    (req: Request, res: Response) => {
        const userProfile = req.user as AzureADProfile;
        if (!userProfile) {
            return res.status(401).send('User authentication failed');
        }

        const token = jwt.sign({
            id: userProfile.oid,
            displayName: userProfile.displayName,
            email: userProfile.upn
        }, jwtSecret, { expiresIn: '1h' });

        res.json({ token });
    }
);

const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, jwtSecret, (err, user) => {
            if (err) {
                console.error('JWT verification failed:', err);
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

app.get('/dashboard', authenticateJWT, (req: Request, res: Response) => {
    const userProfile = req.user as AzureADProfile;
    res.send(`Welcome, ${userProfile.displayName}`);
});

app.get('/', (req: Request, res: Response) => {
    res.send('<a href="/auth/office365">Login with Office 365</a>');
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));
