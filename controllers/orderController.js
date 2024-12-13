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
            name: item.name,
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
        name: item.name,
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

    // Map the results into a more user-friendly format
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
   