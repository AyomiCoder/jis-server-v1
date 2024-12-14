const Order = require('../models/Order');
const Customer = require('../models/Customer');
const OrderCounter = require('../models/OrderCounter');
const mongoose = require('mongoose');

// Helper function to format the dates
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
// Create Order
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession(); // Start a session for transaction
  session.startTransaction(); // Begin transaction

  try {
    const { items, customerName, customerPhone, customerAddress } = req.body;

    // Validate input
    if (!items || !customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Ensure authenticated user
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Unauthorized. User not authenticated.' });
    }

    const formattedDate = new Date().toLocaleString();

    // Find or create customer
    let customer = await Customer.findOne({ customerPhone, user: req.user.userId });
    if (!customer) {
      customer = new Customer({
        customerName,
        customerPhone,
        customerAddress,
        user: req.user.userId,
      });
      await customer.save({ session }); // Save within the transaction
    }

    // Atomically find and update the order counter
    let orderCounter = await OrderCounter.findOneAndUpdate(
      {}, // Match any document
      { $inc: { counter: 1 } }, // Increment counter
      { new: true, upsert: true, session } // Create if not exists
    );

    // If the counter starts from zero, reset it to 1
    if (orderCounter.counter === 0) {
      orderCounter.counter = 1;
      await orderCounter.save({ session }); // Save to fix if counter was initialized as 0
    }

    // Generate new order ID based on the counter
    let newOrderId = `ORD-${orderCounter.counter}`;

    // Ensure uniqueness of the new orderId by checking the Order collection
    let orderExists = await Order.findOne({ orderId: newOrderId }).session(session);
    while (orderExists) {
      // If orderId exists, increment the counter and regenerate the orderId
      orderCounter.counter += 1;
      await orderCounter.save({ session });
      newOrderId = `ORD-${orderCounter.counter}`;
      orderExists = await Order.findOne({ orderId: newOrderId }).session(session);
    }

    // Create new order
    const newOrder = new Order({
      orderId: newOrderId,
      items,
      status: 'pending',
      customerName,
      customerPhone,
      customerAddress,
      date: formattedDate,
      user: req.user.userId,
      customer: customer._id,
    });

    // Save order to the database within the session
    await newOrder.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (error) {
    await session.abortTransaction(); // Rollback transaction if there's an errors     
    session.endSession();
    console.error('Error creating order:', error.message || error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


 
// Fetch all orders for the authenticated users 
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

// Delete an order
exports.deleteOrder = async (req, res) => {
  const { orderId } = req.body;

  try {
    // Validate input
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required.' });
    }

    // Find the order by its orderId
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Delete the order
    await Order.deleteOne({ orderId });

    // Adjust the order IDs for all remaining orders
    const remainingOrders = await Order.find({ user: order.user }).sort({ date: 1 }); // Sort by date
    let counter = 1;

    for (let remainingOrder of remainingOrders) {
      // Update the orderId to match the new counter
      remainingOrder.orderId = `ORD-${counter}`;
      counter++;
      await remainingOrder.save();
    }

    // Update the counter in the OrderCounter model
    const orderCounter = await OrderCounter.findOne();
    if (orderCounter) {
      orderCounter.counter = remainingOrders.length; // Update counter to match remaining orders
      await orderCounter.save();
    }

    res.status(200).json({ message: 'Order deleted successfully.' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Generate a PDF for an individual order invoice
exports.generateOrderInvoice = async (req, res) => {
  const { orderId } = req.params;

  try {
    // Fetch the order along with the customer information
    const order = await Order.findOne({ orderId, user: req.user.userId })
      .populate('customer') // Populate the customer details
      .populate('user', 'businessName'); // Populate the business name from the User model

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Calculate the total amount for the order
    const totalAmount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Construct the data object for the invoice
    const data = {
      business: {
        name: order.user.businessName
      },
      order: {
        orderId: order.orderId,
        date: formatDate(order.date),  // Assuming formatDate is a utility function
        status: order.status,
        customer: {
          name: order.customerName,
          phone: order.customerPhone,
          address: order.customerAddress,
        },
        items: order.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount,
      },
    };

    // Send the response with the invoice data
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Generate a PDF report for all orders
exports.generateOrdersReport = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId }).populate('customer');

    const reportData = orders.map(order => ({
      orderId: order.orderId,
      date: formatDate(order.date),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      status: order.status,
      items: order.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
      })),
      totalAmount: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }));

    res.status(200).json({ orders: reportData });
  } catch (error) {
    console.error("Error fetching orders report data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Calculate transactional totals
exports.getTransactionTotals = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Aggregate totals for Paid, Pending, and Failed orders
    const totals = await Order.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$items.totalPrice' }, // Assuming each item has a 'totalPrice' field
        },
      },
    ]);

    // Map the results into a more user-friendly format
    const response = {
      paidTotal: totals.find((t) => t._id === 'paid')?.totalAmount || 0,
      pendingTotal: totals.find((t) => t._id === 'pending')?.totalAmount || 0,
      failedTotal: totals.find((t) => t._id === 'failed')?.totalAmount || 0,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error calculating transaction totals:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get order counts by status
exports.getOrderCounts = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Aggregate counts for Paid, Pending, and Failed orders
    const counts = await Order.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Map the results into a more user-friendly formats
    const response = {
      paidCount: counts.find((c) => c._id === 'paid')?.count || 0,
      pendingCount: counts.find((c) => c._id === 'pending')?.count || 0,
      failedCount: counts.find((c) => c._id === 'failed')?.count || 0,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching order counts:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
