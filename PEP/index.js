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
  baseURL: process.env.AUTH0_AUDIENCE,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  authorizationParams: {
    response_type: 'code',
    audience: process.env.AUTH0_AUDIENCE,
    scope: 'openid profile email'
  }
};

app.use(auth(config));

async function checkPerm(user, resourceId, action) {
  const roleKey = `${process.env.AUTH0_AUDIENCE}roles`;
  const roles = user[roleKey] || user.roles || ['user'];
  const roleArray = Array.isArray(roles) ? roles : [roles];

  try {
    const decision = await cerbos.checkResource({
      principal: { id: user.sub, roles: roleArray },
      resource: { kind: 'json_file', id: resourceId },
      actions: [action]
    });
    return decision.isAllowed(action);
  } catch (e) {
    console.error(e.message);
    return false;
  }
}

app.get('/', requiresAuth(), async (req, res) => {
  try {
    const allFiles = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'));
    const roleKey = `${process.env.AUTH0_AUDIENCE}roles`;
    const roles = req.oidc.user[roleKey] || ['user'];
    const roleArray = Array.isArray(roles) ? roles : [roles];

    let authorizedFiles = [];

    if (allFiles.length > 0) {
      const checkResult = await cerbos.checkResources({
        principal: { id: req.oidc.user.sub, roles: roleArray },
        resources: allFiles.map(file => ({
          resource: { kind: 'json_file', id: file },
          actions: ['read', 'update', 'delete']
        }))
      });

      authorizedFiles = allFiles.map(file => {
        const decision = checkResult.results.find(r => r.resource.id === file);
        return {
          name: file,
          canRead: decision?.actions.read === 'EFFECT_ALLOW',
          canUpdate: decision?.actions.update === 'EFFECT_ALLOW',
          canDelete: decision?.actions.delete === 'EFFECT_ALLOW'
        };
      }).filter(f => f.canRead);
    }

    const createDecision = await cerbos.checkResource({
      principal: { id: req.oidc.user.sub, roles: roleArray },
      resource: { kind: 'json_file', id: '*' },
      actions: ['create']
    });

    const canCreate = createDecision.isAllowed('create');

    res.render('index', {
      files: authorizedFiles,
      user: req.oidc.user,
      roles: roleArray,
      canCreate
    });
  } catch (err) {
    console.error(err);
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
  const filePath = path.join(STORAGE_DIR, file.name);
  const action = fs.existsSync(filePath) ? 'update' : 'create';

  if (await checkPerm(req.oidc.user, file.name, action)) {
    file.mv(filePath, err => {
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
