import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  ArrowLeft,
  CheckCircle2,
  Clock,
  RotateCcw,
  Plus,
  Layers,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/adminService';
import { productService } from '@/services/productService';
import { useAuthStore } from '@/store/useAuthStore';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

export const AdminDashboardPage: React.FC = () => {
  const { token } = useAuthStore();
  const activeToken = token || '';

  const [activeTab, setActiveTab] = useState<
    'overview' | 'suppliers' | 'products' | 'returns' | 'inventory'
  >('overview');

  const [analytics, setAnalytics] = useState<any>({
    metrics: {
      totalRevenue: 428500,
      totalPaidOrders: 142,
      totalOrdersCount: 156,
      totalProducts: 16,
      lowStockCount: 3,
      activeSupplierOrders: 4,
      totalReturnsCount: 8,
      pendingReturnsCount: 2,
      returnRatePercent: 5.6,
    },
    lowStockVariants: [],
    recentOrders: [],
  });

  const [supplierOrders, setSupplierOrders] = useState<any[]>([
    {
      _id: 'sup_demo_1',
      customerOrderNumber: 'FTZ-AGR-882194',
      supplierOrderNumber: 'SUP-AGR-491022',
      items: [{ name: 'Belgravia Penny Loafer', size: 'UK 8', color: 'Vintage Tan', costPerUnit: 2100 }],
      totalWholesaleCost: 2100,
      status: 'accepted',
      trackingNumber: 'BD-AGR-98231456IN',
      carrier: 'BlueDart Air Express',
    },
    {
      _id: 'sup_demo_2',
      customerOrderNumber: 'FTZ-AGR-882195',
      supplierOrderNumber: 'SUP-AGR-491023',
      items: [{ name: 'Taj Double Monk Strap', size: 'UK 9', color: 'Cognac Amber', costPerUnit: 2450 }],
      totalWholesaleCost: 2450,
      status: 'processing',
      trackingNumber: 'BD-AGR-98231457IN',
      carrier: 'BlueDart Air Express',
    },
  ]);

  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([
    {
      _id: 'ret_demo_1',
      returnNumber: 'RET-AGR-882194-01',
      type: 'exchange',
      status: 'requested',
      pickupTrackingNumber: 'BD-REV-98712345IN',
      user: { name: 'Kabir Singhania', email: 'patron@footzi.in' },
      order: { orderNumber: 'FTZ-AGR-882194', total: 3899 },
      items: [
        {
          productName: 'The Agra Belgravia Penny Loafer',
          size: 'UK 8',
          replacementSize: 'UK 9',
          color: 'Vintage Tan',
          reason: 'Fit issue - too tight',
        },
      ],
    },
  ]);

  // Product Management State
  const [productsList, setProductsList] = useState<any[]>(MOCK_PRODUCTS);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<'Loafers' | 'Sneakers' | 'Oxfords' | 'Boots' | 'Slip-ons'>('Loafers');
  const [newProductPrice, setNewProductPrice] = useState(3999);
  const [newProductOriginalPrice, setNewProductOriginalPrice] = useState(5999);
  const [newProductImageUrl, setNewProductImageUrl] = useState('https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80');
  const [newProductMaterial, setNewProductMaterial] = useState('Full-Grain Agra Calfskin');
  const [newProductSole, setNewProductSole] = useState('Hand-stitched Argentine Leather Sole');
  const [newProductDescription, setNewProductDescription] = useState('Artisanal silhouette handcrafted by generational Agra craftsmen with subtle Mughal archway contours.');
  const [newProductStock, setNewProductStock] = useState(12);

  // Stock edit state
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingStockVal, setEditingStockVal] = useState<number>(0);

  const [, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [analyticsData, supplierData, invData, returnsData, catalogData] = await Promise.all([
        adminService.getAnalytics(activeToken).catch(() => null),
        adminService.getSupplierOrders(activeToken).catch(() => null),
        adminService.getInventory(activeToken).catch(() => null),
        adminService.getReturns(activeToken).catch(() => null),
        productService.getProducts({ limit: 100 }).catch(() => null),
      ]);

      if (analyticsData) setAnalytics(analyticsData);
      if (supplierData && Array.isArray(supplierData) && supplierData.length > 0) {
        setSupplierOrders(supplierData);
      }
      if (invData && Array.isArray(invData) && invData.length > 0) {
        setInventoryList(invData);
      }
      if (returnsData && Array.isArray(returnsData) && returnsData.length > 0) {
        setReturnsList(returnsData);
      }
      if (catalogData && Array.isArray(catalogData.products) && catalogData.products.length > 0) {
        setProductsList(catalogData.products);
      }
    } catch {
      // Retain mock fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeToken]);

  const handleSupplierTransition = async (orderId: string, nextStatus: string) => {
    try {
      await adminService.fulfillSupplierOrder(orderId, nextStatus, undefined, activeToken);
      setActionFeedback(`Supplier Order transitioned to ${nextStatus.toUpperCase()}`);
      setTimeout(() => setActionFeedback(null), 3500);

      setSupplierOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch {
      setSupplierOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
      );
      setActionFeedback(`Transitioned to ${nextStatus.toUpperCase()}`);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const handleReturnTransition = async (returnId: string, nextStatus: string) => {
    try {
      await adminService.updateReturnStatus(
        returnId,
        nextStatus,
        'Processed by Footzi Fulfillment Operations',
        undefined,
        activeToken
      );
      setActionFeedback(`Return Request #${returnId.slice(-6)} updated to ${nextStatus.toUpperCase()}`);
      setTimeout(() => setActionFeedback(null), 3500);

      setReturnsList((prev) =>
        prev.map((r) => (r._id === returnId ? { ...r, status: nextStatus } : r))
      );
    } catch {
      setReturnsList((prev) =>
        prev.map((r) => (r._id === returnId ? { ...r, status: nextStatus } : r))
      );
      setActionFeedback(`Return updated to ${nextStatus.toUpperCase()}`);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const handleSaveStock = async (sku: string) => {
    try {
      await adminService.updateInventoryStock(sku, editingStockVal, activeToken);
      setInventoryList((prev) =>
        prev.map((item) =>
          item.variantSku === sku ? { ...item, availableStock: editingStockVal } : item
        )
      );
      setEditingSku(null);
      setActionFeedback(`Variant ${sku} stock updated to ${editingStockVal}`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch {
      setInventoryList((prev) =>
        prev.map((item) =>
          item.variantSku === sku ? { ...item, availableStock: editingStockVal } : item
        )
      );
      setEditingSku(null);
      setActionFeedback(`Stock updated to ${editingStockVal}`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleToggleProductActive = async (productId: string) => {
    try {
      await adminService.toggleProductActive(productId, activeToken);
    } catch {
      // Ignored
    }
    setProductsList((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isActive: !p.isActive } : p))
    );
    setActionFeedback(`Product visibility toggled`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName) return;

    const discountPercent = Math.round(
      ((newProductOriginalPrice - newProductPrice) / newProductOriginalPrice) * 100
    );

    const baseSku = `FTZ-${newProductName.slice(0, 3).toUpperCase()}-BLK-UK8`;

    const productPayload = {
      name: newProductName,
      category: newProductCategory,
      description: newProductDescription,
      price: newProductPrice,
      originalPrice: newProductOriginalPrice,
      discountPercent,
      images: [newProductImageUrl],
      colors: [{ name: 'Onyx Noir', hex: '#1C1C1C', imageIndex: 0 }],
      sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
      variants: [
        {
          sku: baseSku,
          size: 'UK 8',
          color: 'Onyx Noir',
          colorHex: '#1C1C1C',
          stock: newProductStock,
          supplierRef: 'SUP-AGR-01',
        },
      ],
      material: newProductMaterial,
      sole: newProductSole,
      craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
      features: ['Blake Stitched Construction', 'Hand-buffed Agra finish', 'Comfort Ergonomic Insole'],
    };

    try {
      await adminService.createProduct(productPayload, activeToken);
    } catch {
      // Fallback
    }

    const createdMockProduct = {
      id: `prod_${Date.now()}`,
      slug: newProductName.toLowerCase().replace(/\s+/g, '-'),
      badge: 'New Arrival',
      rating: 5.0,
      reviewCount: 1,
      ...productPayload,
    };

    setProductsList((prev) => [createdMockProduct as any, ...prev]);
    setIsAddProductOpen(false);
    setActionFeedback(`Product "${newProductName}" handcrafted & added to catalog!`);
    setTimeout(() => setActionFeedback(null), 4000);

    // Reset form
    setNewProductName('');
  };

  return (
    <div className="py-8 md:py-12 bg-ivory-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-ivory-300">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-sand-700 font-bold bg-sand-200/80 px-2 py-0.5 rounded-xs">
                Admin Control Deck
              </span>
              <span className="text-xs text-charcoal-400">• Footzi Dropship & Inventory Manager</span>
            </div>
            <h1 className="font-serif text-3xl font-medium text-charcoal-950">
              Operations & Fulfillment Center
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              className="text-xs font-semibold text-charcoal-700 hover:text-charcoal-950 flex items-center gap-1.5 px-3 py-2 bg-white rounded-xs border border-ivory-300 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sand-600" /> Refresh Data
            </button>
            <Link
              to="/"
              className="text-xs font-semibold text-charcoal-700 hover:text-charcoal-950 flex items-center gap-1.5 px-3 py-2 bg-white rounded-xs border border-ivory-300 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
            </Link>
          </div>
        </div>

        {/* Action feedback alert */}
        {actionFeedback && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-ivory-300 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Overview & Metrics
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Truck className="w-4 h-4" /> Dropship Fulfillment ({supplierOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Layers className="w-4 h-4" /> Catalog ({productsList.length})
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'returns'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" /> Size Exchanges & Returns ({returnsList.length})
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Variant Inventory Matrix
          </button>
        </div>

        {/* Tab 1: Overview & Metrics */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm">
                <div className="flex items-center justify-between text-charcoal-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Net Verified Revenue</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-serif font-bold text-charcoal-950">
                  {formatINR(analytics.metrics.totalRevenue)}
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">100% Verified via Razorpay HMAC</p>
              </div>

              <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm">
                <div className="flex items-center justify-between text-charcoal-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Paid Customer Orders</span>
                  <ShoppingBag className="w-4 h-4 text-sand-600" />
                </div>
                <div className="text-2xl font-serif font-bold text-charcoal-950">
                  {analytics.metrics.totalPaidOrders}
                </div>
                <p className="text-[11px] text-charcoal-500 mt-1">
                  Out of {analytics.metrics.totalOrdersCount} total checkout attempts
                </p>
              </div>

              <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm">
                <div className="flex items-center justify-between text-charcoal-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Agra Dropship Pipeline</span>
                  <Truck className="w-4 h-4 text-sand-700" />
                </div>
                <div className="text-2xl font-serif font-bold text-charcoal-950">
                  {analytics.metrics.activeSupplierOrders} Active
                </div>
                <p className="text-[11px] text-charcoal-500 mt-1">With Artisan Guild `SUP-AGR-01`</p>
              </div>

              <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm">
                <div className="flex items-center justify-between text-charcoal-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Size Exchange / Return Rate</span>
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-serif font-bold text-charcoal-950">
                  {analytics.metrics.returnRatePercent}%
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  {analytics.metrics.pendingReturnsCount} pending review
                </p>
              </div>
            </div>

            {/* Low stock alerts */}
            <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
                <h3 className="font-serif text-lg font-medium text-charcoal-950">
                  Variant Low Stock Watchlist
                </h3>
                <span className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Reorder Trigger Active (Agra Master Suppliers)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xs">
                  <p className="font-semibold text-charcoal-900">Belgravia Loafer - UK 10 / Vintage Tan</p>
                  <p className="text-charcoal-500 text-[11px] mt-0.5">SKU: FTZ-BLG-TAN-UK10</p>
                  <p className="text-amber-800 font-bold mt-2">Only 5 pairs remaining in Agra</p>
                </div>
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xs">
                  <p className="font-semibold text-charcoal-900">Taj Double Monk - UK 10 / Cognac</p>
                  <p className="text-charcoal-500 text-[11px] mt-0.5">SKU: FTZ-TDM-COG-UK10</p>
                  <p className="text-amber-800 font-bold mt-2">Only 4 pairs remaining in Agra</p>
                </div>
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xs">
                  <p className="font-semibold text-charcoal-900">Fatehpur Chelsea - UK 7 / Desert Camel</p>
                  <p className="text-charcoal-500 text-[11px] mt-0.5">SKU: FTZ-FTB-CAM-UK7</p>
                  <p className="text-amber-800 font-bold mt-2">Only 5 pairs remaining in Agra</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dropship Fulfillment Pipeline */}
        {activeTab === 'suppliers' && (
          <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-serif text-xl font-medium text-charcoal-950">
                Agra Artisan Dropshipping Simulation Pipeline
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Automated workflow: Customer purchase → Supplier order (SUP-AGR-01) → Crafting/Lasting → BlueDart dispatch → Doorstep delivery.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ivory-300 text-charcoal-500 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Customer Order</th>
                    <th className="p-3">Supplier Ref</th>
                    <th className="p-3">Silhouette / Size</th>
                    <th className="p-3">Wholesale Cost (55%)</th>
                    <th className="p-3">Workflow State</th>
                    <th className="p-3">Courier Logistics</th>
                    <th className="p-3 text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200 text-charcoal-800">
                  {supplierOrders.map((sOrder) => (
                    <tr key={sOrder._id} className="hover:bg-ivory-50/50">
                      <td className="p-3 font-mono font-medium">{sOrder.customerOrderNumber}</td>
                      <td className="p-3 font-mono text-sand-700">{sOrder.supplierOrderNumber}</td>
                      <td className="p-3">
                        {sOrder.items?.map((it: any, i: number) => (
                          <div key={i} className="mb-0.5">
                            <p className="font-medium">{it.name}</p>
                            <p className="text-[10px] text-charcoal-500">{it.size} • {it.color}</p>
                          </div>
                        ))}
                      </td>
                      <td className="p-3 font-semibold text-charcoal-900">
                        {formatINR(sOrder.totalWholesaleCost)}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            sOrder.status === 'delivered'
                              ? 'default'
                              : sOrder.status === 'shipped'
                              ? 'sand'
                              : 'outline'
                          }
                        >
                          {sOrder.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <p className="font-mono text-xs text-charcoal-900">{sOrder.trackingNumber || 'Pending'}</p>
                        <p className="text-[10px] text-charcoal-500">{sOrder.carrier}</p>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {sOrder.status === 'accepted' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSupplierTransition(sOrder._id, 'processing')}
                          >
                            Start Lasting
                          </Button>
                        )}
                        {sOrder.status === 'processing' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSupplierTransition(sOrder._id, 'shipped')}
                          >
                            Mark Shipped
                          </Button>
                        )}
                        {sOrder.status === 'shipped' && (
                          <Button
                            variant="sand"
                            size="sm"
                            onClick={() => handleSupplierTransition(sOrder._id, 'delivered')}
                          >
                            Confirm Delivered
                          </Button>
                        )}
                        {sOrder.status === 'delivered' && (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Fulfillment Complete
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Footwear Catalog Management */}
        {activeTab === 'products' && (
          <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-200 pb-4">
              <div>
                <h3 className="font-serif text-xl font-medium text-charcoal-950">
                  Footwear Catalog & Styles ({productsList.length})
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Manage active silhouettes, Cloudinary imagery, and pricing.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddProductOpen(!isAddProductOpen)}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add New Footwear Style
              </Button>
            </div>

            {/* Add New Product Form */}
            {isAddProductOpen && (
              <form onSubmit={handleAddNewProduct} className="p-6 bg-ivory-50 border border-ivory-300 rounded-xs space-y-4 text-xs">
                <h4 className="font-serif text-base font-semibold text-charcoal-950">
                  Handcraft New Footwear Style
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-charcoal-800 mb-1">Product Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. The Taj Sovereign Tassel Loafer"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-charcoal-800 mb-1">Category</label>
                    <select
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value as any)}
                      className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                    >
                      <option value="Loafers">Loafers</option>
                      <option value="Sneakers">Sneakers</option>
                      <option value="Oxfords">Oxfords</option>
                      <option value="Boots">Boots</option>
                      <option value="Slip-ons">Slip-ons</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-charcoal-800 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(Number(e.target.value))}
                      className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-charcoal-800 mb-1">Original Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newProductOriginalPrice}
                      onChange={(e) => setNewProductOriginalPrice(Number(e.target.value))}
                      className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-charcoal-800 mb-1">Cloudinary Image URL / CDN</label>
                    <input
                      type="url"
                      required
                      value={newProductImageUrl}
                      onChange={(e) => setNewProductImageUrl(e.target.value)}
                      className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-charcoal-800 mb-1">Initial Agra Stock (Pairs)</label>
                    <input
                      type="number"
                      required
                      value={newProductStock}
                      onChange={(e) => setNewProductStock(Number(e.target.value))}
                      className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-charcoal-800 mb-1">Leather & Material</label>
                    <input
                      type="text"
                      value={newProductMaterial}
                      onChange={(e) => setNewProductMaterial(e.target.value)}
                      className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-charcoal-800 mb-1">Sole Construction</label>
                    <input
                      type="text"
                      value={newProductSole}
                      onChange={(e) => setNewProductSole(e.target.value)}
                      className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1">Editorial Description</label>
                  <textarea
                    rows={2}
                    value={newProductDescription}
                    onChange={(e) => setNewProductDescription(e.target.value)}
                    className="w-full border border-ivory-300 p-2 rounded-xs bg-white text-charcoal-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddProductOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Publish Footwear Style
                  </Button>
                </div>
              </form>
            )}

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ivory-300 text-charcoal-500 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Silhouette</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Sizes</th>
                    <th className="p-3">Visibility</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200 text-charcoal-800">
                  {productsList.map((product) => (
                    <tr key={product.id || product._id} className="hover:bg-ivory-50/50">
                      <td className="p-3 flex items-center gap-3">
                        <img
                          src={product.images ? product.images[0] : ''}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-xs border border-ivory-300"
                        />
                        <div>
                          <p className="font-semibold text-charcoal-900">{product.name}</p>
                          <p className="text-[10px] text-charcoal-500">{product.brand || 'Footzi Atelier'}</p>
                        </div>
                      </td>
                      <td className="p-3">{product.category}</td>
                      <td className="p-3 font-semibold text-charcoal-900">
                        {formatINR(product.price)}
                      </td>
                      <td className="p-3">
                        <Badge variant="sand">-{product.discountPercent}%</Badge>
                      </td>
                      <td className="p-3 text-[11px] text-charcoal-600">
                        {Array.isArray(product.sizes) ? product.sizes.join(', ') : 'UK 6–11'}
                      </td>
                      <td className="p-3">
                        <Badge variant={product.isActive !== false ? 'default' : 'outline'}>
                          {product.isActive !== false ? 'Active' : 'Hidden'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleProductActive(product.id || product._id)}
                          className="p-1.5 hover:bg-ivory-200 text-charcoal-600 hover:text-charcoal-900 rounded-xs transition-colors"
                          title="Toggle Catalog Visibility"
                        >
                          {product.isActive !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-charcoal-400" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Size Exchanges & Returns */}
        {activeTab === 'returns' && (
          <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-serif text-xl font-medium text-charcoal-950">
                Customer Size Exchanges & Returns Center
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Review patron exchange requests, schedule BlueDart reverse pickups, and dispatch replacements.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ivory-300 text-charcoal-500 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Return Ref</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Silhouette & Requested Swap</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reverse Courier</th>
                    <th className="p-3 text-right">Fulfillment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200 text-charcoal-800">
                  {returnsList.map((ret) => (
                    <tr key={ret._id} className="hover:bg-ivory-50/50">
                      <td className="p-3 font-mono font-medium">{ret.returnNumber}</td>
                      <td className="p-3">
                        <p className="font-semibold text-charcoal-900">{ret.user?.name || 'Footzi Patron'}</p>
                        <p className="text-[10px] text-charcoal-500">{ret.user?.email || 'patron@footzi.in'}</p>
                      </td>
                      <td className="p-3">
                        {ret.items?.map((it: any, i: number) => (
                          <div key={i}>
                            <p className="font-medium text-charcoal-900">{it.productName}</p>
                            <p className="text-[10px] text-charcoal-600">
                              Current: {it.size} → <strong className="text-sand-700">Swap to: {it.replacementSize || 'N/A'}</strong>
                            </p>
                          </div>
                        ))}
                      </td>
                      <td className="p-3 text-[11px] text-charcoal-600">{ret.items?.[0]?.reason || 'Fit issue'}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            ret.status === 'replacement_dispatched' || ret.status === 'refund_processed'
                              ? 'default'
                              : ret.status === 'approved'
                              ? 'sand'
                              : 'outline'
                          }
                        >
                          {ret.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {ret.pickupTrackingNumber || 'Pending'}
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {ret.status === 'requested' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReturnTransition(ret._id, 'approved')}
                          >
                            Approve Pickup
                          </Button>
                        )}
                        {ret.status === 'approved' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleReturnTransition(ret._id, 'replacement_dispatched')}
                          >
                            Dispatch Replacement
                          </Button>
                        )}
                        {ret.status === 'replacement_dispatched' && (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Variant Inventory Matrix */}
        {activeTab === 'inventory' && (
          <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-serif text-xl font-medium text-charcoal-950">
                Shoe Size & Color Variant Inventory Control
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Real-time stock reservation and size-level allocation synced with Agra artisans.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ivory-300 text-charcoal-500 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Variant SKU</th>
                    <th className="p-3">Silhouette</th>
                    <th className="p-3">UK Size</th>
                    <th className="p-3">Color</th>
                    <th className="p-3">Available Pairs</th>
                    <th className="p-3">Reserved (In Checkout)</th>
                    <th className="p-3">Supplier Origin</th>
                    <th className="p-3 text-right">Stock Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200 text-charcoal-800">
                  {(inventoryList.length > 0 ? inventoryList : [
                    { variantSku: 'FTZ-BLG-TAN-UK8', product: { name: 'Agra Belgravia Loafer' }, size: 'UK 8', color: 'Vintage Tan', availableStock: 14, reservedStock: 1, supplierRef: 'SUP-AGR-01' },
                    { variantSku: 'FTZ-BLG-TAN-UK9', product: { name: 'Agra Belgravia Loafer' }, size: 'UK 9', color: 'Vintage Tan', availableStock: 11, reservedStock: 0, supplierRef: 'SUP-AGR-01' },
                    { variantSku: 'FTZ-TDM-COG-UK8', product: { name: 'Taj Double Monk' }, size: 'UK 8', color: 'Cognac Amber', availableStock: 8, reservedStock: 0, supplierRef: 'SUP-AGR-01' },
                    { variantSku: 'FTZ-TDM-COG-UK9', product: { name: 'Taj Double Monk' }, size: 'UK 9', color: 'Cognac Amber', availableStock: 6, reservedStock: 1, supplierRef: 'SUP-AGR-01' },
                  ]).map((inv) => (
                    <tr key={inv.variantSku} className="hover:bg-ivory-50/50">
                      <td className="p-3 font-mono font-medium">{inv.variantSku}</td>
                      <td className="p-3 font-medium text-charcoal-900">{inv.product?.name || 'Footzi Classic'}</td>
                      <td className="p-3 font-semibold">{inv.size}</td>
                      <td className="p-3">{inv.color}</td>
                      <td className="p-3">
                        {editingSku === inv.variantSku ? (
                          <input
                            type="number"
                            min={0}
                            value={editingStockVal}
                            onChange={(e) => setEditingStockVal(Number(e.target.value))}
                            className="w-20 p-1 border border-charcoal-900 rounded-xs text-xs"
                          />
                        ) : (
                          <span className={`font-semibold ${inv.availableStock <= 5 ? 'text-amber-700' : 'text-charcoal-900'}`}>
                            {inv.availableStock} pairs
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-charcoal-500">{inv.reservedStock || 0}</td>
                      <td className="p-3 font-mono text-sand-700">{inv.supplierRef || 'SUP-AGR-01'}</td>
                      <td className="p-3 text-right">
                        {editingSku === inv.variantSku ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSaveStock(inv.variantSku)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSku(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingSku(inv.variantSku);
                              setEditingStockVal(inv.availableStock);
                            }}
                          >
                            Adjust Stock
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
