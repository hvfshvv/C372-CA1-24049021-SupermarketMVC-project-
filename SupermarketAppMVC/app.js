const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const methodOverride = require('method-override');
const app = express();

// Controller + model
const SupermarketController = require('./controllers/SupermarketController');
const Supermarket = require('./models/Supermarket'); // used for cart/edit form rendering
const db = require('./db'); // used by auth routes

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // avoid collisions
    }
});
const upload = multer({ storage });

// Use method-override so HTML forms can send PUT/DELETE via _method
app.use(methodOverride('_method'));

// normalize simple casing - redirect GET requests to lowercase paths (keeps ids numeric)
app.use((req, res, next) => {
    if (req.method === 'GET') {
        const pathname = req.path;
        const lower = pathname.toLowerCase();
        if (pathname !== lower) {
            // preserve querystring
            const qs = req.url.slice(req.path.length);
            return res.redirect(301, lower + qs);
        }
    }
    next();
});

// Set up view engine
app.set('view engine', 'ejs');
// enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({ extended: false }));

// Session + flash
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(flash());

// make user available in views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.messages = req.flash();
    next();
});

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    req.flash('error', 'Access denied');
    res.redirect('/shopping');
};

// Routes

// Home - delegate to controller. Controller will pick inventory or shopping based on role.
app.get('/', (req, res) => {
    // if logged in redirect by role, otherwise show login page
    if (req.session && req.session.user) {
        if (req.session.user.role === 'admin') return res.redirect('/inventory');
        return res.redirect('/shopping');
    }
    return res.redirect('/login');
});

// Inventory (admin) - list products via controller (protected)
app.get('/inventory', checkAuthenticated, checkAdmin, SupermarketController.list);

// Shopping - list products via controller
app.get('/shopping', SupermarketController.list);

// Register / Login
app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] || {} });
});
app.post('/register', (req, res) => {
    const { username, email, password, address, contact, role } = req.body;
    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    db.query(sql, [username, email, password, address, contact, role], (err, result) => {
        if (err) {
            console.error(err);
            req.flash('error', 'Registration failed');
            return res.redirect('/register');
        }
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('error'), success: req.flash('success') });
});
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error(err);
            req.flash('error', 'Login error');
            return res.redirect('/login');
        }
        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            // redirect based on role
            if (req.session.user.role === 'admin') return res.redirect('/inventory');
            return res.redirect('/shopping');
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Add to cart - uses model to fetch product and then stores in session cart
app.post('/add-to-cart/:id', checkAuthenticated, (req, res) => {
    const productId = req.params.id;
    const quantity = parseInt(req.body.quantity) || 1;
    Supermarket.getById(productId, (err, product) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving product');
        }
        if (!product) return res.status(404).send('Product not found');

        if (!req.session.cart) req.session.cart = [];
        const existingItem = req.session.cart.find(item => item.id == productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            req.session.cart.push({
                id: product.id,
                productName: product.productName,
                price: product.price,
                quantity,
                image: product.image
            });
        }
        res.redirect('/cart');
    });
});

// Cart view
app.get('/cart', checkAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart });
});

// Product detail - uses controller
app.get('/product/:id', SupermarketController.getById);

// Add product form (admin)
app.get('/addproduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', { user: req.session.user });
});
// Add product (uses controller)
app.post('/addproduct', checkAuthenticated, checkAdmin, upload.single('image'), SupermarketController.add);

// Update product form - fetch product via model then render update view
app.get('/updateproduct/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const id = req.params.id;
    Supermarket.getById(id, (err, product) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving product');
        }
        if (!product) return res.status(404).send('Product not found');
        res.render('updateProduct', { product, user: req.session.user });
    });
});

// Update product - support PUT and POST (_method override for forms)
app.put('/updateproduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), SupermarketController.update);
app.post('/updateproduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), SupermarketController.update); // fallback for forms

// Delete product - support DELETE and GET fallback
app.delete('/deleteproduct/:id', checkAuthenticated, checkAdmin, SupermarketController.delete);
app.get('/deleteproduct/:id', checkAuthenticated, checkAdmin, SupermarketController.delete); // fallback

// Accept POST (form) requests to delete a product
app.post('/deleteproduct/:id', checkAuthenticated, checkAdmin, (req, res) => {
    console.log('POST /deleteproduct/:id', req.params.id);
    // delegate to controller (controller expects req,res)
    return SupermarketController.delete(req, res);
});

// Also accept DELETE (if using method-override)
app.delete('/deleteproduct/:id', checkAuthenticated, checkAdmin, (req, res) => {
    console.log('DELETE /deleteproduct/:id', req.params.id);
    return SupermarketController.delete(req, res);
});

// Delete a single item from the session cart (POST)
app.post('/cart/delete/:id', checkAuthenticated, (req, res) => {
    console.log('POST /cart/delete/:id called, id=', req.params.id);
    const id = req.params.id;
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.redirect('/cart');
    }
    req.session.cart = req.session.cart.filter(item => item.id != id);
    res.redirect('/cart');
});

// Delete using method-override (DELETE)
app.delete('/cart/delete/:id', checkAuthenticated, (req, res) => {
    console.log('DELETE /cart/delete/:id called, id=', req.params.id);
    const id = req.params.id;
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.redirect('/cart');
    }
    req.session.cart = req.session.cart.filter(item => item.id != id);
    res.redirect('/cart');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
