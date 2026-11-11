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
};
