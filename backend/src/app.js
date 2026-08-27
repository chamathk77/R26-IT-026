const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const restaurantRoutes = require('./routes/restaurant');
const cartRoutes = require('./routes/cartRoutes');
const manualOrderRoutes = require('./routes/manualOrderRoutes');
const customerOrderRoutes = require('./routes/customerOrderRoutes');
const historyRoutes = require('./routes/historyRoutes');
const shopsDataRoutes = require('./routes/shopsDataRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const salePersonRoutes = require('./routes/salePersonRoutes');
const manageUsersRoutes = require('./routes/manageUsersRoutes');
const costCategoryRoutes = require('./routes/costCategoryRoutes');
const costExpenseRoutes = require('./routes/costExpenseRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const dashboardRoutes = require('./routes/dashboard');
const kpiRoutes = require('./routes/kpiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const forecastRoutes = require('./novelty/novelty01Forecasting/forecastRoutes');
const customerBehaviorRoutes = require('./novelty/novelty02CustomerBehavior/behaviorRoutes');
const productDemandRoutes = require('./novelty/novelty03ProductDemand/productDemandRoutes');
const recommendationRoutes = require('./novelty/novelty04RecommendationSystem/recommendationRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Upload file not found on server',
    path: req.path,
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', restaurantRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/manual-orders', manualOrderRoutes);
// Public (no auth) — customer QR menu + order placement.
app.use('/api/customer-orders', customerOrderRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/shops', shopsDataRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sale-persons', salePersonRoutes);
app.use('/api/manage-users', manageUsersRoutes);
app.use('/api/cost-categories', costCategoryRoutes);
app.use('/api/cost-expenses', costExpenseRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/customer-behavior', customerBehaviorRoutes);
app.use('/api/product-demand', productDemandRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/receipt', receiptRoutes);
app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found API endpoint' });
});

app.use(errorHandler);

module.exports = app;
