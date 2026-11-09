import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, ProductQueryParams } from '@/services/productService';
import { ProductReview } from '@/types';

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
    mutationFn: (review: Omit<ProductReview, 'id' | 'date' | 'verified'>) =>
      productService.submitReview(productId, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}
