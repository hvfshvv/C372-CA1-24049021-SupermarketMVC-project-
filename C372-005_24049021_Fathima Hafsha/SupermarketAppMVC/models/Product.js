const db = require('../db');

const Product = {
    // Get all products
    getAll: function (callback) {
        const sql = 'SELECT id, productName, quantity, price, image FROM products';
        db.query(sql, function (err, results) {
            if (err) return callback(err);
            callback(null, results);
        });
    },

    // Get a product by ID
    getById: function (productId, callback) {
        const sql = 'SELECT id, productName, quantity, price, image FROM products WHERE id = ?';
        db.query(sql, [productId], function (err, results) {
            if (err) return callback(err);
            callback(null, results.length ? results[0] : null);
        });
    },

    // Add a new product
    add: function (product, callback) {
        const sql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
        const params = [
            product.productName,
            product.quantity,
            product.price,
            product.image
        ];
        db.query(sql, params, function (err, result) {
            if (err) return callback(err);
            callback(null, { insertId: result.insertId, affectedRows: result.affectedRows });
        });
    },

    // Update an existing product
    update: function (productId, product, callback) {
        const sql = 'UPDATE products SET productName = ?, quantity = ?, price = ?, image = ? WHERE id = ?';
        const params = [
            product.productName,
            product.quantity,
            product.price,
            product.image,
            productId
        ];
        db.query(sql, params, function (err, result) {
            if (err) return callback(err);
            callback(null, { affectedRows: result.affectedRows });
        });
    },

    // Delete a product
    delete: function (productId, callback) {
        const sql = 'DELETE FROM products WHERE id = ?';
        db.query(sql, [productId], function (err, result) {
            if (err) return callback(err);
            callback(null, { affectedRows: result.affectedRows });
        });
    }
};

module.exports = Product;  
