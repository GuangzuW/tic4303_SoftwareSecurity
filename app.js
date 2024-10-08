const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Login route
app.get('/', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  // Vulnerable to SQL Injection
  const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
  
  db.get(query, (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    if (row) {
      req.session.loggedin = true;
      req.session.email = email;
      res.redirect('/thankyou');
    } else {
      res.send('Incorrect Email and/or Password!');
    }
  });
});

// Registration route
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { name, email, phone, country, gender, qualification, password } = req.body;
  
  // Vulnerable to SQL Injection
  const query = `INSERT INTO users (name, email, phone, country, gender, qualification, password) 
                 VALUES ('${name}', '${email}', '${phone}', '${country}', '${gender}', '${qualification}', '${password}')`;
  
  db.run(query, (err) => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect('/');
  });
});

// Thank you route
app.get('/thankyou', (req, res) => {
  if (req.session.loggedin) {
    res.render('thankyou', { email: req.session.email });
  } else {
    res.redirect('/');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if(err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('An error occurred during logout');
    }
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});