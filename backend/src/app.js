const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const historyRoutes = require('./routes/historyRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const shopsDataRoutes = require('./routes/shopsDataRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const salePersonRoutes = require('./routes/salePersonRoutes');
const manageUsersRoutes = require('./routes/manageUsersRoutes');
const costCategoryRoutes = require('./routes/costCategoryRoutes');
const dashboardRoutes = require('./routes/dashboard');
const receiptRoutes = require('./routes/receiptRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/shops', shopsDataRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sale-persons', salePersonRoutes);
app.use('/api/manage-users', manageUsersRoutes);
app.use('/api/cost-categories', costCategoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/receipt', receiptRoutes);
app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found API endpoint' });
});

app.use(errorHandler);

module.exports = app;
