const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedInitialData(force = false) {
  const users = db.find('users');
  if (users.length > 0 && !force) {
    return; // Already initialized
  }

  if (force) {
    // Clear all existing data for clean reset
    const collections = [
      'users', 'products', 'categories', 'brands', 'sales', 'heldSales',
      'customers', 'customerPayments', 'suppliers', 'purchases',
      'supplierPayments', 'stockAdjustments', 'expenses', 'auditLogs', 'settings'
    ];
    for (const c of collections) {
      db.cache[c] = [];
      db.save(c);
    }
  }

  // 1. Settings
  db.create('settings', {
    id: 'store_settings',
    shopName: 'DevLoop Supermarket',
    tagline: 'Smart Retail & Inventory Management',
    logoUrl: '/logo.png',
    address: 'No. 45, Galle Road, Colombo 03, Sri Lanka',
    phone: '+94 11 234 5678',
    email: 'info@devlooppos.lk',
    currency: 'LKR',
    currencySymbol: 'Rs. ',
    taxEnabled: false,
    taxRate: 0,
    receiptHeader: 'Thank you for shopping at DevLoop Supermarket!',
    receiptFooter: 'Goods once sold can be exchanged within 7 days with valid receipt.\nHave a wonderful day!',
    thermalWidth: '80mm',
    showBarcodeOnReceipt: true,
    barcodeLabelFormat: '50x30',
    lowStockThreshold: 10,
    sessionTimeoutMinutes: 30,
    requirePinForPriceChange: true,
    requirePinForRefund: true,
    requirePinForStockAdjustment: true
  });

  // 2. Default Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminPin = await bcrypt.hash('1234', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);
  const cashierPin = await bcrypt.hash('2345', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);
  const managerPin = await bcrypt.hash('5678', 10);
  const inventoryPassword = await bcrypt.hash('staff123', 10);
  const inventoryPin = await bcrypt.hash('9012', 10);

  const adminUser = db.create('users', {
    name: 'Kasun Rathnayake (Admin)',
    username: 'admin',
    email: 'admin@devlooppos.lk',
    password: adminPassword,
    pin: adminPin,
    role: 'admin',
    status: 'active'
  });

  const managerUser = db.create('users', {
    name: 'Dilshan Silva (Manager)',
    username: 'manager',
    email: 'manager@devlooppos.lk',
    password: managerPassword,
    pin: managerPin,
    role: 'manager',
    status: 'active'
  });

  const cashierUser = db.create('users', {
    name: 'Shenali Perera (Cashier)',
    username: 'cashier',
    email: 'cashier@devlooppos.lk',
    password: cashierPassword,
    pin: cashierPin,
    role: 'cashier',
    status: 'active'
  });

  const inventoryUser = db.create('users', {
    name: 'Nuwan Jayawardena (Inventory)',
    username: 'inventory',
    email: 'inventory@devlooppos.lk',
    password: inventoryPassword,
    pin: inventoryPin,
    role: 'inventory_staff',
    status: 'active'
  });

  // 3. Categories
  const categories = [
    { name: 'Beverages', description: 'Soft drinks, teas, coffees, juices' },
    { name: 'Dairy & Eggs', description: 'Milk, cheese, butter, fresh eggs' },
    { name: 'Bakery & Snacks', description: 'Bread, biscuits, cakes, chips' },
    { name: 'Rice, Grains & Staples', description: 'Basmati rice, samba, dhal, flour' },
    { name: 'Household & Cleaning', description: 'Detergents, soaps, cleaning essentials' },
    { name: 'Personal Care', description: 'Shampoos, toothpaste, cosmetics' }
  ];
  for (const cat of categories) {
    db.create('categories', cat);
  }

  // 4. Suppliers
  const sup1 = db.create('suppliers', {
    supplierCode: 'SUP-001',
    name: 'Maliban Biscuit Manufactories',
    businessName: 'Maliban Lanka (Pvt) Ltd',
    phone: '+94 11 285 5555',
    email: 'orders@maliban.lk',
    address: '389, Galle Road, Ratmalana',
    outstandingBalance: 45000
  });

  const sup2 = db.create('suppliers', {
    supplierCode: 'SUP-002',
    name: 'Ceylon Cold Stores (Elephant House)',
    businessName: 'Elephant House Beverage Co',
    phone: '+94 11 247 9000',
    email: 'sales@ccs.lk',
    address: 'Kaduwela Road, Ranala',
    outstandingBalance: 68500
  });

  const sup3 = db.create('suppliers', {
    supplierCode: 'SUP-003',
    name: 'Highland Dairy Corporation',
    businessName: 'Milco (Pvt) Ltd',
    phone: '+94 11 258 2333',
    email: 'info@highland.lk',
    address: 'Narahenpita, Colombo 05',
    outstandingBalance: 12000
  });

  // 5. Products
  const sampleProducts = [
    {
      sku: 'BEV-001',
      barcode: '890123450001',
      name: 'Elephant House Cream Soda 1.5L',
      category: 'Beverages',
      brand: 'Elephant House',
      purchasePrice: 320,
      sellingPrice: 380,
      wholesalePrice: 360,
      stock: 48,
      minStockLevel: 15,
      supplierId: sup2.id,
      supplierName: sup2.name,
      expiryDate: '2027-04-15',
      description: 'Refreshing classic cream soda 1.5L bottle'
    },
    {
      sku: 'BEV-002',
      barcode: '890123450002',
      name: 'Elephant House Ginger Beer (EGB) 1L',
      category: 'Beverages',
      brand: 'Elephant House',
      purchasePrice: 280,
      sellingPrice: 340,
      wholesalePrice: 320,
      stock: 35,
      minStockLevel: 10,
      supplierId: sup2.id,
      supplierName: sup2.name,
      expiryDate: '2027-03-30',
      description: 'Authentic Ceylon ginger beer natural formulation'
    },
    {
      sku: 'BAK-001',
      barcode: '890123450003',
      name: 'Maliban Lemon Puff 200g',
      category: 'Bakery & Snacks',
      brand: 'Maliban',
      purchasePrice: 190,
      sellingPrice: 240,
      wholesalePrice: 220,
      stock: 60,
      minStockLevel: 20,
      supplierId: sup1.id,
      supplierName: sup1.name,
      expiryDate: '2027-02-28',
      description: 'Crispy biscuits with zesty lemon cream'
    },
    {
      sku: 'BAK-002',
      barcode: '890123450004',
      name: 'Maliban Chocolate Biscuit 200g',
      category: 'Bakery & Snacks',
      brand: 'Maliban',
      purchasePrice: 210,
      sellingPrice: 260,
      wholesalePrice: 240,
      stock: 8, // Low stock demo!
      minStockLevel: 15,
      supplierId: sup1.id,
      supplierName: sup1.name,
      expiryDate: '2027-03-10',
      description: 'Rich dark cocoa cream sandwich biscuits'
    },
    {
      sku: 'DAI-001',
      barcode: '890123450005',
      name: 'Highland Fresh Milk 1L Pack',
      category: 'Dairy & Eggs',
      brand: 'Highland',
      purchasePrice: 420,
      sellingPrice: 490,
      wholesalePrice: 460,
      stock: 24,
      minStockLevel: 12,
      supplierId: sup3.id,
      supplierName: sup3.name,
      expiryDate: '2026-12-15',
      description: '100% pure Sri Lankan fresh dairy milk'
    },
    {
      sku: 'DAI-002',
      barcode: '890123450006',
      name: 'Highland Salted Butter 227g',
      category: 'Dairy & Eggs',
      brand: 'Highland',
      purchasePrice: 680,
      sellingPrice: 820,
      wholesalePrice: 770,
      stock: 4, // Very low stock!
      minStockLevel: 10,
      supplierId: sup3.id,
      supplierName: sup3.name,
      expiryDate: '2027-01-20',
      description: 'Creamy pure pasteurized butter'
    },
    {
      sku: 'RIC-001',
      barcode: '890123450007',
      name: 'Araliya Keeri Samba Rice 5kg',
      category: 'Rice, Grains & Staples',
      brand: 'Araliya',
      purchasePrice: 1250,
      sellingPrice: 1480,
      wholesalePrice: 1400,
      stock: 30,
      minStockLevel: 10,
      supplierId: sup1.id,
      supplierName: 'Araliya Agri Mills',
      expiryDate: '2027-10-01',
      description: 'Premium aged white keeri samba rice'
    },
    {
      sku: 'HOU-001',
      barcode: '890123450008',
      name: 'Sunlight Lemon Laundry Soap 115g (Twin Pack)',
      category: 'Household & Cleaning',
      brand: 'Sunlight',
      purchasePrice: 140,
      sellingPrice: 180,
      wholesalePrice: 165,
      stock: 50,
      minStockLevel: 15,
      supplierId: sup2.id,
      supplierName: 'Unilever Supply',
      expiryDate: '2028-05-15',
      description: 'Fresh lemon fragrant washing soap twin pack'
    },
    {
      sku: 'PER-001',
      barcode: '890123450009',
      name: 'Signal Strong Teeth Toothpaste 160g',
      category: 'Personal Care',
      brand: 'Signal',
      purchasePrice: 260,
      sellingPrice: 320,
      wholesalePrice: 300,
      stock: 0, // Out of stock demo!
      minStockLevel: 8,
      supplierId: sup2.id,
      supplierName: 'Unilever Supply',
      expiryDate: '2027-08-10',
      description: 'Fluoride toothpaste for all day dental protection'
    }
  ];

  const createdProducts = [];
  for (const p of sampleProducts) {
    const prod = db.create('products', p);
    createdProducts.push(prod);
  }

  // 6. Customers & Debtors
  const cust1 = db.create('customers', {
    customerCode: 'CUST-1001',
    name: 'Kamal Gunaratne',
    phone: '+94 77 123 4567',
    address: '14/B, Flower Road, Colombo 07',
    creditLimit: 50000,
    currentBalance: 12500, // outstanding debt
    totalPurchases: 78500
  });

  const cust2 = db.create('customers', {
    customerCode: 'CUST-1002',
    name: 'Priyani Wijesinghe',
    phone: '+94 71 987 6543',
    address: '88/2, Havelock Town, Colombo 05',
    creditLimit: 30000,
    currentBalance: 8200, // outstanding debt
    totalPurchases: 44200
  });

  const cust3 = db.create('customers', {
    customerCode: 'CUST-1003',
    name: 'Walk-in Customer (General)',
    phone: '+94 70 000 0000',
    address: 'Store Walk-in',
    creditLimit: 0,
    currentBalance: 0,
    totalPurchases: 125000
  });

  // 7. Sample Initial Sales Invoices (Today & Yesterday)
  const now = new Date();
  const todayStr = now.toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Invoice 1: Cash sale
  db.create('sales', {
    invoiceNumber: 'INV-20261025-0001',
    customerId: cust3.id,
    customerName: cust3.name,
    customerPhone: cust3.phone,
    items: [
      {
        productId: createdProducts[0].id,
        sku: createdProducts[0].sku,
        barcode: createdProducts[0].barcode,
        name: createdProducts[0].name,
        quantity: 2,
        unitCost: 320,
        unitPrice: 380,
        discount: 0,
        total: 760
      },
      {
        productId: createdProducts[2].id,
        sku: createdProducts[2].sku,
        barcode: createdProducts[2].barcode,
        name: createdProducts[2].name,
        quantity: 3,
        unitCost: 190,
        unitPrice: 240,
        discount: 0,
        total: 720
      }
    ],
    subtotal: 1480,
    discountType: 'fixed',
    discountValue: 0,
    discountTotal: 0,
    taxPercent: 0,
    taxTotal: 0,
    grandTotal: 1480,
    cogsTotal: (2 * 320) + (3 * 190), // 640 + 570 = 1210
    grossProfit: 1480 - 1210, // 270
    paymentType: 'cash',
    payments: [{ method: 'cash', amount: 1500, reference: '' }],
    amountReceived: 1500,
    changeDue: 20,
    balanceDue: 0,
    paymentStatus: 'paid',
    cashierId: cashierUser.id,
    cashierName: cashierUser.name,
    status: 'completed',
    createdAt: yesterday
  });

  // Invoice 2: Today Credit sale to Kamal Gunaratne
  db.create('sales', {
    invoiceNumber: 'INV-20261026-0001',
    customerId: cust1.id,
    customerName: cust1.name,
    customerPhone: cust1.phone,
    items: [
      {
        productId: createdProducts[6].id, // Keeri Samba Rice
        sku: createdProducts[6].sku,
        barcode: createdProducts[6].barcode,
        name: createdProducts[6].name,
        quantity: 2,
        unitCost: 1250,
        unitPrice: 1480,
        discount: 0,
        total: 2960
      },
      {
        productId: createdProducts[4].id, // Fresh Milk
        sku: createdProducts[4].sku,
        barcode: createdProducts[4].barcode,
        name: createdProducts[4].name,
        quantity: 4,
        unitCost: 420,
        unitPrice: 490,
        discount: 0,
        total: 1960
      }
    ],
    subtotal: 4920,
    discountType: 'fixed',
    discountValue: 120,
    discountTotal: 120,
    taxPercent: 0,
    taxTotal: 0,
    grandTotal: 4800,
    cogsTotal: (2 * 1250) + (4 * 420), // 2500 + 1680 = 4180
    grossProfit: 4800 - 4180, // 620
    paymentType: 'credit',
    payments: [{ method: 'credit', amount: 4800, reference: 'On Account' }],
    amountReceived: 0,
    changeDue: 0,
    balanceDue: 4800,
    paymentStatus: 'unpaid',
    cashierId: cashierUser.id,
    cashierName: cashierUser.name,
    status: 'completed',
    createdAt: todayStr
  });

  // 8. Operating Expenses (Electricity, Rent, Salaries)
  db.create('expenses', {
    category: 'Electricity',
    amount: 14500,
    expenseDate: yesterday.split('T')[0],
    paymentMethod: 'bank_transfer',
    description: 'CEB Store electricity bill payment',
    recordedBy: adminUser.name
  });
  db.create('expenses', {
    category: 'Stationery',
    amount: 3200,
    expenseDate: todayStr.split('T')[0],
    paymentMethod: 'cash',
    description: 'Thermal receipt paper rolls (Pack of 20)',
    recordedBy: adminUser.name
  });

  // 9. Initial Audit Log
  db.create('auditLogs', {
    action: 'SYSTEM_INITIALIZATION',
    reference: 'SYS-INIT',
    details: 'System initialized with default retail store catalog, users and parameters',
    entityType: 'system',
    entityId: 'devloop_pos',
    userId: adminUser.id,
    userName: adminUser.name,
    userRole: 'admin',
    ip: '127.0.0.1',
    createdAt: todayStr
  });

  console.log('Sample data successfully seeded.');
}

module.exports = { seedInitialData };
