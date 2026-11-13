import { parseApiJson } from '@/lib/utils';

export const adminService = {
  async getAnalytics(token: string) {
    const res = await fetch('/api/admin/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to retrieve admin analytics');
  },

  async getSupplierOrders(token: string) {
    const res = await fetch('/api/admin/supplier-orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to retrieve supplier orders');
  },

  async fulfillSupplierOrder(id: string, status: string, note: string | undefined, token: string) {
    const res = await fetch(`/api/admin/supplier-orders/${id}/fulfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, note }),
    });

    return parseApiJson(res, 'Failed to update supplier status');
  },

  async getInventory(token: string) {
    const res = await fetch('/api/admin/inventory', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to retrieve inventory');
  },

  async updateInventoryStock(sku: string, availableStock: number, token: string) {
    const res = await fetch(`/api/admin/inventory/${sku}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ availableStock }),
    });
    return parseApiJson(res, 'Failed to update inventory stock');
  },

  async getReturns(token: string) {
    const res = await fetch('/api/admin/returns', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to retrieve returns');
  },

  async updateReturnStatus(
    id: string,
    status: string,
    adminNotes: string | undefined,
    replacementTrackingNumber: string | undefined,
    token: string
  ) {
    const res = await fetch(`/api/admin/returns/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, adminNotes, replacementTrackingNumber }),
    });
    return parseApiJson(res, 'Failed to update return request');
  },

  async createProduct(productData: any, token: string) {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
    return parseApiJson(res, 'Failed to create product');
  },

  async toggleProductActive(id: string, token: string) {
    const res = await fetch(`/api/admin/products/${id}/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to toggle product status');
  },

  async uploadProductImage(image: string, token: string) {
    const res = await fetch('/api/admin/products/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image, folder: 'footzi/products' }),
    });
    return parseApiJson(res, 'Failed to upload product image to Cloudinary');
  },

  async getOrders(params: { status?: string; search?: string; page?: number }, token: string) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'all') q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    q.set('page', String(params.page ?? 1));
    q.set('limit', '15');
    const res = await fetch(`/api/admin/orders?${q.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    return parseApiJson(res, 'Failed to retrieve orders');
  },

  async refundCancelledOrder(id: string, token: string) {
    const res = await fetch(`/api/admin/orders/${id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to refund the order');
  },

  async getCoupons(token: string) {
    const res = await fetch('/api/admin/coupons', { headers: { Authorization: `Bearer ${token}` } });
    return parseApiJson(res, 'Failed to retrieve coupons');
  },

  async createCoupon(data: Record<string, unknown>, token: string) {
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return parseApiJson(res, 'Failed to create the coupon');
  },

  async updateCoupon(id: string, data: Record<string, unknown>, token: string) {
    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return parseApiJson(res, 'Failed to update the coupon');
  },

  /** Every product, including archived ones. */
  async getAllProducts(token: string) {
    const res = await fetch('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } });
    return parseApiJson(res, 'Failed to retrieve the catalog');
  },

  async updateProduct(id: string, data: Record<string, unknown>, token: string) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return parseApiJson(res, 'Failed to update the product');
  },

  async getSalesReport(days: number, token: string) {
    const res = await fetch(`/api/admin/reports/sales?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
    return parseApiJson(res, 'Failed to load the sales report');
  },

  async getCustomers(params: { search?: string; sort?: string; page?: number }, token: string) {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.sort) q.set('sort', params.sort);
    q.set('page', String(params.page ?? 1));
    q.set('limit', '20');
    const res = await fetch(`/api/admin/customers?${q.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    return parseApiJson(res, 'Failed to load customers');
  },

  /** Downloads a spreadsheet. It goes through fetch so the sign-in token is sent, then saves the file. */
  async downloadCsv(path: string, token: string): Promise<void> {
    const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      let message = 'The export failed';
      try {
        message = (await res.json()).error || message;
      } catch {
        // Keep the generic message
      }
      throw new Error(message);
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || 'footzi-export.csv';
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
