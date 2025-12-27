require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');
const { auth, requiresAuth } = require('express-openid-connect');
const { GRPC: Cerbos } = require('@cerbos/grpc');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(fileUpload());

const cerbos = new Cerbos(process.env.CERBOS_HOST, { tls: false });
const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR);

const config = {
  authRequired: false,
  auth0Logout: true,
  idpLogout: true,
  secret: process.env.APP_SECRET,
  baseURL: process.env.AUTH0_AUDIENCE, // Fixed: Using your .env audience
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  authorizationParams: {
    response_type: 'code',
    audience: process.env.AUTH0_AUDIENCE,
    scope: 'openid profile email',
  },
};

app.use(auth(config));

async function checkPerm(user, resourceId, action) {
  // Fixed: Role key now uses the audience from .env
  const roleKey = `${process.env.AUTH0_AUDIENCE}roles`;
  const roles = user[roleKey] || user.roles || ['user'];
  const roleArray = Array.isArray(roles) ? roles : [roles];

  console.log('--- PERMISSION CHECK ---');
  console.log('Principal:', user.sub, 'Roles:', JSON.stringify(roleArray));

  try {
    const decision = await cerbos.checkResource({
      principal: {
        id: user.sub,
        roles: roleArray,
      },
      resource: {
        kind: 'json_file',
        id: resourceId,
      },
      actions: [action],
    });

    const isAllowed = decision.isAllowed(action);
    
    console.log('Action:', action, 'Allowed:', isAllowed);
    return isAllowed;
  } catch (e) {
    console.error('CERBOS SDK ERROR:', e.message);
    return false;
  }
}

app.get('/', requiresAuth(), async (req, res) => {
  try {
    const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'));
    // Fixed: Role key now uses the audience from .env
    const roleKey = `${process.env.AUTH0_AUDIENCE}roles`;
    const displayRoles = req.oidc.user[roleKey] || ['user'];
    res.render('index', { 
      files, 
      user: req.oidc.user, 
      roles: Array.isArray(displayRoles) ? displayRoles : [displayRoles]
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/download/:name', requiresAuth(), async (req, res) => {
  const ok = await checkPerm(req.oidc.user, req.params.name, 'read');
  if (ok) return res.download(path.join(STORAGE_DIR, req.params.name));
  res.status(403).send('Access Denied');
});

app.post('/upload', requiresAuth(), async (req, res) => {
  if (!req.files || !req.files.jsonFile) return res.status(400).send('No file');
  const file = req.files.jsonFile;
  const action = fs.existsSync(path.join(STORAGE_DIR, file.name)) ? 'update' : 'create';
  if (await checkPerm(req.oidc.user, file.name, action)) {
    file.mv(path.join(STORAGE_DIR, file.name), (err) => {
      if (err) return res.status(500).send(err);
      res.redirect('/');
    });
  } else {
    res.status(403).send('Upload Denied');
  }
});

app.get('/delete/:name', requiresAuth(), async (req, res) => {
  if (await checkPerm(req.oidc.user, req.params.name, 'delete')) {
    const filePath = path.join(STORAGE_DIR, req.params.name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.redirect('/');
  }
  res.status(403).send('Delete Denied');
});

app.listen(3000, () => console.log('Server online on 3000'));