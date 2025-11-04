const Supermarket = require('../models/Supermarket');

const SupermarketController = {
    // List all products - render inventory for admin, shopping for normal users/guests
    list: function (req, res) {
        Supermarket.getAll(function (err, products) {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            // ensure user is always null or an object (never undefined)
            const user = (req.session && req.session.user) ? req.session.user : null;

            // mark low stock items (quantity < 30) — normalize quantity to a number
            if (Array.isArray(products)) {
                products.forEach(p => {
                    p.quantity = Number(p.quantity) || 0;
                    p.lowStock = p.quantity < 30;
                });
            } else {
                products = [];
            }

            if (user && user.role === 'admin') {
                return res.render('inventory', { products, user });
            }
            return res.render('shopping', { products, user });
        });
    },

    // Get a product by ID
    getById: function (req, res) {
        const id = req.params.id || req.params.productId;
        Supermarket.getById(id, function (err, product) {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (!product) return res.status(404).send('Product not found');
            res.render('product', { product, user: req.session ? req.session.user : null });
        });
    },

    // Add a new product (expects req.body and optional req.file for image)
    add: function (req, res) {
        const product = {
            productName: req.body.productName || req.body.name,
            quantity: req.body.quantity,
            price: req.body.price,
            image: req.file ? req.file.filename : (req.body.image || null)
        };

        Supermarket.add(product, function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).send('Failed to add product');
            }
            res.redirect('/inventory');
        });
    },

    // Update an existing product
    update: function (req, res) {
        const id = req.params.id || req.params.productId;
        const product = {
            productName: req.body.productName || req.body.name,
            quantity: req.body.quantity,
            price: req.body.price,
            image: req.file ? req.file.filename : (req.body.image || req.body.currentImage || null)
        };

        Supermarket.update(id, product, function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).send('Failed to update product');
            }
            if (result.affectedRows === 0) return res.status(404).send('Product not found');
            res.redirect('/inventory');
        });
    },

    // Delete a product
    delete: function (req, res) {
        const id = req.params.id || req.params.productId;
        Supermarket.delete(id, function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).send('Failed to delete product');
            }
            if (result.affectedRows === 0) return res.status(404).send('Product not found');
            res.redirect('/inventory');
        });
    }
};

module.exports = SupermarketController;
