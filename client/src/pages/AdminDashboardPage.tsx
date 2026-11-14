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
  ShieldAlert,
  Tag,
  Pencil,
  Receipt,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/adminService';
import { normalizeProduct } from '@/services/productService';
import { useAuthStore } from '@/store/useAuthStore';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { OrdersPanel } from '@/components/admin/OrdersPanel';
import { CouponsPanel } from '@/components/admin/CouponsPanel';
import { SalesPanel } from '@/components/admin/SalesPanel';
import { CustomersPanel } from '@/components/admin/CustomersPanel';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { ProductEditor } from '@/components/admin/ProductEditor';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

// The next admin actions for a return, following the order the server enforces
const returnActions = (ret: any) => {
  const actions: { status: string; label: string; variant: 'primary' | 'secondary' | 'outline' }[] = [];
  if (ret.status === 'requested') actions.push({ status: 'approved', label: 'Approve', variant: 'secondary' });
  if (ret.status === 'approved') actions.push({ status: 'pickup_scheduled', label: 'Schedule Pickup', variant: 'secondary' });
  if (ret.status === 'pickup_scheduled') actions.push({ status: 'inspected', label: 'Mark Inspected', variant: 'secondary' });
  if (ret.status === 'inspected') {
    actions.push(
      ret.type === 'exchange'
        ? { status: 'replacement_dispatched', label: 'Dispatch Replacement', variant: 'primary' }
        : { status: 'refund_processed', label: 'Process Refund', variant: 'primary' }
    );
  }
  if (['requested', 'approved', 'pickup_scheduled', 'inspected'].includes(ret.status)) {
    actions.push({ status: 'rejected', label: 'Reject', variant: 'outline' });
  }
  return actions;
};

export const AdminDashboardPage: React.FC = () => {
  useDocumentMeta({ title: 'Admin — Footzi', noindex: true });
  const { token, user } = useAuthStore();
  const isReadOnly = user?.role === 'demo_admin';
  const activeToken = token || '';

  const [activeTab, setActiveTab] = useState<
    'overview' | 'sales' | 'orders' | 'customers' | 'suppliers' | 'products' | 'coupons' | 'returns' | 'inventory' | 'settings'
  >('overview');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<any>({
    metrics: {
      totalRevenue: 0,
      totalPaidOrders: 0,
      totalOrdersCount: 0,
      totalProducts: 0,
      lowStockCount: 0,
      activeSupplierOrders: 0,
      totalReturnsCount: 0,
      pendingReturnsCount: 0,
      returnRatePercent: 0,
    },
    lowStockVariants: [],
    recentOrders: [],
  });

  const [supplierOrders, setSupplierOrders] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);

  // Product Management State
  const [productsList, setProductsList] = useState<any[]>(MOCK_PRODUCTS);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

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
        adminService.getAllProducts(activeToken).catch(() => null),
      ]);

      if (analyticsData) {
        setAnalytics(analyticsData);
        setIsOfflineFallback(false);
      } else {
        setIsOfflineFallback(true);
      }
      if (supplierData && Array.isArray(supplierData)) {
        setSupplierOrders(supplierData);
      }
      if (invData && Array.isArray(invData)) {
        setInventoryList(invData);
      }
      if (returnsData && Array.isArray(returnsData)) {
        setReturnsList(returnsData);
      }
      if (catalogData && Array.isArray(catalogData.products)) {
        setProductsList(catalogData.products.map(normalizeProduct));
      }
    } catch {
      setIsOfflineFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeToken]);

  // Report the server's answer as it is: an action that was refused must not look like it worked
  const flash = (message: string, ms = 3500) => {
    setActionFeedback(message);
    setTimeout(() => setActionFeedback(null), ms);
  };

  const handleSupplierTransition = async (orderId: string, nextStatus: string) => {
    try {
      await adminService.fulfillSupplierOrder(orderId, nextStatus, undefined, activeToken);
      setConfirmCancelId(null);
      setSupplierOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
      );
      flash(
        nextStatus === 'cancelled'
          ? 'Supplier order cancelled. The customer was refunded and the stock returned.'
          : `Supplier Order transitioned to ${nextStatus.toUpperCase()}`,
        4500
      );
      if (nextStatus === 'cancelled') void fetchAdminData();
    } catch (err: any) {
      flash(err.message || 'Could not update the supplier order');
    }
  };

  const handleReturnTransition = async (returnId: string, nextStatus: string) => {
    try {
      const res = await adminService.updateReturnStatus(
        returnId,
        nextStatus,
        'Processed by Footzi Fulfillment Operations',
        undefined,
        activeToken
      );
      setReturnsList((prev) =>
        prev.map((r) => (r._id === returnId ? { ...r, ...res.returnRequest, user: r.user, order: r.order } : r))
      );
      flash(`Return Request #${returnId.slice(-6)} updated to ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      flash(err.message || 'Could not update the return request');
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
      flash(`Variant ${sku} stock updated to ${editingStockVal}`, 3000);
    } catch (err: any) {
      setEditingSku(null);
      flash(err.message || 'Could not update stock', 3000);
    }
  };

  const handleToggleProductActive = async (productId: string) => {
    try {
      await adminService.toggleProductActive(productId, activeToken);
      setProductsList((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isActive: !p.isActive } : p))
      );
      flash('Product visibility toggled', 3000);
    } catch (err: any) {
      flash(err.message || 'Could not change product visibility', 3000);
    }
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
        {isReadOnly && (
          <div className="mb-6 p-3 bg-sand-100 border border-sand-300 text-xs text-charcoal-800 rounded-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-sand-700 mt-0.5" />
            <span>
              <strong>Read-only demo.</strong> You can browse every screen, but changes are disabled and customer
              contact details are masked.
            </span>
          </div>
        )}

        {actionFeedback && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {isOfflineFallback && (
          <div className="mb-6 p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xs flex items-center justify-between gap-2">
            <span>
              The dashboard figures could not be loaded. Check your connection and refresh.
            </span>
            <Button variant="outline" size="sm" onClick={fetchAdminData}>
              Retry
            </Button>
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
            onClick={() => setActiveTab('sales')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sales'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Sales
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Receipt className="w-4 h-4" /> Orders
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'customers'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Users className="w-4 h-4" /> Customers
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
            onClick={() => setActiveTab('coupons')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'coupons'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Tag className="w-4 h-4" /> Coupons
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

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>

        {/* Tab 1: Overview & Metrics */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm">
                <div className="flex items-center justify-between text-charcoal-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold">Revenue Kept</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-serif font-bold text-charcoal-950">
                  {formatINR(analytics.metrics.totalRevenue)}
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">After refunds{analytics.metrics.refundedFromPaid > 0 ? ` (${formatINR(analytics.metrics.refundedFromPaid)} refunded)` : ''}</p>
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

            {/* Low stock alerts (live from MongoDB Inventory) */}
            <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ivory-200 pb-3">
                <h3 className="font-serif text-lg font-medium text-charcoal-950">
                  Variant Low Stock Watchlist ({analytics.metrics.lowStockCount || analytics.lowStockVariants?.length || 0})
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Threshold: ≤ 5 pairs in Agra
                  </span>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="text-[11px] uppercase tracking-wider font-semibold text-sand-700 hover:text-charcoal-950 underline"
                  >
                    Manage Stock
                  </button>
                </div>
              </div>

              {!analytics.lowStockVariants || analytics.lowStockVariants.length === 0 ? (
                <div className="p-6 text-center bg-ivory-50 rounded-xs border border-ivory-200 text-xs text-charcoal-500">
                  All footwear size variants currently exceed the low-stock reorder threshold.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {analytics.lowStockVariants.slice(0, 6).map((variant: any) => (
                    <div
                      key={variant._id || variant.variantSku}
                      className="p-4 bg-amber-50/70 border border-amber-200 rounded-xs flex flex-col justify-between"
                    >
                      <div>
                        <p className="font-semibold text-charcoal-900">
                          {variant.product?.name || 'Footwear Silhouette'} — {variant.size} / {variant.color}
                        </p>
                        <p className="text-charcoal-500 text-[11px] mt-0.5 font-mono">
                          SKU: {variant.variantSku}
                        </p>
                      </div>
                      <p className="text-amber-800 font-bold mt-2">
                        Only {variant.availableStock} {variant.availableStock === 1 ? 'pair' : 'pairs'} remaining in Agra
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Customer Orders (live from MongoDB Orders) */}
            <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
                <h3 className="font-serif text-lg font-medium text-charcoal-950">
                  Recent Customer Orders ({analytics.recentOrders?.length || 0})
                </h3>
                <button
                  onClick={() => setActiveTab('suppliers')}
                  className="text-[11px] uppercase tracking-wider font-semibold text-sand-700 hover:text-charcoal-950 underline"
                >
                  Open Fulfillment Queue
                </button>
              </div>

              {!analytics.recentOrders || analytics.recentOrders.length === 0 ? (
                <div className="p-6 text-center bg-ivory-50 rounded-xs border border-ivory-200 text-xs text-charcoal-500">
                  No customer orders placed yet. Complete a test checkout to observe real-time order metrics here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ivory-200 text-charcoal-500 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 pr-3">Order #</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Payment</th>
                        <th className="py-2.5 px-3">Fulfillment</th>
                        <th className="py-2.5 pl-3 text-right">Tracking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ivory-100 text-charcoal-800">
                      {analytics.recentOrders.map((ord: any) => (
                        <tr key={ord._id || ord.orderNumber} className="hover:bg-ivory-50">
                          <td className="py-3 pr-3 font-mono font-semibold text-charcoal-950">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-charcoal-900">{ord.customerName}</p>
                            <p className="text-[10px] text-charcoal-500">{ord.customerEmail}</p>
                          </td>
                          <td className="py-3 px-3 font-semibold text-charcoal-900">
                            {formatINR(ord.total)}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={ord.paymentStatus === 'paid' ? 'default' : 'outline'}>
                              {ord.paymentStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="sand">{ord.orderStatus}</Badge>
                          </td>
                          <td className="py-3 pl-3 text-right font-mono text-[11px] text-charcoal-600">
                            {ord.trackingNumber || 'Pending'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                  {supplierOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-charcoal-500">
                        No dropship supplier orders queued yet. Complete an order through Checkout to dispatch a job to Agra Guild `SUP-AGR-01`.
                      </td>
                    </tr>
                  ) : (
                    supplierOrders.map((sOrder) => (
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
                          {['accepted', 'processing'].includes(sOrder.status) &&
                            (confirmCancelId === sOrder._id ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-red-700">
                                Refund the customer and cancel?
                                <button onClick={() => handleSupplierTransition(sOrder._id, 'cancelled')} className="font-semibold underline">Yes, cancel</button>
                                <button onClick={() => setConfirmCancelId(null)} className="text-charcoal-600 underline">Keep</button>
                              </span>
                            ) : (
                              <Button variant="outline" size="sm" disabled={isReadOnly} onClick={() => setConfirmCancelId(sOrder._id)}>
                                Cancel & Refund
                              </Button>
                            ))}
                          {sOrder.status === 'cancelled' && (
                            <span className="text-[11px] text-charcoal-500 font-semibold">Cancelled</span>
                          )}
                          {sOrder.status === 'delivered' && (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Fulfillment Complete
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sales' && <SalesPanel token={activeToken} />}
        {activeTab === 'settings' && <SettingsPanel token={activeToken} isReadOnly={isReadOnly} onMessage={flash} />}
        {activeTab === 'customers' && <CustomersPanel token={activeToken} isReadOnly={isReadOnly} onMessage={flash} />}
        {activeTab === 'orders' && <OrdersPanel token={activeToken} isReadOnly={isReadOnly} onMessage={flash} />}
        {activeTab === 'coupons' && <CouponsPanel token={activeToken} isReadOnly={isReadOnly} onMessage={flash} />}

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
                onClick={() => setIsCreatingProduct(true)}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add New Footwear Style
              </Button>
            </div>

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
                        <img decoding="async" loading="lazy"
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
                          {product.isActive !== false ? 'Active' : 'Archived'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditingProduct(product)}
                          disabled={isReadOnly}
                          className="p-1.5 hover:bg-ivory-200 text-charcoal-600 hover:text-charcoal-900 rounded-xs transition-colors disabled:opacity-40"
                          title="Edit product"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
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
                  {returnsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-charcoal-500">
                        No active size exchange or return requests.
                      </td>
                    </tr>
                  ) : (
                    returnsList.map((ret) => (
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
                          {returnActions(ret).map((action) => (
                            <Button
                              key={action.status}
                              variant={action.variant}
                              size="sm"
                              onClick={() => handleReturnTransition(ret._id, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                          {ret.status === 'refund_processed' && (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Refund processed
                            </span>
                          )}
                          {ret.status === 'rejected' && (
                            <span className="text-[11px] text-charcoal-500 font-semibold">Rejected</span>
                          )}
                          {ret.status === 'replacement_dispatched' && (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
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

      {isCreatingProduct && (
        <ProductEditor
          product={null}
          token={activeToken}
          onClose={() => setIsCreatingProduct(false)}
          onSaved={(saved) => {
            const created = normalizeProduct(saved);
            setProductsList((prev) => [created, ...prev]);
            setIsCreatingProduct(false);
            flash(`"${created.name}" published to the catalogue`, 4000);
            void fetchAdminData();
          }}
        />
      )}

      {editingProduct && (
        <ProductEditor
          product={editingProduct}
          token={activeToken}
          onClose={() => setEditingProduct(null)}
          onSaved={(saved) => {
            const updated = normalizeProduct(saved);
            setProductsList((prev) => prev.map((p) => ((p.id || p._id) === updated.id ? updated : p)));
            setEditingProduct(null);
            flash(`"${updated.name}" updated`);
            void fetchAdminData(); // new sizes and colours also show up in the inventory screen
          }}
        />
      )}
    </div>
  );
};
