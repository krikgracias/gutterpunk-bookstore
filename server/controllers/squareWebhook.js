// server/controllers/squareWebhook.js
const Book = require('../models/Book'); // Adjust path to models

const squareWebhook = async (req, res) => {
  try {
    const event = req.body;
    console.log('Square Webhook Event Received:', event.type);

    // CRITICAL for production: Implement Square's webhook signature verification here.
    // This ensures the request genuinely came from Square and prevents spoofing.
    // See Square's documentation: https://developer.squareup.com/docs/webhooks/verify-events
    // Example (requires square-connect-nodejs SDK or similar):
    // const SquareConnect = require('square-connect');
    // const signature = req.headers['x-square-signature'];
    // const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
    // if (!SquareConnect.V2.WebhookSignatureChecker.is =Valid(req.body, signature, webhookSecret)) {
    //    return res.status(401).send('Invalid webhook signature');
    // }

    if (event.type === 'inventory.count.updated') {
      const { catalog_object_id, quantity } = event.data.object;

      const updatedBook = await Book.findOneAndUpdate(
        { squareItemId: catalog_object_id },
        { stock: quantity },
        { new: true } // Return the updated document
      );

      if (updatedBook) {
        console.log(`Inventory updated for Book ID: ${updatedBook._id} (Square ID: ${catalog_object_id}), New Stock: ${quantity}`);
        return res.status(200).send('Inventory updated successfully');
      } else {
        console.warn(`Book with Square Item ID ${catalog_object_id} not found in DB.`);
        return res.status(404).send('Book not found for inventory update'); // Indicate book not found
      }
    } else if (event.type === 'catalog.object.updated' || event.type === 'catalog.object.created') {
        // Future improvement: Handle new product creation or updates from Square.
        // You would typically fetch full details from the Square Catalog API here
        // and create/update the corresponding Book entry in your DB.
        console.log(`Received Catalog Object event: ${event.type} for ID: ${event.data.object.id}. Further processing for full sync needed.`);
        return res.status(200).send('Catalog object event received, needs further processing for full sync.');
    }

    // Acknowledge other event types without specific processing
    res.status(200).send(`Event type ${event.type} received and acknowledged`);
  } catch (err) {
    console.error('Webhook error:', err);
    // Log the full event body or relevant parts for debugging in production
    res.status(500).send('Server error processing webhook');
  }
};

module.exports = squareWebhook;