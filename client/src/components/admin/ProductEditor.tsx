import React, { useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/Button';
import { useDialogA11y } from '@/hooks/useDialogA11y';

const CATEGORIES = ['Loafers', 'Sneakers', 'Oxfords', 'Boots', 'Slip-ons'];
const BADGES = ['', 'New Arrival', 'Best Seller', 'Artisan Heritage', 'Limited Run'];
const inputClass = 'w-full bg-white border border-ivory-300 px-3 py-2 rounded-xs text-xs focus:outline-none focus:border-charcoal-900';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });

interface Props {
  product: any;
  token: string;
  onClose: () => void;
  onSaved: (product: any) => void;
}

/** Edits an existing product. Stock is changed on the inventory screen, where pairs held for unpaid orders are accounted for. */
export const ProductEditor: React.FC<Props> = ({ product, token, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: product.name ?? '',
    category: product.category ?? 'Loafers',
    description: product.description ?? '',
    price: String(product.price ?? ''),
    originalPrice: String(product.originalPrice ?? ''),
    material: product.material ?? '',
    sole: product.sole ?? '',
    badge: product.badge ?? '',
    features: (product.features ?? []).join('\n'),
  });
  const [images, setImages] = useState<string[]>(product.images?.length ? product.images : ['']);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogA11y<HTMLFormElement>(true, onClose);

  const price = Number(form.price);
  const original = Number(form.originalPrice);
  const discount = original > price && price > 0 ? Math.round(((original - price) / original) * 100) : 0;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMAGE_BYTES) {
      setError('That image is over 5 MB. Choose a smaller one.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const result = await adminService.uploadProductImage(dataUrl, token);
      setImages((prev) => [...prev.filter(Boolean), result.secureUrl]);
    } catch (err: any) {
      setError(err.message || 'The upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await adminService.updateProduct(
        product.id || product._id,
        {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          price,
          originalPrice: original,
          material: form.material.trim(),
          sole: form.sole.trim(),
          badge: form.badge || null,
          features: form.features.split('\n').map((f: string) => f.trim()).filter(Boolean),
          images: images.map((i) => i.trim()).filter(Boolean),
        },
        token
      );
      onSaved(res.product);
    } catch (err: any) {
      setError(err.message || 'Could not save the product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-charcoal-950/60 overflow-y-auto" role="dialog" aria-modal="true" aria-label={`Edit ${product.name}`}>
      <form ref={dialogRef} tabIndex={-1} onSubmit={save} className="focus:outline-none bg-white w-full max-w-2xl rounded-xs shadow-2xl border border-ivory-300 p-6 sm:p-8 relative space-y-4 text-xs my-4">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900">
          <X className="w-5 h-5" />
        </button>
        <h3 className="font-serif text-xl font-medium text-charcoal-950">Edit footwear style</h3>
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xs" role="alert">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pe-name" className="block font-semibold text-charcoal-700 mb-1">Name</label>
            <input id="pe-name" className={inputClass} required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <p className="text-[10px] text-charcoal-500 mt-1">The page address stays the same when the name changes.</p>
          </div>
          <div>
            <label htmlFor="pe-category" className="block font-semibold text-charcoal-700 mb-1">Category</label>
            <select id="pe-category" className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pe-price" className="block font-semibold text-charcoal-700 mb-1">Selling price ₹</label>
            <input id="pe-price" type="number" min={1} required className={inputClass} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pe-original" className="block font-semibold text-charcoal-700 mb-1">Original price ₹</label>
            <input id="pe-original" type="number" min={1} required className={inputClass} value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="block font-semibold text-charcoal-700 mb-1">Shown discount</span>
            <p className="py-2 text-charcoal-900 font-semibold">{discount > 0 ? `${discount}% off` : 'None'}</p>
          </div>
        </div>

        <div>
          <label htmlFor="pe-desc" className="block font-semibold text-charcoal-700 mb-1">Description</label>
          <textarea id="pe-desc" rows={3} required minLength={10} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pe-material" className="block font-semibold text-charcoal-700 mb-1">Material</label>
            <input id="pe-material" className={inputClass} value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pe-sole" className="block font-semibold text-charcoal-700 mb-1">Sole</label>
            <input id="pe-sole" className={inputClass} value={form.sole} onChange={(e) => setForm({ ...form, sole: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pe-badge" className="block font-semibold text-charcoal-700 mb-1">Badge</label>
            <select id="pe-badge" className={inputClass} value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}>
              {BADGES.map((b) => <option key={b} value={b}>{b || 'None'}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="pe-features" className="block font-semibold text-charcoal-700 mb-1">Features (one per line)</label>
          <textarea id="pe-features" rows={3} className={inputClass} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
        </div>

        <div className="space-y-2">
          <span className="block font-semibold text-charcoal-700">Images (the first is the cover)</span>
          {images.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              {url && <img decoding="async" loading="lazy" src={url} alt="" className="w-9 h-9 object-cover rounded-xs border border-ivory-300" />}
              <input aria-label={`Image ${i + 1} link`} className={inputClass} value={url} placeholder="https://…" onChange={(e) => setImages((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))} />
              <button type="button" aria-label={`Remove image ${i + 1}`} disabled={images.length === 1} onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="p-1.5 text-charcoal-500 hover:text-red-700 disabled:opacity-30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setImages((prev) => [...prev, ''])} className="flex items-center gap-1 font-semibold text-charcoal-800 underline">
              <Plus className="w-3.5 h-3.5" /> Add image link
            </button>
            <label className="font-semibold text-charcoal-800 underline cursor-pointer">
              {uploading ? 'Uploading…' : 'Upload a file'}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" disabled={uploading} onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" isLoading={saving}>Save changes</Button>
        </div>
      </form>
    </div>
  );
};
