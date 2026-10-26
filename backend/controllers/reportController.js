const db = require('../config/db');

exports.getSalesReport = (req, res) => {
  try {
    const { fromDate, toDate, cashierId, category } = req.query;
    let sales = db.find('sales');

    if (fromDate) {
      sales = sales.filter(s => s.createdAt >= `${fromDate}T00:00:00`);
    }
    if (toDate) {
      sales = sales.filter(s => s.createdAt <= `${toDate}T23:59:59`);
    }
    if (cashierId && cashierId !== 'all') {
      sales = sales.filter(s => s.cashierId === cashierId);
    }

    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let totalNetRevenue = 0;
    let totalCogs = 0;
    let totalGrossProfit = 0;
    let totalCashReceived = 0;
    let totalCreditSales = 0;

    // Breakdown by product
    const productStats = {};
    // Breakdown by category
    const categoryStats = {};
    // Breakdown by cashier
    const cashierStats = {};

    for (const s of sales) {
      const gTotal = s.grandTotal || 0;
      const cogs = s.cogsTotal || 0;
      const profit = s.grossProfit !== undefined ? s.grossProfit : (gTotal - cogs);

      totalGrossSales += (s.subtotal || 0);
      totalDiscounts += (s.discountTotal || 0);
      totalTax += (s.taxTotal || 0);
      totalNetRevenue += gTotal;
      totalCogs += cogs;
      totalGrossProfit += profit;

      if (s.paymentType === 'credit') {
        totalCreditSales += (s.balanceDue || gTotal);
      } else {
        totalCashReceived += (s.amountReceived - s.changeDue);
      }

      // Cashier
      const cName = s.cashierName || 'Cashier';
      if (!cashierStats[cName]) {
        cashierStats[cName] = { cashier: cName, count: 0, revenue: 0, profit: 0 };
      }
      cashierStats[cName].count++;
      cashierStats[cName].revenue += gTotal;
      cashierStats[cName].profit += profit;

      // Products & Categories
      if (Array.isArray(s.items)) {
        for (const item of s.items) {
          // Category lookup
          const prod = db.findById('products', item.productId);
          const catName = prod ? prod.category : 'General';

          if (category && category !== 'all' && catName !== category) {
            continue;
          }

          // Product stats
          const pKey = item.productId || item.name;
          if (!productStats[pKey]) {
            productStats[pKey] = {
              name: item.name,
              sku: item.sku,
              category: catName,
              quantity: 0,
              revenue: 0,
              cost: 0,
              profit: 0
            };
          }
          const itemCost = (item.unitCost || 0) * (item.quantity || 1);
          productStats[pKey].quantity += item.quantity;
          productStats[pKey].revenue += item.total;
          productStats[pKey].cost += itemCost;
          productStats[pKey].profit += (item.total - itemCost);

          // Category stats
          if (!categoryStats[catName]) {
            categoryStats[catName] = { category: catName, quantity: 0, revenue: 0, profit: 0 };
          }
          categoryStats[catName].quantity += item.quantity;
          categoryStats[catName].revenue += item.total;
          categoryStats[catName].profit += (item.total - itemCost);
        }
      }
    }

    const marginPercent = totalNetRevenue > 0 ? ((totalGrossProfit / totalNetRevenue) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      summary: {
        transactionCount: sales.length,
        totalGrossSales,
        totalDiscounts,
        totalTax,
        totalNetRevenue,
        totalCogs,
        totalGrossProfit,
        marginPercent,
        totalCashReceived,
        totalCreditSales
      },
      productBreakdown: Object.values(productStats).sort((a, b) => b.revenue - a.revenue),
      categoryBreakdown: Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue),
      cashierBreakdown: Object.values(cashierStats).sort((a, b) => b.revenue - a.revenue),
      salesList: sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (err) {
    console.error('Sales report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate sales report' });
  }
};

exports.getProfitAndLossReport = (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    let sales = db.find('sales');
    let expenses = db.find('expenses');

    if (fromDate) {
      sales = sales.filter(s => s.createdAt >= `${fromDate}T00:00:00`);
      expenses = expenses.filter(e => e.expenseDate >= fromDate);
    }
    if (toDate) {
      sales = sales.filter(s => s.createdAt <= `${toDate}T23:59:59`);
      expenses = expenses.filter(e => e.expenseDate <= toDate);
    }

    let grossSales = 0;
    let totalDiscounts = 0;
    let totalReturns = 0;
    let cogs = 0;
    let actualCashCollected = 0;
    let unpaidCreditSales = 0;

    for (const s of sales) {
      grossSales += (s.subtotal || 0);
      totalDiscounts += (s.discountTotal || 0);
      cogs += (s.cogsTotal || 0);

      if (Array.isArray(s.refunds)) {
        for (const ref of s.refunds) {
          totalReturns += (ref.amount || 0);
        }
      }

      if (s.balanceDue > 0) {
        unpaidCreditSales += s.balanceDue;
        actualCashCollected += Math.max(0, (s.amountReceived || 0) - (s.changeDue || 0));
      } else {
        actualCashCollected += (s.grandTotal || 0);
      }
    }

    const netSales = Math.max(0, grossSales - totalDiscounts - totalReturns);
    const grossProfit = netSales - cogs;
    const grossMarginPercent = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(2) : 0;

    // Expenses breakdown
    const expensesByCategory = {};
    let totalExpenses = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + amt;
    }

    const netProfit = grossProfit - totalExpenses;
    const netMarginPercent = netSales > 0 ? ((netProfit / netSales) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      period: { fromDate, toDate },
      pnl: {
        revenue: {
          grossSales,
          discounts: totalDiscounts,
          returnsAndRefunds: totalReturns,
          netSales,
          unpaidCreditSales,
          actualCashCollected
        },
        costOfGoodsSold: cogs,
        grossProfit,
        grossMarginPercent,
        operatingExpenses: {
          total: totalExpenses,
          breakdown: Object.keys(expensesByCategory).map(cat => ({
            category: cat,
            amount: expensesByCategory[cat]
          }))
        },
        netProfit,
        netMarginPercent
      }
    });
  } catch (err) {
    console.error('P&L report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate Profit & Loss statement' });
  }
};

exports.getInventoryValuation = (req, res) => {
  try {
    const products = db.find('products');

    let totalUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;

    const items = products.map(p => {
      const stock = Number(p.stock) || 0;
      const cost = Number(p.purchasePrice) || 0;
      const retail = Number(p.sellingPrice) || 0;
      const costTotal = stock * cost;
      const retailTotal = stock * retail;
      const profitMargin = retailTotal - costTotal;

      totalUnits += stock;
      totalCostValue += costTotal;
      totalRetailValue += retailTotal;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        brand: p.brand,
        stock,
        purchasePrice: cost,
        sellingPrice: retail,
        totalCostValue: costTotal,
        totalRetailValue: retailTotal,
        potentialProfit: profitMargin
      };
    });

    res.json({
      success: true,
      summary: {
        productCount: products.length,
        totalStockUnits: totalUnits,
        totalCostValue,
        totalRetailValue,
        totalPotentialProfit: totalRetailValue - totalCostValue
      },
      items: items.sort((a, b) => b.totalCostValue - a.totalCostValue)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate inventory valuation' });
  }
};
