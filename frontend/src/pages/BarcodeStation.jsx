import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode as BarcodeIcon,
  Printer,
  Sparkles,
  RefreshCw,
  Search,
  LayoutGrid,
  Tag,
  CheckCircle2
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function BarcodeStation() {
  const { settings, formatCurrency } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [barcodeText, setBarcodeText] = useState('890123450001');
  const [productName, setProductName] = useState('Elephant House Cream Soda 1.5L');
  const [skuText, setSkuText] = useState('BEV-001');
  const [priceText, setPriceText] = useState('380');
  const [format, setFormat] = useState('CODE128'); // 'CODE128' | 'EAN13'
  const [labelSize, setLabelSize] = useState('50x30'); // '50x30' | '40x25' | '30x20' | 'a4_sheet'
  const [copies, setCopies] = useState(1);
  const [showShopName, setShowShopName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  const barcodeSvgRef = useRef(null);

  // Load products
  useEffect(() => {
    apiRequest('/products').then(res => {
      if (res.success && res.products.length > 0) {
        setProducts(res.products);

        // Check if navigated from "New Price Batch"
        const saved = sessionStorage.getItem('print_barcode_item');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            sessionStorage.removeItem('print_barcode_item');
            if (parsed.product) {
              setSelectedProduct(parsed.product);
              setBarcodeText(parsed.product.barcode);
              setProductName(parsed.product.name);
              setSkuText(parsed.product.sku);
              setPriceText(parsed.product.sellingPrice);
              if (parsed.copies) {
                setCopies(parsed.copies);
              }
              return;
            }
          } catch (e) {
            console.warn('Error reading print_barcode_item', e);
          }
        }

        const p = res.products[0];
        setSelectedProduct(p);
        setBarcodeText(p.barcode);
        setProductName(p.name);
        setSkuText(p.sku);
        setPriceText(p.sellingPrice);
      }
    });
  }, []);

  // Re-render barcode whenever barcodeText or format changes
  useEffect(() => {
    if (barcodeSvgRef.current && barcodeText) {
      try {
        JsBarcode(barcodeSvgRef.current, barcodeText, {
          format: format === 'EAN13' && barcodeText.length === 13 ? 'EAN13' : 'CODE128',
          lineColor: '#000',
          width: labelSize === '30x20' ? 1.0 : 1.5,
          height: labelSize === '30x20' ? 24 : labelSize === '40x25' ? 30 : 38,
          displayValue: true,
          fontSize: 10,
          fontOptions: 'bold',
          margin: 2
        });
      } catch (err) {
        console.warn('Barcode render warning:', err);
      }
    }
  }, [barcodeText, format, labelSize]);

  // Select existing product
  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setBarcodeText(p.barcode);
    setProductName(p.name);
    setSkuText(p.sku);
    setPriceText(p.sellingPrice);
  };

  // Generate fresh unique barcode
  const handleGenerateFresh = async () => {
    try {
      const res = await apiRequest('/products/barcode/generate');
      if (res.success) {
        setBarcodeText(res.barcode);
      }
    } catch (err) {
      alert('Could not generate unique barcode');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const labelCopiesArray = Array.from({ length: Math.max(1, parseInt(copies, 10) || 1) });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Printable Labels Section (Visible only when printing) */}
      <div id="printable-labels" className="hidden print:block">
        <div
          className={`grid gap-2 p-2 ${
            labelSize === 'a4_sheet'
              ? 'grid-cols-3'
              : 'grid-cols-1'
          }`}
        >
          {labelCopiesArray.map((_, idx) => (
            <div
              key={idx}
              className={`border border-black p-2 text-center flex flex-col items-center justify-between mx-auto page-break-inside-avoid ${
                labelSize === '50x30'
                  ? 'w-[50mm] h-[30mm]'
                  : labelSize === '40x25'
                  ? 'w-[40mm] h-[25mm]'
                  : labelSize === '30x20'
                  ? 'w-[30mm] h-[20mm]'
                  : 'w-[68mm] h-[34mm]'
              }`}
            >
              {showShopName && (
                <div className="text-[9px] font-bold tracking-tight uppercase truncate max-w-full">
                  {settings.shopName || 'DevLoop Supermarket'}
                </div>
              )}
              <div className="text-[10px] font-bold line-clamp-1 leading-tight">{productName}</div>
              <svg
                ref={(el) => {
                  if (el && barcodeText) {
                    try {
                      JsBarcode(el, barcodeText, {
                        format: format === 'EAN13' && barcodeText.length === 13 ? 'EAN13' : 'CODE128',
                        width: labelSize === '30x20' ? 1.0 : 1.4,
                        height: labelSize === '30x20' ? 22 : 30,
                        displayValue: true,
                        fontSize: 9,
                        margin: 1
                      });
                    } catch (e) {}
                  }
                }}
                className="max-w-full"
              ></svg>
              <div className="w-full flex justify-between items-baseline text-[10px] font-mono px-1">
                <span>{skuText}</span>
                {showPrice && <span className="font-bold">Rs. {Number(priceText).toFixed(2)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen Interface (no-print) */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Selection & Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BarcodeIcon className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-base">Label Configuration</h3>
          </div>

          {/* Select from catalog */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pick Product from Catalog</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const p = products.find(prod => prod.id === e.target.value);
                if (p) handleSelectProduct(p);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-sky-500"
            >
              <option value="">-- Custom Barcode Entry --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.sku}] - Rs.{p.sellingPrice}
                </option>
              ))}
            </select>
          </div>

          {/* Barcode number & auto-generate */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700">Barcode Value</label>
              <button
                type="button"
                onClick={handleGenerateFresh}
                className="text-[11px] font-bold text-sky-600 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Generate Unique</span>
              </button>
            </div>
            <input
              type="text"
              value={barcodeText}
              onChange={(e) => setBarcodeText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Product Label Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Product Title</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* SKU & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Item Code</label>
              <input
                type="text"
                value={skuText}
                onChange={(e) => setSkuText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Price (Rs.)</label>
              <input
                type="number"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Label Format & Size */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Label Paper / Printer Format</label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="50x30">50mm x 30mm (Standard Thermal Roll)</option>
                <option value="40x25">40mm x 25mm (Compact Thermal Roll)</option>
                <option value="30x20">30mm x 20mm (Small Item / Jewelry)</option>
                <option value="a4_sheet">A4 Sheet Grid (24 labels per sheet)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Barcode Standard Format</label>
              <div className="grid grid-cols-2 gap-2">
                {['CODE128', 'EAN13'].map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      format === fmt
                        ? 'bg-sky-500 text-white border-sky-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Number of Label Copies</label>
              <input
                type="number"
                min="1"
                max="500"
                value={copies}
                onChange={(e) => setCopies(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={showShopName}
                  onChange={(e) => setShowShopName(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Include Shop Name on Label</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Include Selling Price on Label</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Label Preview & Direct Print (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-full flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Label Live Preview</h3>
                <p className="text-xs text-slate-400">Scale: {labelSize} layout representation</p>
              </div>

              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print {copies} {copies > 1 ? 'Labels' : 'Label'} (Ctrl+P)</span>
              </button>
            </div>

            {/* Single Label Card Preview */}
            <div className="p-8 bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-center w-full">
              <div
                className={`bg-white border-2 border-slate-800 rounded-lg p-3 shadow-lg flex flex-col items-center justify-between text-center transition-all ${
                  labelSize === '30x20'
                    ? 'w-48 h-32'
                    : labelSize === '40x25'
                    ? 'w-60 h-36'
                    : 'w-72 h-44'
                }`}
              >
                {showShopName && (
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 truncate w-full border-b border-slate-200 pb-0.5">
                    {settings.shopName || 'DevLoop Supermarket'}
                  </div>
                )}

                <div className="text-xs font-bold text-slate-900 truncate w-full mt-1">
                  {productName}
                </div>

                {/* Live SVG Barcode */}
                <div className="my-1 max-w-full">
                  <svg ref={barcodeSvgRef} className="max-w-full mx-auto"></svg>
                </div>

                <div className="w-full flex items-center justify-between text-[11px] font-mono px-1 border-t border-slate-200 pt-1">
                  <span className="text-slate-500">{skuText}</span>
                  {showPrice && (
                    <span className="font-black text-slate-900">
                      Rs. {Number(priceText).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400 text-center flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Ready for standard label printers, Xprinter, Zebra, and laser sheet printers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
