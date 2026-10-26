const db = require('../config/db');

exports.getDebtsOverview = (req, res) => {
  try {
    const customers = db.find('customers');
    const suppliers = db.find('suppliers');
    const customerPayments = db.find('customerPayments');
    const supplierPayments = db.find('supplierPayments');

    // Customer Debtors (Receivables)
    const debtors = customers
      .filter(c => (Number(c.currentBalance) || 0) > 0)
      .map(c => {
        // Calculate total sales on credit
        const creditSales = db.find('sales', { customerId: c.id })
          .filter(s => s.paymentType === 'credit' || s.balanceDue > 0);
        
        // Find latest activity
        const latestSale = creditSales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          customerCode: c.customerCode,
          creditLimit: c.creditLimit || 0,
          currentBalance: c.currentBalance,
          lastActivityDate: latestSale ? latestSale.createdAt : c.updatedAt,
          creditSalesCount: creditSales.length
        };
      })
      .sort((a, b) => b.currentBalance - a.currentBalance);

    // Supplier Creditors (Payables)
    const creditors = suppliers
      .filter(s => (Number(s.outstandingBalance) || 0) > 0)
      .map(s => {
        const creditPurchases = db.find('purchases', { supplierId: s.id })
          .filter(p => p.balanceDue > 0 || p.paymentType === 'credit');

        const latestPurchase = creditPurchases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        return {
          id: s.id,
          name: s.name,
          businessName: s.businessName,
          phone: s.phone,
          supplierCode: s.supplierCode,
          outstandingBalance: s.outstandingBalance,
          lastActivityDate: latestPurchase ? latestPurchase.createdAt : s.updatedAt,
          pendingPurchasesCount: creditPurchases.length
        };
      })
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

    const totalReceivables = debtors.reduce((sum, d) => sum + (Number(d.currentBalance) || 0), 0);
    const totalPayables = creditors.reduce((sum, c) => sum + (Number(c.outstandingBalance) || 0), 0);

    // Today's Collection & Payout
    const today = new Date().toISOString().split('T')[0];
    const todayCollections = customerPayments
      .filter(p => p.createdAt && p.createdAt.startsWith(today))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const todayPayouts = supplierPayments
      .filter(p => p.createdAt && p.createdAt.startsWith(today))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Recent Collections (last 10)
    const recentCollections = [...customerPayments]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Recent Supplier Payouts (last 10)
    const recentPayouts = [...supplierPayments]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({
      success: true,
      summary: {
        totalReceivables,
        totalPayables,
        netDebtPosition: totalReceivables - totalPayables,
        debtorCount: debtors.length,
        creditorCount: creditors.length,
        todayCollections,
        todayPayouts
      },
      debtors,
      creditors,
      recentCollections,
      recentPayouts
    });
  } catch (err) {
    console.error('Debts overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve debts overview' });
  }
};
