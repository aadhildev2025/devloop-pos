const db = require('../config/db');

exports.getDashboardStats = (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const sales = db.find('sales');
    const purchases = db.find('purchases');
    const products = db.find('products');
    const customers = db.find('customers');
    const suppliers = db.find('suppliers');
    const expenses = db.find('expenses');

    // Filter sales if custom date filter requested
    let filteredSales = sales;
    if (fromDate && toDate) {
      const fromTime = new Date(`${fromDate}T00:00:00`).getTime();
      const toTime = new Date(`${toDate}T23:59:59`).getTime();
      filteredSales = sales.filter(s => {
        const t = new Date(s.createdAt).getTime();
        return t >= fromTime && t <= toTime;
      });
    }

    // 1. Sales metrics
    let todaySales = 0;
    let todayCount = 0;
    let weekSales = 0;
    let monthSales = 0;
    let totalSales = 0;
    let totalCogs = 0;
    let totalGrossProfit = 0;

    for (const s of sales) {
      const sTime = new Date(s.createdAt).getTime();
      const amount = s.grandTotal || 0;
      const cogs = s.cogsTotal || 0;
      const profit = s.grossProfit !== undefined ? s.grossProfit : (amount - cogs);

      totalSales += amount;
      totalCogs += cogs;
      totalGrossProfit += profit;

      if (sTime >= startOfToday) {
        todaySales += amount;
        todayCount++;
      }
      if (sTime >= startOfWeek) {
        weekSales += amount;
      }
      if (sTime >= startOfMonth) {
        monthSales += amount;
      }
    }

    // 2. Total Purchase Cost
    let totalPurchaseCost = 0;
    for (const p of purchases) {
      totalPurchaseCost += (p.grandTotal || 0);
    }

    // 3. Operating Expenses & Net Profit
    let totalExpenses = 0;
    for (const exp of expenses) {
      totalExpenses += (exp.amount || 0);
    }
    const netProfit = totalGrossProfit - totalExpenses;

    // 4. Inventory metrics
    let totalInventoryItems = products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValuation = 0;

    for (const p of products) {
      const stock = Number(p.stock) || 0;
      const minStock = Number(p.minStockLevel) || 5;
      const purchasePrice = Number(p.purchasePrice) || 0;

      totalStockValuation += (stock * purchasePrice);

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= minStock) {
        lowStockCount++;
      }
    }

    // 5. Receivables & Payables
    let totalCustomerDebts = 0;
    for (const c of customers) {
      totalCustomerDebts += (Number(c.currentBalance) || 0);
    }

    let totalSupplierPayments = 0;
    for (const sp of suppliers) {
      totalSupplierPayments += (Number(sp.outstandingBalance) || 0);
    }

    // 6. Recent Transactions (last 10 sales)
    const recentTransactions = [...sales]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // 7. Best-selling products
    const productSalesMap = {};
    for (const s of sales) {
      if (Array.isArray(s.items)) {
        for (const it of s.items) {
          const key = it.productId || it.sku || it.name;
          if (!productSalesMap[key]) {
            productSalesMap[key] = {
              name: it.name,
              sku: it.sku,
              quantity: 0,
              revenue: 0
            };
          }
          productSalesMap[key].quantity += (Number(it.quantity) || 0);
          productSalesMap[key].revenue += (Number(it.total) || 0);
        }
      }
    }
    const bestSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 8. Sales Chart Data (Last 7 Days)
    const chartDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      
      let daySalesAmount = 0;
      let dayProfitAmount = 0;

      for (const s of sales) {
        if (s.createdAt && s.createdAt.startsWith(dateKey)) {
          daySalesAmount += (s.grandTotal || 0);
          const cogs = s.cogsTotal || 0;
          dayProfitAmount += (s.grossProfit !== undefined ? s.grossProfit : ((s.grandTotal || 0) - cogs));
        }
      }

      chartDays.push({
        date: dateKey,
        day: dayLabel,
        sales: daySalesAmount,
        profit: dayProfitAmount
      });
    }

    // 9. Payment Methods Breakdown
    const paymentMethods = {
      cash: 0,
      card: 0,
      bank_transfer: 0,
      credit: 0
    };
    for (const s of filteredSales) {
      const method = s.paymentType || 'cash';
      if (paymentMethods[method] !== undefined) {
        paymentMethods[method] += (s.grandTotal || 0);
      } else {
        paymentMethods['cash'] += (s.grandTotal || 0);
      }
    }

    res.json({
      success: true,
      stats: {
        todaySales,
        todayCount,
        weekSales,
        monthSales,
        totalSales,
        totalPurchaseCost,
        totalCogs,
        grossProfit: totalGrossProfit,
        netProfit,
        totalExpenses,
        totalInventoryItems,
        lowStockCount,
        outOfStockCount,
        totalStockValuation,
        totalCustomerDebts,
        totalSupplierPayments,
        recentTransactions,
        bestSellingProducts,
        salesChart: chartDays,
        paymentMethodsBreakdown: [
          { name: 'Cash', value: paymentMethods.cash },
          { name: 'Card', value: paymentMethods.card },
          { name: 'Bank Transfer', value: paymentMethods.bank_transfer },
          { name: 'Customer Credit', value: paymentMethods.credit }
        ]
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute dashboard metrics' });
  }
};
