import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, ProductQueryParams } from '@/services/productService';
import { ShoeSize } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

export function useProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productService.getProducts(params),
  });
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => (slug ? productService.getProductBySlug(slug) : null),
    enabled: !!slug,
  });
}

export function useSubmitReview(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (review: { rating: number; title?: string; comment: string; city?: string; sizePurchased?: ShoeSize }) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Please sign in to write a review.');
      return productService.submitReview(productId, review, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}
