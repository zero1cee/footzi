import React, { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/Button';
import { useDialogA11y } from '@/hooks/useDialogA11y';

const CATEGORIES = ['Loafers', 'Sneakers', 'Oxfords', 'Boots', 'Slip-ons'];
const BADGES = ['', 'New Arrival', 'Best Seller', 'Artisan Heritage', 'Limited Run'];
const ALL_SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];
const inputClass = 'w-full bg-white border border-ivory-300 px-3 py-2 rounded-xs text-xs focus:outline-none focus:border-charcoal-900';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });

interface Colour {
  name: string;
  hex: string;
  imageIndex: number;
}

interface Cell {
  add: boolean;
  stock: string;
}

const code = (text: string, length: number) => text.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, length).padEnd(length, 'X');
const sizeNumber = (size: string) => size.replace('UK ', '');
const cellKey = (colour: string, size: string) => `${colour}|${size}`;

interface Props {
  /** The style to edit, or null to create a new one. */
  product: any | null;
  token: string;
  onClose: () => void;
  onSaved: (product: any) => void;
}

/**
 * Creates or edits a footwear style, including its colours, sizes and the pairs in stock for each combination.
 * Stock already on the shelf is changed on the inventory screen, where pairs held for unpaid orders are
 * accounted for; this form only gives new combinations their opening stock.
 */
export const ProductEditor: React.FC<Props> = ({ product, token, onClose, onSaved }) => {
  const isNew = product === null;
  const existingVariants: any[] = product?.variants ?? [];
  const existingBySlot = useMemo(() => new Map(existingVariants.map((v) => [cellKey(v.color, v.size), v])), [existingVariants]);
  const usedColours = useMemo(() => new Set(existingVariants.map((v) => v.color)), [existingVariants]);
  const usedSizes = useMemo(() => new Set(existingVariants.map((v) => v.size)), [existingVariants]);
  // SKUs for new variants carry a short random tail, so two styles named alike never collide
  const tail = useRef(Math.random().toString(36).slice(2, 5).toUpperCase());

  const [form, setForm] = useState({
    name: product?.name ?? '',
    category: product?.category ?? 'Loafers',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    originalPrice: product ? String(product.originalPrice) : '',
    material: product?.material ?? 'Full-Grain Agra Calfskin',
    sole: product?.sole ?? 'Hand-stitched Leather Sole',
    badge: product?.badge ?? '',
    features: (product?.features ?? []).join('\n'),
  });
  const [images, setImages] = useState<string[]>(product?.images?.length ? product.images : ['']);
  const [colours, setColours] = useState<Colour[]>(product?.colors?.length ? product.colors : [{ name: '', hex: '#8C4E28', imageIndex: 0 }]);
  const [sizes, setSizes] = useState<string[]>(product?.sizes?.length ? product.sizes : ['UK 8']);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [fillValue, setFillValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogA11y<HTMLFormElement>(true, onClose);

  const price = Number(form.price);
  const original = Number(form.originalPrice);
  const discount = original > price && price > 0 ? Math.round(((original - price) / original) * 100) : 0;
  const imageCount = images.filter((i) => i.trim()).length;

  const named = colours.filter((c) => c.name.trim());
  const sortedSizes = ALL_SIZES.filter((s) => sizes.includes(s));
  const cell = (colour: string, size: string): Cell => cells[cellKey(colour, size)] ?? { add: true, stock: '' };
  const setCell = (colour: string, size: string, patch: Partial<Cell>) =>
    setCells((prev) => ({ ...prev, [cellKey(colour, size)]: { ...cell(colour, size), ...patch } }));

  const skuFor = (colour: string, size: string) => `FTZ-${code(form.name || 'NEW', 3)}-${code(colour, 3)}-UK${sizeNumber(size)}-${tail.current}`;

  /** The combinations that need creating: every colour and size that has no variant yet and is ticked. */
  const newVariants = useMemo(() => {
    const out: { sku: string; size: string; color: string; colorHex: string; stock: number }[] = [];
    for (const c of named) {
      for (const size of sortedSizes) {
        if (existingBySlot.has(cellKey(c.name, size))) continue;
        const state = cell(c.name, size);
        if (!state.add) continue;
        out.push({ sku: skuFor(c.name, size), size, color: c.name.trim(), colorHex: c.hex, stock: Number(state.stock || 0) });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [named, sortedSizes, cells, existingBySlot, form.name]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMAGE_BYTES) {
      setError('That image is over 5 MB. Choose a smaller one.');
      return;
    }
    setUploading(true);
    try {
      const result = await adminService.uploadProductImage(await readAsDataUrl(file), token);
      setImages((prev) => [...prev.filter(Boolean), result.secureUrl]);
    } catch (err: any) {
      setError(err.message || 'The upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fillEmpty = () => {
    if (fillValue.trim() === '' || Number(fillValue) < 0) return;
    setCells((prev) => {
      const next = { ...prev };
      for (const c of named) {
        for (const size of sortedSizes) {
          if (existingBySlot.has(cellKey(c.name, size))) continue;
          const current = prev[cellKey(c.name, size)] ?? { add: true, stock: '' };
          if (current.add && current.stock === '') next[cellKey(c.name, size)] = { add: true, stock: fillValue };
        }
      }
      return next;
    });
  };

  const problem = (): string | null => {
    if (named.length !== colours.length) return 'Give every colour a name, or remove the empty row.';
    if (new Set(named.map((c) => c.name.trim().toLowerCase())).size !== named.length) return 'Two colours have the same name.';
    if (sortedSizes.length === 0) return 'Choose at least one size.';
    if (imageCount === 0) return 'Add at least one image.';
    for (const c of named) {
      if (c.imageIndex >= imageCount) return `Colour "${c.name}" points at image ${c.imageIndex + 1}, which does not exist.`;
      const hasStockRow = sortedSizes.some((s) => existingBySlot.has(cellKey(c.name, s)) || newVariants.some((v) => v.color === c.name.trim() && v.size === s));
      if (!hasStockRow) return `Colour "${c.name}" has no sizes ticked.`;
    }
    for (const s of sortedSizes) {
      const used = named.some((c) => existingBySlot.has(cellKey(c.name, s)) || newVariants.some((v) => v.color === c.name.trim() && v.size === s));
      if (!used) return `Size ${s} has no colours ticked. Untick the size, or tick it for at least one colour.`;
    }
    const bad = newVariants.find((v) => !Number.isInteger(v.stock) || v.stock < 0);
    if (bad) return `Opening stock for ${bad.color} ${bad.size} must be a whole number, 0 or more.`;
    if (isNew && newVariants.length === 0) return 'Tick at least one size and colour with its opening stock.';
    return null;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const issue = problem();
    if (issue) {
      setError(issue);
      return;
    }
    setSaving(true);
    try {
      const payload = {
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
        colors: named.map((c) => ({ name: c.name.trim(), hex: c.hex, imageIndex: c.imageIndex })),
        sizes: sortedSizes,
        variants: newVariants,
      };
      const res = isNew
        ? await adminService.createProduct(payload, token)
        : await adminService.updateProduct(product.id || product._id, payload, token);
      onSaved(res.product);
    } catch (err: any) {
      setError(err.message || 'Could not save the product');
    } finally {
      setSaving(false);
    }
  };

  const toggleSize = (size: string) => setSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  const updateColour = (index: number, patch: Partial<Colour>) => setColours((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-charcoal-950/60 overflow-y-auto" role="dialog" aria-modal="true" aria-label={isNew ? 'New footwear style' : `Edit ${product.name}`}>
      <form ref={dialogRef} tabIndex={-1} onSubmit={save} noValidate className="focus:outline-none bg-white w-full max-w-3xl rounded-xs shadow-2xl border border-ivory-300 p-6 sm:p-8 relative space-y-5 text-xs my-4">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900">
          <X className="w-5 h-5" />
        </button>
        <h3 className="font-serif text-xl font-medium text-charcoal-950">{isNew ? 'New footwear style' : 'Edit footwear style'}</h3>
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xs" role="alert">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pe-name" className="block font-semibold text-charcoal-700 mb-1">Name</label>
            <input id="pe-name" className={inputClass} required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {!isNew && <p className="text-[10px] text-charcoal-500 mt-1">The page address stays the same when the name changes.</p>}
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

        <fieldset className="space-y-2">
          <legend className="block font-semibold text-charcoal-700">Images (the first is the cover)</legend>
          {images.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              {url && <img src={url} alt="" className="w-9 h-9 object-cover rounded-xs border border-ivory-300" />}
              <span className="w-5 text-charcoal-500 text-center">{i + 1}</span>
              <input aria-label={`Image ${i + 1} link`} className={inputClass} value={url} placeholder="https://…" onChange={(e) => setImages((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))} />
              <button type="button" aria-label={`Remove image ${i + 1}`} disabled={images.length === 1} onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="p-1.5 text-charcoal-500 hover:text-red-700 disabled:opacity-30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setImages((prev) => [...prev, ''])} className="flex items-center gap-1 font-semibold text-charcoal-800 underline py-1">
              <Plus className="w-3.5 h-3.5" /> Add image link
            </button>
            <label className="font-semibold text-charcoal-800 underline cursor-pointer">
              {uploading ? 'Uploading…' : 'Upload a file'}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" disabled={uploading} onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="block font-semibold text-charcoal-700">Colours</legend>
          {colours.map((c, i) => {
            const locked = usedColours.has(c.name);
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input aria-label={`Colour ${i + 1} name`} className={`${inputClass} max-w-[11rem]`} placeholder="e.g. Vintage Tan" value={c.name} disabled={locked} onChange={(e) => updateColour(i, { name: e.target.value })} />
                <input aria-label={`Colour ${i + 1} swatch`} type="color" value={c.hex} disabled={locked} onChange={(e) => updateColour(i, { hex: e.target.value })} className="h-9 w-11 p-0.5 border border-ivory-300 rounded-xs bg-white" />
                <label className="flex items-center gap-1 text-charcoal-600">
                  Shown with image
                  <select aria-label={`Colour ${i + 1} image`} className="bg-white border border-ivory-300 px-2 py-2 rounded-xs" value={c.imageIndex} onChange={(e) => updateColour(i, { imageIndex: Number(e.target.value) })}>
                    {Array.from({ length: Math.max(imageCount, 1) }, (_, n) => <option key={n} value={n}>{n + 1}</option>)}
                  </select>
                </label>
                <button type="button" aria-label={`Remove colour ${i + 1}`} disabled={locked || colours.length === 1} onClick={() => setColours((prev) => prev.filter((_, j) => j !== i))} className="p-1.5 text-charcoal-500 hover:text-red-700 disabled:opacity-30" title={locked ? 'This colour has variants, so it cannot be removed' : undefined}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={() => setColours((prev) => [...prev, { name: '', hex: '#555555', imageIndex: 0 }])} className="flex items-center gap-1 font-semibold text-charcoal-800 underline py-1">
            <Plus className="w-3.5 h-3.5" /> Add a colour
          </button>
        </fieldset>

        <fieldset>
          <legend className="block font-semibold text-charcoal-700 mb-1">Sizes (UK)</legend>
          <div className="flex flex-wrap gap-3">
            {ALL_SIZES.map((size) => (
              <label key={size} className="flex items-center gap-1.5 text-charcoal-800">
                <input type="checkbox" checked={sizes.includes(size)} disabled={usedSizes.has(size)} onChange={() => toggleSize(size)} />
                {size}
              </label>
            ))}
          </div>
          {usedSizes.size > 0 && <p className="text-[10px] text-charcoal-500 mt-1">A size that already has pairs cannot be unticked.</p>}
        </fieldset>

        <section aria-labelledby="pe-stock-heading" className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h4 id="pe-stock-heading" className="font-semibold text-charcoal-700">Pairs in stock, by colour and size</h4>
            <div className="flex items-center gap-2">
              <label htmlFor="pe-fill" className="text-charcoal-600">Fill empty cells with</label>
              <input id="pe-fill" type="number" min={0} className="w-16 bg-white border border-ivory-300 px-2 py-1.5 rounded-xs" value={fillValue} onChange={(e) => setFillValue(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={fillEmpty}>Apply</Button>
            </div>
          </div>
          {named.length === 0 || sortedSizes.length === 0 ? (
            <p className="text-charcoal-500">Name a colour and choose a size to see the grid.</p>
          ) : (
            <div className="overflow-x-auto border border-ivory-200 rounded-xs">
              <table className="w-full text-xs">
                <caption className="sr-only">Opening stock for each colour and size</caption>
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-charcoal-500 border-b border-ivory-200">
                    <th scope="col" className="p-2">Colour</th>
                    {sortedSizes.map((s) => <th key={s} scope="col" className="p-2 text-center">{s}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-100">
                  {named.map((c) => (
                    <tr key={c.name}>
                      <th scope="row" className="p-2 text-left font-semibold text-charcoal-900">
                        <span className="inline-block w-3 h-3 rounded-full border border-ivory-300 mr-1.5 align-middle" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                        {c.name}
                      </th>
                      {sortedSizes.map((size) => {
                        const existing = existingBySlot.get(cellKey(c.name, size));
                        if (existing) {
                          return (
                            <td key={size} className="p-2 text-center text-charcoal-600">
                              {existing.stock} <span className="block text-[10px] text-charcoal-400">on sale</span>
                            </td>
                          );
                        }
                        const state = cell(c.name, size);
                        return (
                          <td key={size} className="p-2 text-center">
                            <label className="flex items-center justify-center gap-1">
                              <input type="checkbox" aria-label={`Sell ${c.name} in ${size}`} checked={state.add} onChange={(e) => setCell(c.name, size, { add: e.target.checked })} />
                              <input type="number" min={0} aria-label={`Opening stock for ${c.name} ${size}`} disabled={!state.add} value={state.stock} placeholder="0" onChange={(e) => setCell(c.name, size, { stock: e.target.value })} className="w-14 bg-white border border-ivory-300 px-1.5 py-1.5 rounded-xs disabled:opacity-40" />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-charcoal-500">
            {isNew
              ? 'Tick the combinations you make and enter the pairs you have ready. You can change stock later on the Inventory screen.'
              : 'Pairs already on sale are changed on the Inventory screen, where pairs held for unpaid orders are accounted for. New combinations below get their opening stock here.'}{' '}
            {newVariants.length > 0 && <strong>{newVariants.length} new combination{newVariants.length === 1 ? '' : 's'} will be added.</strong>}
          </p>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" isLoading={saving}>{isNew ? 'Publish style' : 'Save changes'}</Button>
        </div>
      </form>
    </div>
  );
};
