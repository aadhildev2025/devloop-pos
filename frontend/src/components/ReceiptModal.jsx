import React, { useEffect, useRef } from 'react';
import { Printer, Download, X, CheckCircle2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useAuth } from '../context/AuthContext';

export default function ReceiptModal({ isOpen, onClose, sale }) {
  const barcodeRef = useRef(null);
  const { settings, formatCurrency } = useAuth();

  useEffect(() => {
    if (isOpen && sale && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, sale.invoiceNumber, {
          format: 'CODE128',
          lineColor: '#000',
          width: 1.4,
          height: 36,
          displayValue: true,
          fontSize: 11,
          fontOptions: 'bold',
          margin: 4
        });
      } catch (e) {
        console.warn('Barcode render error:', e);
      }
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-sky-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Action Bar */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span className="font-semibold text-base">Receipt Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-sky-700 hover:bg-sky-50 rounded-lg text-xs font-bold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print (Ctrl+P)</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Area */}
        <div className="p-6 bg-slate-50 overflow-y-auto max-h-[75vh]">
          <div
            id="printable-receipt"
            className="bg-white p-6 shadow-sm border border-slate-200 rounded-xl text-slate-800 text-xs font-mono max-w-[80mm] mx-auto"
          >
            {/* Store Branding */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <img
                src={settings.logoUrl || '/logo.png'}
                alt="Logo"
                className="h-10 mx-auto mb-1.5 object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                {settings.shopName || 'DevLoop Supermarket'}
              </h2>
              {settings.tagline && (
                <p className="text-[10px] text-slate-500">{settings.tagline}</p>
              )}
              <p className="text-[10px] text-slate-600 mt-1">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date/Time:</span>
                <span>{new Date(sale.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{sale.cashierName || 'Staff'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium">{sale.customerName || 'Walk-in Customer'}</span>
              </div>
              {sale.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Price</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(sale.items || []).map((it, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1 pr-1 font-sans text-[11px] leading-tight">
                        <div>{it.name}</div>
                        {it.sku && <span className="text-[9px] text-slate-400 font-mono">[{it.sku}]</span>}
                      </td>
                      <td className="py-1 text-center font-mono font-semibold">{it.quantity}</td>
                      <td className="py-1 text-right font-mono">{Number(it.unitPrice).toFixed(2)}</td>
                      <td className="py-1 text-right font-mono font-bold">{Number(it.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.discountTotal)}</span>
                </div>
              )}
              {sale.taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({sale.taxPercent}%):</span>
                  <span>+{formatCurrency(sale.taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>GRAND TOTAL:</span>
                <span>{formatCurrency(sale.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold uppercase tracking-wider">{sale.paymentType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-semibold">{formatCurrency(sale.amountReceived)}</span>
              </div>
              {sale.changeDue > 0 && (
                <div className="flex justify-between text-blue-600 font-semibold">
                  <span>Change Given:</span>
                  <span>{formatCurrency(sale.changeDue)}</span>
                </div>
              )}
              {sale.balanceDue > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Credit / Balance Due:</span>
                  <span>{formatCurrency(sale.balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Barcode representation */}
            <div className="text-center pt-3 pb-2">
              <svg ref={barcodeRef} className="mx-auto max-w-full"></svg>
            </div>

            {/* Footer message */}
            <div className="text-center pt-2 text-[10px] text-slate-500 whitespace-pre-line leading-relaxed font-sans">
              {settings.receiptFooter || 'Goods once sold can be exchanged within 7 days with valid receipt.\nThank you! Come again!'}
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}
