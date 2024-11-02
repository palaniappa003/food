const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true,
}));

app.use(bodyParser.json());


mongoose.connect('mongodb+srv://palaniappa:palaniappa@cluster1.ma36g.mongodb.net/Orders');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});


const restaurantSchema = new mongoose.Schema({
  name: String,
  menu: [{ name: String, price: Number }]
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);


const orderSchema = new mongoose.Schema({
  items: [{
    name: String,
    price: Number,
    restaurantName: String,
    status: { type: String, default: 'Received' }, 
  }],
  total: String,
  restaurantStatuses: [{ 
    restaurantName: String,
    status: { type: String, default: 'Received' } 
  }],
});

const Order = mongoose.model('Order', orderSchema);


app.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.post('/orders', async (req, res) => {
  const { items, total } = req.body;

  
  const restaurantStatuses = items.reduce((acc, item) => {
    const existing = acc.find(status => status.restaurantName === item.restaurantName);
    if (!existing) {
      acc.push({ restaurantName: item.restaurantName, status: 'Received' });
    }
    return acc;
  }, []);

  const order = new Order({ items, total, restaurantStatuses });

  try {
    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(400).json({ message: 'Error saving order', error: err.message });
  }
});


app.patch('/orders/:orderId/restaurant/:restaurantName', async (req, res) => {
  try {
    const { orderId, restaurantName } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    
    order.items.forEach(item => {
      if (item.restaurantName === restaurantName) {
        item.status = status;
      }
    });

    
    const restaurantStatus = order.restaurantStatuses.find(rs => rs.restaurantName === restaurantName);
    if (restaurantStatus) {
      restaurantStatus.status = status;
    }

    
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.get('/orders/:orderId/check-complete', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const allReady = order.restaurantStatuses.every(rs => rs.status === 'Ready');
    res.json({ complete: allReady });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.delete('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
