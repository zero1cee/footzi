export const adminService = {
  async getAnalytics(token: string) {
    const res = await fetch('/api/admin/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to retrieve admin analytics');
    return res.json();
  },

  async getSupplierOrders(token: string) {
    const res = await fetch('/api/admin/supplier-orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to retrieve supplier orders');
    return res.json();
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

    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to update supplier status');
    return body;
  },

  async getInventory(token: string) {
    const res = await fetch('/api/admin/inventory', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to retrieve inventory');
    return res.json();
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
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to update inventory stock');
    return body;
  },

  async getReturns(token: string) {
    const res = await fetch('/api/admin/returns', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to retrieve returns');
    return res.json();
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
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to update return request');
    return body;
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
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to create product');
    return body;
  },

  async toggleProductActive(id: string, token: string) {
    const res = await fetch(`/api/admin/products/${id}/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to toggle product status');
    return body;
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
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to upload product image to Cloudinary');
    return body;
  },
};
