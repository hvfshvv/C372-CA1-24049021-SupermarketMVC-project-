module.exports = {
    checkoutPage: (req, res) => {
        const cart = req.session.cart || [];
        let total = 0;

        cart.forEach(item => total += item.total);

        res.render("checkout", { cart, total });
    },

    processPayment: (req, res) => {
        req.session.cart = [];
        req.flash("success", "Payment successful!");
        res.redirect("/success");
    },

    successPage: (req, res) => {
        res.render("success");
    }
};
