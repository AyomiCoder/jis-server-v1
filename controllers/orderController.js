const Order = require('../models/Order');
const Customer = require('../models/Customer');
const OrderCounter = require('../models/OrderCounter');

// Helper function to format the date
const formatDate = (date) => {
  const options = { 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true
  };
  return new Date(date).toLocaleString('en-US', options);
};

// Create Order
exports.createOrder = async (req, res) => {
    console.log('Authenticated User ID:', req.user);  // Log the user ID to see if it's available

  try {
    const { items, customerName, customerPhone, customerAddress } = req.body;

    // Validate incoming data
    if (!items || !customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Log for debugging to check the incoming request
    // console.log('Order Data:', req.body);

    // Format the current date and time automatically
    const formattedDate = formatDate(new Date());

    // Ensure that req.user is available and contains the authenticated user's info
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Unauthorized. User not authenticated.' });
    }

    // Create or find existing customer
    let customer = await Customer.findOne({ customerPhone });
    if (!customer) {
      // If no customer exists with that phone number, create a new customer
      customer = new Customer({
        customerName,
        customerPhone,
        customerAddress,
        user: req.user.userId  // Associate customer with the authenticated user
      });
      await customer.save();
    }

    // Fetch and increment the order counter
    let orderCounter = await OrderCounter.findOne();
    if (!orderCounter) {
      // If no counter document exists, create a new one with initial value
      orderCounter = new OrderCounter({ counter: 0 });
      await orderCounter.save();
    }

    // Increment the counter and generate the custom orderId
    const newOrderId = `ORD-${orderCounter.counter + 1}`;
    orderCounter.counter += 1; // Increment the counter for next order
    await orderCounter.save(); // Save the updated counter

    // Create a new order and associate it with the customer
    const newOrder = new Order({
      orderId: newOrderId, // Set the custom orderId
      items,
      status: 'pending', // Default status is 'pending'
      customerName,
      customerPhone,
      customerAddress,
      date: formattedDate, // Automatically set date
      user: req.user.userId, // Associate order with the authenticated user
      customer: customer._id // Associate order with the customer
    });

    await newOrder.save();
    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Fetch all orders for the authenticated user
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId }).populate('customer');
    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    const { orderId, status } = req.body;
  
    // Validate status
    if (!['paid', 'pending', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
  
    try {
      // Use the `orderId` field instead of `_id` for finding the order
      const order = await Order.findOne({ orderId: orderId });
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      // Update the status
      order.status = status;
      await order.save();
  
      res.status(200).json({ message: 'Order status updated', order });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  

// Delete an orders
exports.deleteOrder = async (req, res) => {
    const { orderId } = req.body;
  
    try {
      // Use the `orderId` field to find the order
      const order = await Order.findOne({ orderId: orderId });
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      // Delete the order using deleteOne()
      await Order.deleteOne({ orderId: orderId });
  
      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
   