const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const db = require("./database"); // Assuming SQLite

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "tic4304",
    resave: false,
    saveUninitialized: true,
  })
);

// Vulnerable Login Route
app.get("/", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Deliberately vulnerable to SQL injection
  const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;

  db.get(query, (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    if (row) {
      req.session.loggedin = true;
      req.session.email = email;
      res.cookie("role", row.role, { httpOnly: false });
      res.redirect("/thankyou");
    } else {
      res.send("Incorrect Email and/or Password!");
    }
  });
});

// Vulnerable Registration Route
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { name, email, phone, country, gender, qualification, password } =
    req.body;

  // Deliberately vulnerable to SQL injection
  const query = `INSERT INTO users (name, email, phone, country, gender, qualification, password) 
                 VALUES ('${name}', '${email}', '${phone}', '${country}', '${gender}', '${qualification}', '${password}')`;

  db.run(query, (err) => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/");
  });
});

// Thank you route
app.get("/thankyou", (req, res) => {
  if (req.session.loggedin) {
    res.render("thankyou", { email: req.session.email });
  } else {
    res.redirect("/");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("An error occurred during logout");
    }
    res.redirect("/");
  });
});

// Admin Check Middleware
function isAdmin(req, res, next) {
  if (req.session.loggedin && req.cookies.role === "admin") {
    return next();
  } else {
    res.status(403).send("Access Denied: Admins Only");
  }
}

// Vulnerable User List Route (Exposed to SQL Injection)
app.get("/userlist", isAdmin, (req, res) => {
  if (req.session.loggedin) {
    const query =
      "SELECT id, name, email, phone, country, gender, qualification FROM users";

    // Exposed to SQL injection if attacker can manipulate input elsewhere
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).send("An error occurred while fetching users");
      }
      res.render("userlist", { users: rows });
    });
  } else {
    res.redirect("/");
  }
});

// Vulnerable Profile Route
app.get("/profile", (req, res) => {
  if (req.session.loggedin) {
    // Vulnerable to SQL Injection via session email
    const query = `SELECT * FROM users WHERE email = '${req.session.email}'`;

    db.get(query, (err, row) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).send("An error occurred");
      }
      if (row) {
        res.render("profile", { user: row });
      } else {
        res.status(404).send("User not found");
      }
    });
  } else {
    res.redirect("/");
  }
});

// Role Setting Route
app.get("/set-role/:role", (req, res) => {
  if (req.session.loggedin) {
    req.session.role = req.params.role;
    res.send(
      `Role set to ${req.params.role}. You can now access admin routes if set to 'admin'.`
    );
  } else {
    res.send("You need to log in first.");
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
