const Product = require('../models/Product');

const CartController = {

    // Add to cart
    add: (req, res) => {
        const productId = req.params.id;
        const quantity = parseInt(req.body.quantity) || 1;

        Product.getById(productId, (err, product) => {
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
    },

    // View cart
    view: (req, res) => {
        const cart = req.session.cart || [];
        res.render('cart', { cart });
    },

    // Delete from cart
    delete: (req, res) => {
        const id = req.params.id;
        if (!req.session.cart) req.session.cart = [];
        req.session.cart = req.session.cart.filter(item => item.id != id);
        res.redirect('/cart');
    },

    // Checkout page
    checkoutPage: (req, res) => {
        const cart = req.session.cart || [];
        if (cart.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        let total = 0;
        cart.forEach(item => {
            total += item.price * item.quantity;
        });

        res.render('checkout', { cart, total });
    },

    // Confirm payment
    confirmOrder: (req, res) => {
        if (!req.session.cart || req.session.cart.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        req.session.cart = [];  // Clear cart

        res.redirect('/checkout/success');
    },

    // Success page
    successPage: (req, res) => {
        res.render('checkoutSuccess');
    }

};

module.exports = CartController;
