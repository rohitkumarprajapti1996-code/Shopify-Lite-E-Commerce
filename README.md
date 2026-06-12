# Shopify-Lite E-Commerce

A lightweight e-commerce application built with React and designed for GitHub Pages deployment.

## Features

### Customer Portal
- Product Catalog
- Product Search
- Shopping Cart
- Checkout Process
- Order Placement
- Order History

### Merchant Dashboard
- Inventory Management
- Order Management
- Dispatch Tracking
- Delivery Tracking
- Payment Monitoring
- Customer Management

### Data Management
- Local Storage Persistence
- CSV Product Import
- CSV Order Import
- Real-Time Dashboard Updates
- Google Sheets Backup
- Firebase Database Support

### Authentication
- User Registration
- Secure Login
- Role-Based Access Control
- Admin Dashboard Access

## Technology Stack

- React
- JavaScript
- HTML5
- CSS3
- Firebase
- Google Sheets API
- GitHub Pages

## Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/shopify-lite-ecommerce.git
```

2. Navigate to project folder

```bash
cd shopify-lite-ecommerce
```

3. Install dependencies

```bash
npm install
```

4. Start development server

```bash
npm start
```

## Build for Production

```bash
npm run build
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

## Project Structure

```
/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   └── App.js
├── package.json
└── README.md
```

## CSV Import Format

### Products CSV

| SKU | Product Name | Category | Price | Stock |
|------|-------------|-----------|--------|--------|
| P001 | Product A | Books | 100 | 50 |

### Orders CSV

| Order ID | Customer | Product | Qty | Status |
|-----------|----------|---------|-----|--------|
| ORD001 | John Doe | Product A | 2 | Pending |

## Firebase Configuration

Create a Firebase project and update:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Google Sheets Backup

1. Create Google Cloud Project
2. Enable Google Sheets API
3. Create Service Account
4. Share Sheet with Service Account Email
5. Add credentials to project

## Future Enhancements

- Payment Gateway Integration
- SMS Notifications
- WhatsApp Notifications
- Barcode Scanning
- Advanced Reports
- Multi-Warehouse Support

## License

MIT License

## Author

Developed for inventory, dispatch, and e-commerce management.