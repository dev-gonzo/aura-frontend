import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../../../shared/components/forms/select/form-select.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { LojaService, StoreProductListItem } from '../../services/loja.service';

@Component({
  selector: 'app-loja-products-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormSelectComponent,
    ButtonComponent,
  ],
  templateUrl: './loja-products.page.html',
  styleUrl: './loja-products.page.css',
})
export class LojaProductsPage {
  private readonly lojaService = inject(LojaService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly priceFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  protected readonly loading = signal(false);
  protected readonly duplicatingProductId = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly items = signal<StoreProductListItem[]>([]);
  protected readonly filteredItems = signal<StoreProductListItem[]>([]);
  protected readonly activeTab = signal<'categorias' | 'destaques' | 'promocoes' | 'lancamentos'>(
    'categorias'
  );
  protected readonly statusOptions: FormSelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'ATIVOS', label: 'Ativos' },
    { value: 'INATIVOS', label: 'Inativos' },
  ];
  protected readonly featuredOptions: FormSelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'SIM', label: 'Em destaque' },
    { value: 'NAO', label: 'Sem destaque' },
  ];
  protected readonly promotionOptions: FormSelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'SIM', label: 'Em promoção' },
    { value: 'NAO', label: 'Sem promoção' },
  ];
  protected readonly launchOptions: FormSelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'SIM', label: 'Lançamentos' },
    { value: 'NAO', label: 'Sem selo' },
  ];
  protected readonly typeOptions: FormSelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'LIVRO', label: 'Livros' },
    { value: 'OUTRO', label: 'Outros' },
  ];
  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    status: [''],
    type: [''],
    category: [''],
    featured: [''],
    promotion: [''],
    launch: [''],
  });
  protected readonly categoryOptions = computed<FormSelectOption[]>(() => [
    { value: '', label: 'Todas' },
    ...Array.from(
      new Set(
        this.items().flatMap((item) => {
          const categories = item.categorias?.length ? item.categorias : item.categoria ? [item.categoria] : [];
          return categories.map((category) => category.trim()).filter((category): category is string => !!category);
        })
      )
    )
      .sort((left, right) => left.localeCompare(right))
      .map((item) => ({ value: item, label: item })),
  ]);
  protected readonly tabs = computed(() => [
    { id: 'categorias' as const, label: 'Categorias', count: this.categoryOptions().length - 1 },
    { id: 'destaques' as const, label: 'Destaques', count: this.items().filter((item) => item.destaque).length },
    { id: 'promocoes' as const, label: 'Promoções', count: this.items().filter((item) => item.em_promocao).length },
    { id: 'lancamentos' as const, label: 'Lançamentos', count: this.items().filter((item) => item.lancamento).length },
  ]);
  protected readonly resultLabel = computed(() => {
    const total = this.filteredItems().length;
    return total === 1 ? '1 produto encontrado' : `${total} produtos encontrados`;
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const items = await this.lojaService.listProducts();
      this.items.set(items);
      this.applyFilters();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
      this.items.set([]);
      this.filteredItems.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected applyFilters(): void {
    const value = this.filterForm.getRawValue();
    const normalizedSearch = value.search.trim().toLowerCase();

    const nextItems = this.items().filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          item.nome_exibicao,
          item.slug,
          (item.categorias ?? []).join(' '),
          item.autor_nome ?? '',
          item.livro_titulo ?? '',
          item.livro_subtitulo ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        !value.status ||
        (value.status === 'ATIVOS' ? item.ativo : !item.ativo);
      const matchesType =
        !value.type ||
        (value.type === 'LIVRO' ? item.is_book : !item.is_book);

      const matchesCategory =
        !value.category ||
        (item.categorias?.length ? item.categorias : item.categoria ? [item.categoria] : []).some(
          (category) => category.trim() === value.category
        );
      const matchesFeatured =
        !value.featured ||
        (value.featured === 'SIM' ? item.destaque : !item.destaque);
      const matchesPromotion =
        !value.promotion ||
        (value.promotion === 'SIM' ? item.em_promocao : !item.em_promocao);
      const matchesLaunch =
        !value.launch ||
        (value.launch === 'SIM' ? item.lancamento : !item.lancamento);

      const matchesTab =
        (this.activeTab() === 'categorias' && matchesCategory) ||
        (this.activeTab() === 'destaques' && item.destaque) ||
        (this.activeTab() === 'promocoes' && item.em_promocao) ||
        (this.activeTab() === 'lancamentos' && item.lancamento);

      return matchesSearch && matchesStatus && matchesType && matchesCategory && matchesFeatured && matchesPromotion && matchesLaunch && matchesTab;
    });

    this.filteredItems.set(nextItems);
  }

  protected setActiveTab(tab: 'categorias' | 'destaques' | 'promocoes' | 'lancamentos'): void {
    this.activeTab.set(tab);
    this.applyFilters();
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      type: '',
      category: '',
      featured: '',
      promotion: '',
      launch: '',
    });
    this.applyFilters();
  }

  protected formatPrice(value: number): string {
    return this.priceFormatter.format(value || 0);
  }

  protected discountPercentLabel(item: StoreProductListItem): string | null {
    if (!item.em_promocao || item.preco_venda <= 0 || item.preco_promocional <= 0 || item.preco_promocional >= item.preco_venda) {
      return null;
    }

    const percent = Math.round(((item.preco_venda - item.preco_promocional) / item.preco_venda) * 100);
    return percent > 0 ? `${percent}% OFF` : null;
  }

  protected getCoverUrl(item: StoreProductListItem): string | null {
    if (!item.capa?.base64 || !item.capa.mime) {
      return null;
    }

    return `data:${item.capa.mime};base64,${item.capa.base64}`;
  }

  protected isDuplicating(itemId: string): boolean {
    return this.duplicatingProductId() === itemId;
  }

  protected async duplicateProduct(item: StoreProductListItem): Promise<void> {
    this.duplicatingProductId.set(item.id);
    this.errorMessage.set('');

    try {
      const source = await this.lojaService.findProductById(item.id);
      const nextOrder = this.items().reduce((highest, current) => Math.max(highest, current.ordem), 0) + 1;
      const duplicateName = this.buildDuplicateName(source.nome_exibicao);
      const duplicateSlug = this.buildDuplicateSlug(source.slug);

      const duplicatedId = await this.lojaService.createProduct({
        livro_id: source.livro_id?.trim() || undefined,
        is_book: source.is_book ?? true,
        authors: source.authors ?? [],
        autor_nome: source.autor_nome?.trim() || undefined,
        slug: duplicateSlug,
        nome_exibicao: duplicateName,
        descricao_curta: source.descricao_curta ?? '',
        categorias: source.categorias?.length ? source.categorias : source.categoria ? [source.categoria] : [],
        preco_venda: source.preco_venda,
        em_promocao: source.em_promocao,
        preco_promocional: source.em_promocao ? source.preco_promocional : 0,
        destaque: source.destaque,
        lancamento: source.lancamento,
        ativo: source.ativo,
        ordem: nextOrder,
        fotos: (source.fotos ?? []).map((photo, index) => ({
          id: photo.id,
          order: index,
          is_primary: photo.is_primary,
          image: photo.image ?? null,
        })),
      });

      await this.router.navigate(['/painel/loja/produtos', duplicatedId]);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.duplicatingProductId.set(null);
    }
  }

  private buildDuplicateName(originalName: string): string {
    const baseName = (originalName || 'Produto').trim() || 'Produto';
    const usedNames = new Set(this.items().map((item) => item.nome_exibicao.trim().toLowerCase()));
    let counter = 1;

    while (true) {
      const suffix = counter === 1 ? ' - Copia' : ` - Copia ${counter}`;
      const candidate = `${baseName}${suffix}`;
      if (!usedNames.has(candidate.toLowerCase())) {
        return candidate;
      }
      counter += 1;
    }
  }

  private buildDuplicateSlug(originalSlug: string): string {
    const normalizedBaseSlug = normalizeProductSlug(originalSlug || 'produto');
    const baseSlug = normalizedBaseSlug || 'produto';
    const usedSlugs = new Set(this.items().map((item) => item.slug.trim().toLowerCase()));
    let counter = 1;

    while (true) {
      const suffix = counter === 1 ? '-copia' : `-copia-${counter}`;
      const candidate = `${baseSlug}${suffix}`;
      if (!usedSlugs.has(candidate.toLowerCase())) {
        return candidate;
      }
      counter += 1;
    }
  }
}

function normalizeProductSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
