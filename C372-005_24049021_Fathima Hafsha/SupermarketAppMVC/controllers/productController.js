const Product = require('../models/Product');

const ProductController = {
    // List all products (admin sees inventory, others see shopping)
    list: function (req, res) {
        Product.getAll(function (err, products) {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            const user = req.session?.user || null;

            // Mark low stock items
            if (Array.isArray(products)) {
                products.forEach(p => {
                    p.quantity = Number(p.quantity) || 0;
                    p.lowStock = p.quantity < 30;
                });
            }

            if (user && user.role === 'admin') {
                return res.render('inventory', { products, user });
            }
            return res.render('shopping', { products, user });
        });
    },

    // Product details
    getById: function (req, res) {
        const id = req.params.id;
        Product.getById(id, function (err, product) {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (!product) return res.status(404).send('Product not found');

            res.render('product', { product, user: req.session.user || null });
        });
    },

    // Add product
    add: function (req, res) {
        const product = {
            productName: req.body.productName,
            quantity: parseInt(req.body.quantity) || 0,
            price: parseFloat(req.body.price) || 0,
            image: req.file ? req.file.filename : null
        };

        console.log('Adding product:', product);  // helpful debug

        Product.add(product, function (err, result) {
            if (err) {
                console.error('Add product error:', err);
                return res.status(500).send('Failed to add product');
            }
            res.redirect('/inventory');
        });
    },

    // Update product
    update: function (req, res) {
        const id = req.params.id;

        const product = {
            productName: req.body.productName,
            quantity: parseInt(req.body.quantity) || 0,
            price: parseFloat(req.body.price) || 0,
            image: req.file ? req.file.filename : req.body.currentImage || null
        };

        Product.update(id, product, function (err, result) {
            if (err) {
                console.error('Update product error:', err);
                return res.status(500).send('Failed to update product');
            }
            if (result.affectedRows === 0) return res.status(404).send('Product not found');
            res.redirect('/inventory');
        });
    },

    // Delete product
    delete: function (req, res) {
        const id = req.params.id;
        Product.delete(id, function (err, result) {
            if (err) {
                console.error('Delete product error:', err);
                return res.status(500).send('Failed to delete product');
            }
            if (result.affectedRows === 0) return res.status(404).send('Product not found');
            res.redirect('/inventory');
        });
    }
};

module.exports = ProductController;
