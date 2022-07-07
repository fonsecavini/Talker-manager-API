const express = require('express');
/* const bodyParser = require('body-parser'); */
const fs = require('fs/promises');
const Crypto = require('crypto-js');
const moment = require('moment');

const TALKERJSON = './talker.json';

const app = express();
app.use(express.json());

const HTTP_OK_STATUS = 200;
const PORT = '3000';

// não remova esse endpoint, e para o avaliador funcionar
app.get('/', (_request, response) => {
  response.status(HTTP_OK_STATUS).send();
});  

const validadeLogin = (req, res, next) => { 
  const { email, password } = req.body;
  const validEmail = /\S+@\S+\.\S+/;

  if (!email) return res.status(400).json({ message: 'O campo "email" é obrigatório' });
  if (!password) return res.status(400).json({ message: 'O campo "password" é obrigatório' });
  if (password.length < 6) {
 return res.status(400).json({ 
    message: 'O "password" deve ter pelo menos 6 caracteres', 
  }); 
}
  if (!validEmail.test(email)) {
 return res.status(400).json({ 
    message: 'O "email" deve ter o formato "email@email.com"',
  }); 
}
  next();
};

const validadeToken = (req, res, next) => {
  const { token } = req.headers;
  if (token.length !== 16) return res.status(400).json({ message: 'Token invalido' });
  next();
};

const validadeTokenPost = (req, res, next) => {
  const { authorization } = req.headers;
  console.log(authorization); 

  if (!authorization) {
    return res.status(401).json({ 
       message: 'Token não encontrado' }); 
   }
  
  if (authorization.length !== 16) {
    return res.status(401).json({ 
       message: 'Token inválido' }); 
   }

  next();
};

const validadeName = (req, res, next) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'O campo "name" é obrigatório' });
  if (name.length < 4) {
 return res.status(400).json({ 
    message: 'O "name" deve ter pelo menos 3 caracteres', 
  }); 
}
  next();
};

const validadeAge = (req, res, next) => {
  const { age } = req.body;
  if (!age) return res.status(400).json({ message: 'O campo "age" é obrigatório' });
  if (age < 18) {
    return res.status(400).json({
      message: 'A pessoa palestrante deve ser maior de idade',
    });
  }
  next();
};

const validadeTalk = (req, res, next) => {
  const { talk } = req.body;
  if (!talk) {
 return res.status(400).json({
    message: 'O campo "talk" é obrigatório e "watchedAt" e "rate" não podem ser vazios',
  }); 
}
next();
};

const validadeAllTalk = (req, res, next) => {
  const { watchedAt, rate } = req.body.talk;
  if (!watchedAt || (!rate && rate !== 0)) {
    return res.status(400).json({
      message: 'O campo "talk" é obrigatório e "watchedAt" e "rate" não podem ser vazios',
    }); 
  }
  next();
};

const validadeDate = (req, res, next) => {
  const { watchedAt } = req.body.talk;
  console.log(watchedAt);
  const dataValid = moment(watchedAt, 'DD/MM/YYYY', true).isValid();
  console.log(dataValid);
  if (!dataValid) {
    return res.status(400).json({
      message: 'O campo "watchedAt" deve ter o formato "dd/mm/aaaa"',
    });
  }
  next();
};

const validadeRate = (req, res, next) => {
  const { rate } = req.body.talk;
  console.log(rate);
  if (rate % 1 !== 0) {
    return res.status(400).json({
      message: 'O campo "rate" deve ser um inteiro de 1 à 5',
    });
  }
  if (rate < 1 || rate > 5) {
    return res.status(400).json({
      message: 'O campo "rate" deve ser um inteiro de 1 à 5',
    });
  }  
  next();
};

app.get('/talker/search', validadeTokenPost, async (req, res) => {
  const { q } = req.query;
  const TALKERFILE = await fs.readFile(TALKERJSON);
  const talker = JSON.parse(TALKERFILE);
  const newArray = talker.filter(({ name }) => name.includes(q));
  console.log(`pesquisa: ${newArray}`);

  res.status(200).json(newArray);
});

app.get('/talker', async (_req, res) => {
    const talker = await fs.readFile(TALKERJSON);
    console.log(JSON.parse(talker));
   return res.status(HTTP_OK_STATUS).json(JSON.parse(talker));
});

app.get('/talker/:id', async (req, res) => {
    const { id } = req.params;
    const talker = await fs.readFile(TALKERJSON);
    const talkerJSON = JSON.parse(talker);
    console.log(talkerJSON);
    const filterTalker = talkerJSON.filter((t) => t.id === +id);

    if (filterTalker.length === 0) {
 return res.status(404).json({ 
      message: 'Pessoa palestrante não encontrada',
     });
    }
    res.status(HTTP_OK_STATUS).json(filterTalker[0]);
});

app.get('/talker/search', validadeToken, (req, res) => {
  const { q } = req.query;
  const talker = fs.readFile(TALKERJSON);
  const talkerJSON = JSON.parse(talker);
  const filterTalker = talkerJSON.filter((t) => t.name.include(q));

  res.status(HTTP_OK_STATUS).json(filterTalker);
});

app.post('/login', validadeLogin, (req, res) => {
const { email, password } = req.body;
const myToken = { email, password };
const token = Crypto.AES.encrypt(JSON.stringify(myToken), 'secret key 123').toString().slice(0, 16);

/*  Array.push({ email, password }); */

 res.status(200).json({ token: `${token}` });
});

app.post(
  '/talker', 
  validadeTokenPost,
validadeName, 
validadeAge,
validadeTalk, 
validadeAllTalk,
validadeRate, 
validadeDate, 
 async (req, res) => {
  const { name, age, talk } = req.body;
  const TALKERFILE = await fs.readFile(TALKERJSON);
  const talker = JSON.parse(TALKERFILE);
  const talkerArray = [...talker, { id: talker.length + 1, name, age, talk }];
  console.log(talkerArray);
  fs.writeFile(TALKERJSON, JSON.stringify(talkerArray));
  return res.status(201).json({ id: talker.length + 1, name, age, talk });
},
);

app.put(
  '/talker/:id',
  validadeTokenPost,
  validadeName, 
  validadeAge,
  validadeTalk, 
  validadeAllTalk,
  validadeRate, 
  validadeDate, async (req, res) => {
const { id } = req.params;
const { name, age, talk } = req.body;
const TALKERFILE = await fs.readFile(TALKERJSON);
const talker = JSON.parse(TALKERFILE);
const index = id - 1;
talker[index] = { id: +id, name, age, talk };
console.log(talker);

fs.writeFile(TALKERJSON, JSON.stringify(talker));
return res.status(200).json(talker[index]);
},
);

app.delete('/talker/:id', validadeTokenPost, async (req, res) => {
 const { id } = req.params;
 const TALKERFILE = await fs.readFile(TALKERJSON);
const talker = JSON.parse(TALKERFILE);
const newArray = talker.filter((t) => t.id !== +id);
console.log(`07: ${talker}`);

fs.writeFile(TALKERJSON, JSON.stringify(newArray));
 console.log(`delete: ${newArray}`);
 console.log(`07: ${talker}`);

 return res.status(204).json(newArray);
});

app.listen(PORT, () => {
  console.log('Online');
});