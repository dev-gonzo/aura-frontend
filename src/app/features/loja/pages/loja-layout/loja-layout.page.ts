import { CommonModule, DOCUMENT } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs';

import { processApiError } from '../../../../core/utils/process-api-error';
import { digitsOnly } from '../../../../core/utils/masks';
import { StoreColorFieldComponent } from '../../components/store-color-field/store-color-field.component';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { ModalComponent } from '../../../../shared/components/feedback/modal/modal.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import {
  FormIconSelectComponent,
  FormIconSelectOption,
} from '../../../../shared/components/forms/icon-select/form-icon-select.component';
import { ImageUploadComponent } from '../../../../shared/components/forms/image-upload/image-upload.component';
import { FormSelectComponent, FormSelectOption } from '../../../../shared/components/forms/select/form-select.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import type { ProcessedImageResult } from '../../../../shared/utils/process-image-file';
import {
  StoreBrandDisplayMode,
  StoreBrandLogoSize,
  StoreBannerContentPosition,
  StoreBannerContentHorizontalPosition,
  StoreBannerEffectMode,
  StoreBannerLinkMode,
  StoreBannerContentVerticalPosition,
  StoreBannerWidthMode,
  LojaService,
  StoreBannerPayload,
  StoreButtonStyle,
  StoreContentWidthMode,
  StoreCornerStyle,
  StoreFeatureHighlightPayload,
  StoreInstitutionalSectionPayload,
  StoreImagePayload,
  StoreNavigationLinkPayload,
  StoreNavigationLinkKind,
  StoreMenuBackgroundMode,
  StoreProductSectionConfigPayload,
  StoreProductSectionDisplayMode,
  StoreProductsPerRowDesktop,
  StoreProductsPerRowMobile,
  StorefrontSectionKey,
  StoreProductListItem,
} from '../../services/loja.service';
import { processStoreBannerDesktop } from '../../utils/process-store-banner-desktop';
import { processStoreBannerMobile } from '../../utils/process-store-banner-mobile';
import { processStoreFavicon } from '../../utils/process-store-favicon';
import { processStoreLogo } from '../../utils/process-store-logo';
import { TenantService } from '../../services/tenant.service';

type LayoutField =
  | 'store_name'
  | 'store_subtitle'
  | 'store_description'
  | 'store_tags'
  | 'store_in_maintenance'
  | 'maintenance_title'
  | 'maintenance_message'
  | 'primary_color'
  | 'accent_color'
  | 'secondary_color'
  | 'background_color'
  | 'header_color'
  | 'menu_color'
  | 'footer_color'
  | 'header_text_color'
  | 'menu_text_color'
  | 'footer_text_color'
  | 'primary_text_color'
  | 'highlight_color'
  | 'discount_color'
  | 'launch_badge_color'
  | 'featured_badge_color'
  | 'promotion_badge_color'
  | 'button_color'
  | 'button_text_color'
  | 'font_family'
  | 'font_secondary_family'
  | 'font_menu_family'
  | 'font_button_family'
  | 'font_highlight_family'
  | 'font_import_url'
  | 'font_embed_code'
  | 'corner_style'
  | 'content_width_mode'
  | 'menu_background_mode'
  | 'button_style'
  | 'banner_rotation_seconds'
  | 'brand_display_mode'
  | 'brand_logo_size'
  | 'products_per_row_desktop'
  | 'products_per_row_mobile'
  | 'hero_title'
  | 'hero_subtitle'
  | 'custom_block_eyebrow'
  | 'custom_block_title'
  | 'custom_block_description'
  | 'custom_block_html'
  | 'custom_block_css'
  | 'custom_block_js'
  | 'institutional_section_display_mode'
  | 'institutional_section_width_mode'
  | 'institutional_section_background_color';

type LayoutTab =
  | 'dados'
  | 'cabecalho'
  | 'cores'
  | 'layout'
  | 'menu'
  | 'banners'
  | 'bloco'
  | 'produtos'
  | 'destaques'
  | 'rodape';
type ProductViewTab = 'categorias' | 'destaques' | 'promocoes' | 'lancamentos';
type EditableMenuLinkKind = StoreNavigationLinkKind;

interface EditableBanner {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  order: number;
  active: boolean;
  show_content: boolean;
  link_mode: StoreBannerLinkMode;
  content_position: StoreBannerContentPosition;
  content_position_x: StoreBannerContentHorizontalPosition;
  content_position_y: StoreBannerContentVerticalPosition;
  use_button: boolean;
  button_label: string;
  desktop: StoreImagePayload | null;
  mobile: StoreImagePayload | null;
  desktopPreview: string | null;
  mobilePreview: string | null;
}

interface EditableLink {
  kind: EditableMenuLinkKind;
  label: string;
  url: string;
  visible: boolean;
}

interface EditableHighlight {
  title: string;
  text: string;
  icon: string;
  text_align: 'left' | 'center' | 'right';
  icon_size: 'small' | 'medium' | 'large';
  font_family: string;
}

interface EditableInstitutionalSectionConfig {
  eyebrow: string;
  title: string;
  description: string;
  display_mode: 'cards' | 'continuous';
  width_mode: 'contained' | 'full_width';
  background_color: string;
}

interface EditableProductListingConfig {
  show_buy_button: boolean;
  buy_button_label: string;
  buy_button_uppercase: boolean;
  show_add_to_cart_button: boolean;
  add_to_cart_button_label: string;
  add_to_cart_button_uppercase: boolean;
  show_price: boolean;
  show_compare_price: boolean;
  show_tags: boolean;
  card_background_color: string;
  show_border: boolean;
  border_color: string;
  border_width: number;
  show_shadow: boolean;
  shadow_direction: 'top' | 'bottom' | 'left' | 'right' | 'bottom-left' | 'bottom-right';
  shadow_intensity: 'soft' | 'medium' | 'strong';
  use_default_title_color: boolean;
  title_text_color: string;
  use_default_body_color: boolean;
  body_text_color: string;
  secondary_button_color: string;
  secondary_button_text_color: string;
  button_shape: 'sharp' | 'soft' | 'rounded' | 'pill';
  detail_description_background_color: string;
  detail_description_title_color: string;
  detail_description_text_color: string;
  detail_description_font_family: string;
  detail_strip_background_color: string;
  detail_strip_text_color: string;
  detail_strip_font_family: string;
  detail_strip_items: EditableProductDetailStripItem[];
}

interface EditableProductDetailStripItem {
  key: 'categories' | 'pages' | 'language' | 'format' | 'weight' | 'finish';
  label: string;
  icon: string;
  visible: boolean;
}

interface EditableSectionOrderItem {
  key: StorefrontSectionKey;
  label: string;
  description: string;
  visible: boolean;
}

interface InstalledFontSet {
  id: string;
  family: string;
  importUrl: string;
}

type ConfigurableProductSectionKey = 'launches' | 'featured' | 'promotions';

interface EditableProductSectionConfig {
  eyebrow: string;
  title: string;
  description: string;
  display_mode: StoreProductSectionDisplayMode;
}

const FIXED_MENU_LINKS: ReadonlyArray<EditableLink> = [
  { kind: 'home', label: 'Início', url: '#topo', visible: true },
  { kind: 'products', label: 'Produtos', url: '/produtos', visible: true },
  { kind: 'categories', label: 'Categorias', url: '__categories__', visible: true },
  { kind: 'cms_contos', label: 'Contos', url: '/contos', visible: true },
  { kind: 'cms_artigos', label: 'Artigos', url: '/artigos', visible: true },
  { kind: 'cms_blog', label: 'Blog', url: '/blog', visible: true },
  { kind: 'contact', label: 'Contato', url: '/contato', visible: true },
];

@Component({
  selector: 'app-loja-layout-page',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    StoreColorFieldComponent,
    FormInputComponent,
    FormIconSelectComponent,
    FormSelectComponent,
    FormTextareaComponent,
    ImageUploadComponent,
    ModalComponent,
    ButtonComponent,
  ],
  templateUrl: './loja-layout.page.html',
  styleUrl: './loja-layout.page.css',
})
export class LojaLayoutPage implements OnInit, OnDestroy {
  private readonly supportedProductDetailStripKeys = new Set<EditableProductDetailStripItem['key']>([
    'categories',
    'pages',
    'language',
    'format',
    'weight',
    'finish',
  ]);

  private readonly formBuilder = inject(FormBuilder);
  private readonly lojaService = inject(LojaService);
  private readonly tenantService = inject(TenantService);
  private readonly document = inject(DOCUMENT);
  private readonly priceFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  protected readonly customBlockFrame = viewChild<ElementRef<HTMLIFrameElement>>('customBlockFrame');

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);
  protected readonly resettingDraft = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly productsLoadError = signal('');
  protected readonly updatedAt = signal('');
  protected readonly draftUpdatedAt = signal('');
  protected readonly publishedAt = signal('');
  protected readonly hasUnpublishedChanges = signal(false);
  protected readonly activeTab = signal<LayoutTab>('dados');
  protected readonly activeProductTab = signal<ProductViewTab>('categorias');
  protected readonly editorNavOpen = signal(false);
  protected readonly editorContentDropdownOpen = signal(false);
  protected readonly customBlockPreviewHeight = signal(0);

  protected readonly logoPreview = signal<string | null>(null);
  protected readonly faviconPreview = signal<string | null>(null);
  protected readonly banners = signal<EditableBanner[]>([]);
  protected readonly products = signal<StoreProductListItem[]>([]);
  protected readonly menuLinks = signal<EditableLink[]>([]);
  protected readonly previewMenuLinks = computed(() => this.menuLinks().filter((item) => item.visible).slice(0, 4));
  protected readonly footerLinks = signal<EditableLink[]>([]);
  protected readonly featureHighlights = signal<EditableHighlight[]>([]);
  protected readonly institutionalSectionConfig = signal<EditableInstitutionalSectionConfig>({
    eyebrow: 'Destaques padronizados',
    title: 'Informacoes institucionais',
    description: 'Cards fixos para beneficios, seguranca, atendimento e comunicacao da loja.',
    display_mode: 'cards',
    width_mode: 'contained',
    background_color: '#0F172A',
  });
  protected readonly sectionOrder = signal<EditableSectionOrderItem[]>([]);
  protected readonly activeSectionEditor = signal<ConfigurableProductSectionKey | null>(null);
  protected readonly installFontModalOpen = signal(false);
  protected readonly manageFontsModalOpen = signal(false);
  protected readonly resetDraftModalOpen = signal(false);
  protected readonly installFontUrl = signal('');
  protected readonly installFontErrorMessage = signal('');
  protected readonly productListingConfig = signal<EditableProductListingConfig>(this.createDefaultProductListingConfig());
  protected readonly productSectionConfigs = signal<Record<ConfigurableProductSectionKey, EditableProductSectionConfig>>({
    launches: this.createDefaultProductSectionConfig('launches'),
    featured: this.createDefaultProductSectionConfig('featured'),
    promotions: this.createDefaultProductSectionConfig('promotions'),
  });

  constructor() {
    effect(() => {
      const frame = this.customBlockFrame()?.nativeElement;
      const srcDoc = this.customBlockSrcDoc();

      if (!frame) {
        return;
      }

      if (!srcDoc) {
        this.customBlockPreviewHeight.set(0);
        frame.srcdoc = '';
        frame.removeAttribute('srcdoc');
        return;
      }

      if (frame.srcdoc !== srcDoc) {
        this.customBlockPreviewHeight.set(0);
        frame.srcdoc = srcDoc;
      }
    });
  }

  private readonly logoAsset = signal<StoreImagePayload | null>(null);
  private readonly faviconAsset = signal<StoreImagePayload | null>(null);
  protected readonly secondaryButtonColorControl = this.formBuilder.nonNullable.control('#14224A');
  protected readonly secondaryButtonTextColorControl = this.formBuilder.nonNullable.control('#F8FAFC');
  protected readonly buttonShapeControl = this.formBuilder.nonNullable.control<'sharp' | 'soft' | 'rounded' | 'pill'>(
    'soft'
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    store_name: ['Aura', Validators.required],
    store_subtitle: [''],
    store_description: [''],
    store_tags: [''],
    store_in_maintenance: [false],
    maintenance_title: [''],
    maintenance_message: [''],
    primary_color: ['#7C3AED', Validators.required],
    accent_color: ['#22C55E', Validators.required],
    secondary_color: ['#A78BFA', Validators.required],
    background_color: ['#020617', Validators.required],
    header_color: ['#020617', Validators.required],
    menu_color: ['#0F172A', Validators.required],
    footer_color: ['#111827', Validators.required],
    header_text_color: ['#F8FAFC', Validators.required],
    menu_text_color: ['#E2E8F0', Validators.required],
    footer_text_color: ['#CBD5E1', Validators.required],
    primary_text_color: ['#F8FAFC', Validators.required],
    highlight_color: ['#F59E0B', Validators.required],
    discount_color: ['#EF4444', Validators.required],
    launch_badge_color: ['#1D4ED8', Validators.required],
    featured_badge_color: ['#166534', Validators.required],
    promotion_badge_color: ['#C2410C', Validators.required],
    button_color: ['#7C3AED', Validators.required],
    button_text_color: ['#F8FAFC', Validators.required],
    button_style: ['gradient' as StoreButtonStyle],
    font_family: ['Segoe UI'],
    font_secondary_family: ['Segoe UI'],
    font_menu_family: ['Segoe UI'],
    font_button_family: ['Segoe UI'],
    font_highlight_family: ['Segoe UI'],
    font_import_url: [''],
    font_embed_code: [''],
    corner_style: ['accentuated' as StoreCornerStyle],
    content_width_mode: ['contained' as StoreContentWidthMode],
    menu_background_mode: ['solid' as StoreMenuBackgroundMode],
    banner_width_mode: ['contained' as StoreBannerWidthMode],
    banner_effect_mode: ['slider' as StoreBannerEffectMode],
    banner_rotation_seconds: [5, [Validators.required, Validators.min(2), Validators.max(15)]],
    brand_display_mode: ['logo_and_name' as StoreBrandDisplayMode],
    brand_logo_size: ['small' as StoreBrandLogoSize],
    products_per_row_desktop: ['4' as '3' | '4' | '5'],
    products_per_row_mobile: ['1' as '1' | '2'],
    hero_title: ['Descubra os universos publicados pela Aura'],
    hero_subtitle: ['Uma vitrine editorial configurável, com destaque para catálogo, coleções e lançamentos.'],
    custom_block_eyebrow: [''],
    custom_block_title: [''],
    custom_block_description: [''],
    custom_block_html: [''],
    custom_block_css: [''],
    custom_block_js: [''],
    institutional_section_display_mode: ['cards' as 'cards' | 'continuous'],
    institutional_section_width_mode: ['contained' as 'contained' | 'full_width'],
    institutional_section_background_color: ['#0F172A', Validators.required],
  });
  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  protected readonly tabs = [
    { id: 'dados' as const, label: 'Dados Principais', description: 'Preencha nome, descrição, subtítulo e tags' },
    { id: 'cores' as const, label: 'Cores e Tema', description: 'Ajuste a aparência da loja, do cabeçalho e do rodapé' },
    { id: 'layout' as const, label: 'Layout', description: 'Organize a ordem dos blocos da home' },
    { id: 'menu' as const, label: 'Menu', description: 'Cadastre e ajuste os links da navegação' },
    { id: 'banners' as const, label: 'Banner Principal', description: 'Monte a sequência do carrossel' },
    { id: 'cms' as const, label: 'Conteúdos', description: 'Defina quais tipos aparecem na loja' },
    { id: 'bloco' as const, label: 'Bloco Customizado', description: 'Cole HTML, CSS e JS do cliente' },
    { id: 'produtos' as const, label: 'Produtos', description: 'Configure categorias, destaque, promoções e lançamentos' },
    { id: 'destaques' as const, label: 'Destaques Padronizados', description: 'Preencha os cards institucionais da loja' },
  ];
  protected readonly productTabs = [
    { id: 'categorias' as const, label: 'Categorias' },
    { id: 'destaques' as const, label: 'Destaques' },
    { id: 'promocoes' as const, label: 'Promoções' },
    { id: 'lancamentos' as const, label: 'Lançamentos' },
  ];
  protected readonly cornerStyleOptions: FormSelectOption[] = [
    { value: 'sharp', label: 'Reto' },
    { value: 'soft', label: 'Curva leve' },
    { value: 'accentuated', label: 'Curva acentuada' },
  ];
  protected readonly contentWidthOptions: FormSelectOption[] = [
    { value: 'contained', label: 'Conteúdo centralizado' },
    { value: 'full_width', label: 'Conteúdo em largura total' },
  ];
  protected readonly bannerWidthOptions: FormSelectOption[] = [
    { value: 'contained', label: 'Banner em coluna' },
    { value: 'full_width', label: 'Banner em largura total' },
  ];
  protected readonly bannerEffectOptions: FormSelectOption[] = [
    { value: 'none', label: 'Nenhum' },
    { value: 'slider', label: 'Slider' },
    { value: 'fade', label: 'Fade in' },
    { value: 'zoom', label: 'Zoom' },
  ];
  protected readonly brandDisplayOptions: FormSelectOption[] = [
    { value: 'logo_only', label: 'Somente logo' },
    { value: 'logo_and_name', label: 'Logo e nome da loja' },
  ];
  protected readonly brandLogoSizeOptions: FormSelectOption[] = [
    { value: 'small', label: 'Pequeno' },
    { value: 'medium', label: 'Médio' },
    { value: 'large', label: 'Grande' },
  ];
  protected readonly menuBackgroundOptions: FormSelectOption[] = [
    { value: 'solid', label: 'Com fundo' },
    { value: 'transparent', label: 'Sem fundo' },
  ];
  protected readonly buttonStyleOptions: FormSelectOption[] = [
    { value: 'gradient', label: 'Degradê' },
    { value: 'solid', label: 'Sólido' },
  ];
  protected readonly productsPerRowDesktopFullWidthOptions: FormSelectOption[] = [
    { value: '3', label: '3 produtos por linha' },
    { value: '4', label: '4 produtos por linha' },
    { value: '5', label: '5 produtos por linha' },
  ];
  protected readonly productsPerRowDesktopContainedOptions: FormSelectOption[] = [
    { value: '3', label: '3 produtos por linha' },
    { value: '4', label: '4 produtos por linha' },
  ];
  protected readonly productsPerRowMobileOptions: FormSelectOption[] = [
    { value: '1', label: '1 produto por linha' },
    { value: '2', label: '2 produtos por linha' },
  ];
  protected readonly productSectionDisplayModeOptions: FormSelectOption[] = [
    { value: 'wrap', label: 'Quebra de linha' },
    { value: 'horizontal_scroll', label: 'Rolagem horizontal' },
  ];
  protected readonly featureHighlightIconOptions: FormSelectOption[] = [
    { value: 'shield', label: 'Escudo / Seguranca' },
    { value: 'truck', label: 'Entrega / Frete' },
    { value: 'headset', label: 'Atendimento' },
    { value: 'credit-card', label: 'Cartao / Pagamento' },
    { value: 'badge-percent', label: 'Desconto' },
    { value: 'tag', label: 'Oferta' },
    { value: 'money-bill-wave', label: 'Dinheiro' },
    { value: 'pix', label: 'PIX' },
    { value: 'wallet', label: 'Carteira' },
    { value: 'receipt', label: 'Comprovante' },
    { value: 'box', label: 'Produto' },
    { value: 'boxes-stacked', label: 'Estoque' },
    { value: 'gift', label: 'Presente' },
    { value: 'star', label: 'Destaque' },
    { value: 'medal', label: 'Qualidade' },
    { value: 'rotate-left', label: 'Troca / Devolucao' },
    { value: 'lock', label: 'Privacidade' },
    { value: 'check-circle', label: 'Garantia' },
    { value: 'store', label: 'Loja oficial' },
    { value: 'clock', label: 'Agilidade' },
  ];
  protected readonly featureHighlightIconSelectOptions: FormIconSelectOption[] = this.featureHighlightIconOptions.map((option) => ({
    value: option.value,
    label: option.label,
    iconClass: resolveFeatureHighlightIconClass(option.value),
  }));
  protected readonly productDetailStripIconOptions: FormIconSelectOption[] = [
    { value: 'tags', label: 'Categorias', iconClass: 'fa-solid fa-tags' },
    { value: 'book-open', label: 'Paginas', iconClass: 'fa-solid fa-book-open' },
    { value: 'language', label: 'Idioma', iconClass: 'fa-solid fa-language' },
    { value: 'ruler-combined', label: 'Formato do livro', iconClass: 'fa-solid fa-ruler-combined' },
    { value: 'weight-hanging', label: 'Peso', iconClass: 'fa-solid fa-weight-hanging' },
    { value: 'book', label: 'Acabamento', iconClass: 'fa-solid fa-book' },
    { value: 'shapes', label: 'Estrutura', iconClass: 'fa-solid fa-shapes' },
    { value: 'layer-group', label: 'Faixa', iconClass: 'fa-solid fa-layer-group' },
  ];
  protected readonly featureHighlightTextAlignOptions: FormSelectOption[] = [
    { value: 'left', label: 'Esquerda' },
    { value: 'center', label: 'Centro' },
    { value: 'right', label: 'Direita' },
  ];
  protected readonly featureHighlightIconSizeOptions: FormSelectOption[] = [
    { value: 'small', label: 'Pequeno' },
    { value: 'medium', label: 'Medio' },
    { value: 'large', label: 'Grande' },
  ];
  protected readonly institutionalSectionDisplayModeOptions: FormSelectOption[] = [
    { value: 'cards', label: 'Blocos separados' },
    { value: 'continuous', label: 'Faixa continua' },
  ];
  protected readonly institutionalSectionWidthModeOptions: FormSelectOption[] = [
    { value: 'contained', label: 'Conteudo centralizado' },
    { value: 'full_width', label: 'Largura total' },
  ];
  protected readonly productListingShadowDirectionOptions: FormSelectOption[] = [
    { value: 'bottom', label: 'Para baixo' },
    { value: 'top', label: 'Para cima' },
    { value: 'left', label: 'Para esquerda' },
    { value: 'right', label: 'Para direita' },
    { value: 'bottom-left', label: 'Diagonal esquerda' },
    { value: 'bottom-right', label: 'Diagonal direita' },
  ];
  protected readonly productListingShadowIntensityOptions: FormSelectOption[] = [
    { value: 'soft', label: 'Suave' },
    { value: 'medium', label: 'Media' },
    { value: 'strong', label: 'Forte' },
  ];
  protected readonly productListingButtonShapeOptions: FormSelectOption[] = [
    { value: 'sharp', label: 'Reto' },
    { value: 'soft', label: 'Curva leve' },
    { value: 'rounded', label: 'Curva forte' },
    { value: 'pill', label: 'Pill' },
  ];
  protected readonly bannerContentHorizontalOptions: FormSelectOption[] = [
    { value: 'left', label: 'Esquerda' },
    { value: 'center', label: 'Centro' },
    { value: 'right', label: 'Direita' },
  ];
  protected readonly bannerContentVerticalOptions: FormSelectOption[] = [
    { value: 'top', label: 'Topo' },
    { value: 'center', label: 'Centro' },
    { value: 'bottom', label: 'Base' },
  ];
  protected readonly bannerLinkModeOptions: FormSelectOption[] = [
    { value: 'none', label: 'Sem link' },
    { value: 'banner', label: 'Link no banner inteiro' },
    { value: 'button', label: 'Botão com link' },
  ];
  protected readonly productsPerRowDesktopOptions = computed<FormSelectOption[]>(() =>
    this.form.controls.content_width_mode.value === 'full_width'
      ? this.productsPerRowDesktopFullWidthOptions
      : this.productsPerRowDesktopContainedOptions
  );
  protected readonly productsPerRowDesktopHelperText = computed(() =>
    this.form.controls.content_width_mode.value === 'full_width'
      ? 'Com largura total, o desktop pode mostrar de 3 a 5 produtos por linha.'
      : 'Com conteúdo centralizado, o desktop pode mostrar de 3 a 4 produtos por linha.'
  );
  protected readonly bannerRotationHelperText =
    'Recomendado: entre 4 e 6 segundos para manter leitura confortável sem acelerar demais a leitura.';
  protected readonly googleFontsFamilyExample = 'Montserrat';
  protected readonly googleFontsImportExample =
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
  protected readonly defaultFontFamilies = [
    'Segoe UI',
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Poppins',
    'Montserrat',
    'Nunito Sans',
    'Arial',
    'Helvetica Neue',
  ];
  protected readonly installedFontSets = signal<InstalledFontSet[]>([]);
  protected readonly detectedEmbedFamilies = computed(() => this.installedFontSets().map((item) => item.family));
  protected readonly detectedFontOptions = computed<FormSelectOption[]>(() => {
    const detectedFamilies = this.detectedEmbedFamilies();
    const selectedFamilies = [
      this.form.controls.font_family.value,
      this.form.controls.font_menu_family.value,
      this.form.controls.font_button_family.value,
      this.form.controls.font_highlight_family.value,
      this.form.controls.font_secondary_family.value,
    ]
      .map((family) => family.trim())
      .filter((family) => family.length > 0);
    const options = Array.from(new Set([...this.defaultFontFamilies, ...detectedFamilies, ...selectedFamilies]));
    const importedFamilies = new Set(detectedFamilies);

    return (options.length > 0 ? options : this.defaultFontFamilies).map((family) => ({
      value: family,
      label: family,
      imported: importedFamilies.has(family),
    }));
  });
  protected readonly themeFontOptions = computed<FormSelectOption[]>(() => {
    const themeFamilies = [
      this.form.controls.font_family.value,
      this.form.controls.font_secondary_family.value,
      this.form.controls.font_menu_family.value,
      this.form.controls.font_button_family.value,
      this.form.controls.font_highlight_family.value,
      this.productListingConfig().detail_description_font_family,
      this.productListingConfig().detail_strip_font_family,
    ]
      .map((family) => (family || '').trim())
      .filter((family) => family.length > 0);

    const importedFamilies = new Set(this.detectedEmbedFamilies());
    const mergedOptions: FormSelectOption[] = [
      ...this.detectedFontOptions(),
      ...themeFamilies.map((family) => ({
        value: family,
        label: family,
        imported: importedFamilies.has(family),
      })),
    ];
    const options = Array.from(new Map(mergedOptions.map((option) => [option.value, option])).values());

    return options.map((option) => ({
      ...option,
      imported: option.imported ?? importedFamilies.has(option.value),
    }));
  });
  protected readonly categoryGroups = computed(() => {
    const groups = new Map<string, StoreProductListItem[]>();

    for (const item of this.products()) {
      const categories = item.categorias?.length ? item.categorias : ['Sem categoria'];
      for (const category of categories) {
        const normalizedCategory = category.trim() || 'Sem categoria';
        const current = groups.get(normalizedCategory) ?? [];
        current.push(item);
        groups.set(normalizedCategory, current);
      }
    }

    return Array.from(groups.entries())
      .map(([name, items]) => ({
        name,
        items: items.sort((left, right) => left.ordem - right.ordem || left.nome_exibicao.localeCompare(right.nome_exibicao)),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  });
  protected readonly featuredProducts = computed(() =>
    this.products()
      .filter((item) => item.destaque)
      .sort((left, right) => left.ordem - right.ordem || left.nome_exibicao.localeCompare(right.nome_exibicao))
  );
  protected readonly promotionProducts = computed(() =>
    this.products()
      .filter((item) => item.em_promocao)
      .sort((left, right) => left.ordem - right.ordem || left.nome_exibicao.localeCompare(right.nome_exibicao))
  );
  protected readonly launchProducts = computed(() =>
    this.products()
      .filter((item) => item.lancamento)
      .sort((left, right) => left.ordem - right.ordem || left.nome_exibicao.localeCompare(right.nome_exibicao))
  );
  protected readonly leadBanner = computed(() => {
    const activeBanner = this.banners().find((item) => item.active && (item.desktopPreview || item.mobilePreview));
    return activeBanner ?? this.banners()[0] ?? null;
  });
  protected readonly activeBannerCount = computed(() => this.banners().filter((item) => item.active).length);
  protected readonly customBlockHeaderEnabled = computed(() => {
    const value = this.formValue();
    const customBlockEyebrow = value.custom_block_eyebrow ?? '';
    const customBlockTitle = value.custom_block_title ?? '';
    const customBlockDescription = value.custom_block_description ?? '';
    return (
      !!customBlockEyebrow.trim() ||
      !!customBlockTitle.trim() ||
      !!customBlockDescription.trim()
    );
  });
  protected readonly customBlockEnabled = computed(() => {
    const value = this.formValue();
    const customBlockHtml = value.custom_block_html ?? '';
    const customBlockCss = value.custom_block_css ?? '';
    const customBlockJs = value.custom_block_js ?? '';
    return (
      this.customBlockHeaderEnabled() ||
      !!customBlockHtml.trim() ||
      !!customBlockCss.trim() ||
      !!customBlockJs.trim()
    );
  });
  protected readonly customBlockSrcDoc = computed<string | null>(() => {
    const value = this.formValue();
    const html = (value.custom_block_html ?? '').trim();
    const css = (value.custom_block_css ?? '').trim();
    const js = (value.custom_block_js ?? '').trim();
    const fontFamily = value.font_family ?? 'Segoe UI';

    if (!html && !css && !js) {
      return null;
    }

    const themeStyles = `
      :root {
        color-scheme: dark;
        --store-primary: ${value.primary_color || '#7C3AED'};
        --store-accent: ${value.accent_color || '#22C55E'};
        --store-secondary: ${value.secondary_color || '#A78BFA'};
        --store-bg: ${value.background_color || '#020617'};
        --store-text: ${value.primary_text_color || '#F8FAFC'};
        --store-highlight: ${value.highlight_color || '#F59E0B'};
        --store-button: ${value.button_color || '#7C3AED'};
        --store-button-text: ${value.button_text_color || '#F8FAFC'};
        --store-font-site: ${this.toCssFontStack(fontFamily)};
      }

      html,
      body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: transparent !important;
        color: var(--store-text);
        font-family: var(--store-font-site);
      }

      * {
        box-sizing: border-box;
      }

      body {
        overflow: hidden;
      }

      #custom-block-root {
        display: block;
        width: 100%;
        min-height: 100%;
        background: transparent !important;
        color: inherit;
        font-family: inherit;
      }

      #custom-block-root,
      #custom-block-root :where(div, section, article, aside, main, header, footer, nav, p, span, small, strong, em, b, i, ul, ol, li, label, h1, h2, h3, h4, h5, h6) {
        color: inherit;
      }

      #custom-block-root :where(button, input, select, textarea) {
        font: inherit;
      }

      #custom-block-root :where(img, video, canvas, svg, iframe) {
        max-width: 100%;
      }

      #custom-block-root a {
        color: inherit;
      }
    `;

    const resizeScript = `
      (function () {
        const sendHeight = function () {
          const doc = document.documentElement;
          const body = document.body;
          const height = Math.max(
            body ? body.scrollHeight : 0,
            body ? body.offsetHeight : 0,
            doc ? doc.scrollHeight : 0,
            doc ? doc.offsetHeight : 0
          );
          parent.postMessage({ type: 'store-custom-block-height', height: height }, '*');
        };

        window.addEventListener('load', sendHeight);
        window.addEventListener('resize', sendHeight);

        if ('ResizeObserver' in window) {
          const observer = new ResizeObserver(sendHeight);
          observer.observe(document.documentElement);
          if (document.body) {
            observer.observe(document.body);
          }
        }

        requestAnimationFrame(sendHeight);
        setTimeout(sendHeight, 120);
      })();
    `;

    const srcDoc = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    ${themeStyles}
    ${css}
  </style>
</head>
<body>
  <div id="custom-block-root">${html}</div>
  <script>
    ${resizeScript}
    ${js}
  <\/script>
</body>
</html>`;

    return srcDoc;
  });
  protected readonly orderedSectionLabels = computed(() =>
    this.sectionOrder()
      .filter((item) => item.visible)
      .map((item) => item.label)
  );
  protected readonly visibleSectionCount = computed(() => this.sectionOrder().filter((item) => item.visible).length);
  protected readonly previewDesktopProductsPerRow = computed(() => this.form.controls.products_per_row_desktop.value);
  protected readonly previewMobileProductsPerRow = computed(() => this.form.controls.products_per_row_mobile.value);
  protected readonly previewDesktopProductPlaceholders = computed(() =>
    Array.from({ length: Number(this.previewDesktopProductsPerRow()) || 4 }, (_, index) => index)
  );
  protected readonly previewMobileProductPlaceholders = computed(() =>
    Array.from({ length: Number(this.previewMobileProductsPerRow()) || 1 }, (_, index) => index)
  );
  protected readonly tenantDomain = signal('localhost');
  protected readonly previewUrl = computed(() => {
    const hostname = globalThis.location?.hostname || 'localhost';
    const domain = (this.tenantDomain() || 'localhost').trim() || 'localhost';
    return `http://${hostname}:4202/preview/${domain}`;
  });
  protected readonly previewFontFamily = computed(() => this.toCssFontStack(this.form.controls.font_family.value));
  protected readonly previewMenuFontFamily = computed(() =>
    this.toCssFontStack(this.form.controls.font_menu_family.value || this.form.controls.font_family.value)
  );
  protected readonly previewButtonFontFamily = computed(() =>
    this.toCssFontStack(this.form.controls.font_button_family.value || this.form.controls.font_family.value)
  );
  protected readonly previewHighlightFontFamily = computed(() =>
    this.toCssFontStack(this.form.controls.font_highlight_family.value || this.form.controls.font_family.value)
  );

  async ngOnInit(): Promise<void> {
    globalThis.window?.addEventListener('message', this.handleCustomBlockFrameMessage);
    this.form.controls.content_width_mode.valueChanges
      .pipe(startWith(this.form.controls.content_width_mode.value))
      .subscribe((mode) => {
        this.syncDesktopProductsPerRow(mode);
      });

    this.form.controls.font_import_url.valueChanges
      .pipe(startWith(this.form.controls.font_import_url.value))
      .subscribe(() => {
        this.refreshInstalledFontSets();
        this.syncFontConfiguration();
        this.syncPreviewFontAsset();
      });

    this.secondaryButtonColorControl.valueChanges
      .pipe(startWith(this.secondaryButtonColorControl.value))
      .subscribe((value) => {
        this.productListingConfig.update((current) => ({
          ...current,
          secondary_button_color: value || '#14224A',
        }));
      });

    this.secondaryButtonTextColorControl.valueChanges
      .pipe(startWith(this.secondaryButtonTextColorControl.value))
      .subscribe((value) => {
        this.productListingConfig.update((current) => ({
          ...current,
          secondary_button_text_color: value || '#F8FAFC',
        }));
      });

    this.buttonShapeControl.valueChanges
      .pipe(startWith(this.buttonShapeControl.value))
      .subscribe((value) => {
        this.productListingConfig.update((current) => ({
          ...current,
          button_shape: value || 'soft',
        }));
      });

    await this.loadTenantDomain();
    await this.load();
  }

  private async loadTenantDomain(): Promise<void> {
    try {
      const response = await this.tenantService.getDomain();
      const domain = (response?.dominio || '').trim();
      if (domain) {
        this.tenantDomain.set(domain);
      }
    } catch {
      return;
    }
  }

  ngOnDestroy(): void {
    globalThis.window?.removeEventListener('message', this.handleCustomBlockFrameMessage);
  }

  protected hasFieldError(field: LayoutField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected getFieldError(field: LayoutField): string {
    const control = this.form.controls[field];
    if (!control.invalid || (!control.touched && !this.submitted())) {
      return '';
    }

    if (control.errors?.['required']) {
      switch (field) {
        case 'store_name':
          return 'Informe o nome da loja.';
        case 'banner_rotation_seconds':
          return 'Informe por quantos segundos cada banner deve ficar visível.';
        default:
          return 'Informe uma cor válida para este campo.';
      }
    }

    if (field === 'banner_rotation_seconds') {
      if (control.errors?.['min']) {
        return 'Use pelo menos 2 segundos por banner.';
      }
      if (control.errors?.['max']) {
        return 'Use no máximo 15 segundos por banner.';
      }
    }

    return '';
  }

  protected async handleLogoSelected(event: Event): Promise<void> {
    await this.processImageSelection(event, processStoreLogo, this.logoAsset, this.logoPreview);
  }

  protected async handleFaviconSelected(event: Event): Promise<void> {
    await this.processImageSelection(event, processStoreFavicon, this.faviconAsset, this.faviconPreview);
  }

  protected setActiveSection(tab: LayoutTab): void {
    this.activeTab.set(tab);
    this.editorNavOpen.set(false);
    this.editorContentDropdownOpen.set(false);
  }

  protected setActiveProductSection(tab: ProductViewTab): void {
    this.activeProductTab.set(tab);
  }

  protected toggleEditorNav(): void {
    this.editorNavOpen.update((value) => !value);
  }

  protected toggleEditorContentDropdown(): void {
    this.editorContentDropdownOpen.update((value) => !value);
  }

  protected isContentGroupActive(): boolean {
    const tab = this.activeTab();
    return tab === 'bloco' || tab === 'destaques';
  }

  protected addBanner(): void {
    this.banners.update((items) => [...items, this.createEmptyBanner(items.length)]);
  }

  protected addMenuLink(): void {
    this.menuLinks.update((items) => [...items, this.createEmptyLink()]);
  }

  protected addFooterLink(): void {
    this.footerLinks.update((items) => [...items, this.createEmptyLink()]);
  }

  protected addFeatureHighlight(): void {
    this.featureHighlights.update((items) => [...items, this.createEmptyHighlight()]);
  }

  protected dropSection(event: CdkDragDrop<EditableSectionOrderItem[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.sectionOrder.update((items) => {
      const nextItems = [...items];
      moveItemInArray(nextItems, event.previousIndex, event.currentIndex);
      return nextItems;
    });
  }

  protected moveSection(index: number, direction: -1 | 1): void {
    this.sectionOrder.update((items) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
      }

      const nextItems = [...items];
      [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
      return nextItems;
    });
  }

  protected updateSectionVisibility(index: number, visible: boolean): void {
    this.sectionOrder.update((items) =>
      items.map((item, currentIndex) => (currentIndex === index ? { ...item, visible } : item))
    );
  }

  protected isConfigurableProductSection(key: StorefrontSectionKey): key is ConfigurableProductSectionKey {
    return key === 'launches' || key === 'featured' || key === 'promotions';
  }

  protected toggleSectionEditor(key: ConfigurableProductSectionKey): void {
    this.activeSectionEditor.update((current) => (current === key ? null : key));
  }

  protected isSectionEditorOpen(key: StorefrontSectionKey): boolean {
    return this.isConfigurableProductSection(key) && this.activeSectionEditor() === key;
  }

  protected sectionCardTitle(item: EditableSectionOrderItem): string {
    if (!this.isConfigurableProductSection(item.key)) {
      return item.label;
    }

    return item.label;
  }

  protected sectionCardDescription(item: EditableSectionOrderItem): string {
    if (!this.isConfigurableProductSection(item.key)) {
      return item.description;
    }

    const config = this.productSectionConfigs()[item.key];
    return config.description || item.description;
  }

  protected editableSectionConfig(key: ConfigurableProductSectionKey): EditableProductSectionConfig {
    return this.productSectionConfigs()[key];
  }

  protected updateProductSectionField(
    key: ConfigurableProductSectionKey,
    field: keyof EditableProductSectionConfig,
    event: Event
  ): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    const value = target?.value ?? '';
    this.productSectionConfigs.update((items) => ({
      ...items,
      [key]: {
        ...items[key],
        [field]: value,
      },
    }));
  }

  protected removeBanner(index: number): void {
    this.banners.update((items) =>
      items
        .filter((_, currentIndex) => currentIndex !== index)
        .map((item, order) => ({ ...item, order }))
    );
  }

  protected removeMenuLink(index: number): void {
    this.menuLinks.update((items) =>
      items.filter((item, currentIndex) => currentIndex !== index || item.kind !== 'custom')
    );
  }

  protected moveMenuLink(index: number, direction: -1 | 1): void {
    this.menuLinks.update((items) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
      }

      const nextItems = [...items];
      [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
      return nextItems;
    });
  }

  protected updateMenuLinkVisibility(index: number, visible: boolean): void {
    this.menuLinks.update((items) =>
      items.map((item, currentIndex) => (currentIndex === index ? { ...item, visible } : item))
    );
  }

  protected isFixedMenuLink(item: EditableLink): boolean {
    return item.kind !== 'custom';
  }

  protected menuLinkDescription(item: EditableLink): string {
    switch (item.kind) {
      case 'home':
        return 'Leva para o topo da home da loja.';
      case 'products':
        return 'Abre a listagem completa de produtos.';
      case 'categories':
        return 'Mostra o acesso de categorias do catalogo.';
      case 'cms_contos':
        return 'Abre a listagem de contos na vitrine.';
      case 'cms_artigos':
        return 'Abre a listagem de artigos na vitrine.';
      case 'cms_blog':
        return 'Abre a listagem do blog na vitrine.';
      case 'contact':
        return 'Leva o cliente para a area de contato no rodape.';
      default:
        return item.url.trim() || 'Defina uma URL ou ancora para o novo link.';
    }
  }

  protected removeFooterLink(index: number): void {
    this.footerLinks.update((items) => items.filter((_, currentIndex) => currentIndex !== index));
  }

  protected removeFeatureHighlight(index: number): void {
    this.featureHighlights.update((items) => items.filter((_, currentIndex) => currentIndex !== index));
  }

  protected moveBanner(index: number, direction: -1 | 1): void {
    this.banners.update((items) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
      }

      const nextItems = [...items];
      [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
      return nextItems.map((item, order) => ({ ...item, order }));
    });
  }

  protected updateColor(field: Extract<
    LayoutField,
    | 'primary_color'
    | 'accent_color'
    | 'secondary_color'
    | 'background_color'
    | 'header_color'
    | 'menu_color'
    | 'footer_color'
    | 'header_text_color'
    | 'menu_text_color'
    | 'footer_text_color'
    | 'primary_text_color'
    | 'highlight_color'
    | 'discount_color'
    | 'launch_badge_color'
    | 'featured_badge_color'
    | 'promotion_badge_color'
    | 'button_color'
    | 'button_text_color'
  >, event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value?.trim();
    if (!value) {
      return;
    }

    this.form.controls[field].setValue(value.toUpperCase());
  }

  protected updateBannerField(
    index: number,
    field: 'title' | 'subtitle' | 'link' | 'content_position_x' | 'content_position_y' | 'button_label' | 'link_mode',
    event: Event
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? '';
    this.banners.update((items) =>
      items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  protected updateBannerActive(index: number, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.banners.update((items) =>
      items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, active: checked } : item
      )
    );
  }

  protected updateBannerUseButton(index: number, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.banners.update((items) =>
      items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, use_button: checked } : item
      )
    );
  }

  protected updateBannerShowContent(index: number, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.banners.update((items) =>
      items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, show_content: checked } : item
      )
    );
  }

  protected updateMenuLinkField(index: number, field: keyof EditableLink, event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.menuLinks.update((items) =>
      items.map((item, currentIndex) =>
        currentIndex === index && item.kind === 'custom' ? { ...item, [field]: value } : item
      )
    );
  }

  protected updateFooterLinkField(index: number, field: keyof EditableLink, event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.footerLinks.update((items) =>
      items.map((item, currentIndex) => (currentIndex === index ? { ...item, [field]: value } : item))
    );
  }

  protected updateFeatureHighlightField(
    index: number,
    field: keyof EditableHighlight,
    event: Event
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? '';
    this.featureHighlights.update((items) =>
      items.map((item, currentIndex) => (currentIndex === index ? { ...item, [field]: value } : item))
    );
  }

  protected updateInstitutionalSectionField(
    field: keyof EditableInstitutionalSectionConfig,
    event: Event
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? '';
    this.institutionalSectionConfig.update((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === 'display_mode') {
      this.form.controls.institutional_section_display_mode.setValue(value as 'cards' | 'continuous');
    }

    if (field === 'width_mode') {
      this.form.controls.institutional_section_width_mode.setValue(value as 'contained' | 'full_width');
    }

    if (field === 'background_color') {
      this.form.controls.institutional_section_background_color.setValue(value);
    }
  }

  protected effectiveInstitutionalSectionWidthMode(): 'contained' | 'full_width' {
    return this.isBannerWidthLockedToLayout()
      ? 'full_width'
      : this.form.controls.institutional_section_width_mode.value;
  }

  protected featureHighlightIconClass(icon: string | undefined): string {
    const normalized = this.normalizeFeatureHighlightIcon(icon);

    switch (normalized) {
      case 'badge-percent':
        return 'fa-solid fa-percent';
      case 'check-circle':
        return 'fa-solid fa-circle-check';
      case 'pix':
        return 'fa-brands fa-pix';
      default:
        return `fa-solid fa-${normalized}`;
    }
  }

  protected selectFeatureHighlightIcon(index: number, value: string): void {
    const normalizedValue = this.normalizeFeatureHighlightIcon(value);
    this.featureHighlights.update((items) =>
      items.map((item, currentIndex) =>
        currentIndex === index ? { ...item, icon: normalizedValue } : item
      )
    );
  }

  protected updateProductListingBooleanField(field: keyof EditableProductListingConfig, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.productListingConfig.update((current) => ({
      ...current,
      [field]: checked,
    }));
  }

  protected optionalColorInputValue(value: string, fallback = '#000000'): string {
    const trimmed = value.trim();
    return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed : fallback;
  }

  protected hasHexColor(value: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
  }

  protected updateProductListingField(
    field: keyof EditableProductListingConfig,
    event: Event
  ): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)?.value ?? '';
    if (field === 'secondary_button_color') {
      this.secondaryButtonColorControl.setValue(value || '#14224A', { emitEvent: false });
    }
    if (field === 'secondary_button_text_color') {
      this.secondaryButtonTextColorControl.setValue(value || '#F8FAFC', { emitEvent: false });
    }
    this.productListingConfig.update((current) => ({
      ...current,
      [field]: field === 'border_width' ? Number(value) || 0 : value,
      ...(field === 'card_background_color' ? { border_color: value } : {}),
    }));
  }

  protected updateProductDetailStripItem(
    index: number,
    field: keyof EditableProductDetailStripItem,
    value: string | boolean
  ): void {
    this.productListingConfig.update((current) => ({
      ...current,
      detail_strip_items: current.detail_strip_items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  protected async handleBannerDesktopSelected(index: number, event: Event): Promise<void> {
    await this.processBannerImageSelection(index, event, processStoreBannerDesktop, 'desktop');
  }

  protected async handleBannerMobileSelected(index: number, event: Event): Promise<void> {
    await this.processBannerImageSelection(index, event, processStoreBannerMobile, 'mobile');
  }

  protected isBannerWidthLockedToLayout(): boolean {
    return this.form.controls.content_width_mode.value === 'full_width';
  }

  protected effectiveBannerWidthMode(): StoreBannerWidthMode {
    return this.isBannerWidthLockedToLayout() ? 'full_width' : this.form.controls.banner_width_mode.value;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const invalidSectionKey = this.firstInvalidProductSectionTitle();
    if (invalidSectionKey) {
      this.activeTab.set('layout');
      this.activeSectionEditor.set(invalidSectionKey);
      this.errorMessage.set('O título das vitrines de lançamentos, destaque e promoções é obrigatório.');
      return;
    }

    this.saving.set(true);

    try {
      const value = this.form.getRawValue();
      const banners = this.banners().map((item, order) => this.toBannerPayload(item, order));
      const firstBanner = banners.find((item) => item.active) ?? banners[0] ?? null;
      const cmsConfig = this.deriveCmsConfigFromMenuLinks(this.menuLinks());

      await this.lojaService.updateConfig({
        store_name: value.store_name.trim(),
        store_subtitle: value.store_subtitle.trim(),
        store_description: value.store_description.trim(),
        store_tags: value.store_tags.trim(),
        cms_config: cmsConfig,
        store_in_maintenance: value.store_in_maintenance,
        maintenance_title: value.maintenance_title.trim(),
        maintenance_message: value.maintenance_message.trim(),
        primary_color: value.primary_color,
        accent_color: value.accent_color,
        secondary_color: value.secondary_color,
        background_color: value.background_color,
        header_color: value.header_color,
        menu_color: value.menu_color,
        footer_color: value.footer_color,
        header_text_color: value.header_text_color,
        menu_text_color: value.menu_text_color,
        footer_text_color: value.footer_text_color,
        primary_text_color: value.primary_text_color,
        highlight_color: value.highlight_color,
        discount_color: value.discount_color,
        launch_badge_color: value.launch_badge_color,
        featured_badge_color: value.featured_badge_color,
        promotion_badge_color: value.promotion_badge_color,
        button_color: value.button_color,
        button_text_color: value.button_text_color,
        button_style: value.button_style,
        font_family: value.font_family.trim(),
        font_secondary_family: value.font_menu_family.trim(),
        font_menu_family: value.font_menu_family.trim(),
        font_button_family: value.font_button_family.trim(),
        font_highlight_family: value.font_highlight_family.trim(),
        font_import_url: value.font_import_url.trim(),
        font_embed_code: value.font_embed_code.trim(),
        corner_style: value.corner_style,
        content_width_mode: value.content_width_mode,
        menu_background_mode: value.menu_background_mode,
        banner_width_mode: this.effectiveBannerWidthMode(),
        banner_effect_mode: value.banner_effect_mode,
        banner_rotation_seconds: Number(value.banner_rotation_seconds),
        brand_display_mode: value.brand_display_mode,
        brand_logo_size: value.brand_logo_size,
        products_per_row_desktop: Number(value.products_per_row_desktop) as StoreProductsPerRowDesktop,
        products_per_row_mobile: Number(value.products_per_row_mobile) as StoreProductsPerRowMobile,
        hero_title: value.hero_title.trim(),
        hero_subtitle: value.hero_subtitle.trim(),
        logo: this.logoAsset(),
        favicon: this.faviconAsset(),
        banner_desktop: firstBanner?.desktop ?? null,
        banner_mobile: firstBanner?.mobile ?? null,
        banners,
        menu_links: this.menuLinks().map((item) => this.toNavigationLinkPayload(item)),
        section_order: this.sectionOrder().map((item) => item.key),
        visible_sections: this.sectionOrder()
          .filter((item) => item.visible)
          .map((item) => item.key),
        custom_block_eyebrow: value.custom_block_eyebrow.trim(),
        custom_block_title: value.custom_block_title.trim(),
        custom_block_description: value.custom_block_description.trim(),
        custom_block_html: value.custom_block_html,
        custom_block_css: value.custom_block_css,
        custom_block_js: value.custom_block_js,
        feature_highlights: this.featureHighlights().map((item) => this.toFeatureHighlightPayload(item)),
        institutional_section: this.toInstitutionalSectionPayload(),
        product_listing_config: this.toProductListingConfigPayload(),
        footer_links: this.footerLinks().map((item) => this.toNavigationLinkPayload(item)),
        launches_section: this.toProductSectionPayload('launches'),
        featured_section: this.toProductSectionPayload('featured'),
        promotions_section: this.toProductSectionPayload('promotions'),
      });

      this.successMessage.set('Rascunho da loja salvo com sucesso.');
      await this.load();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async publishDraft(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.publishing.set(true);

    try {
      await this.lojaService.publishConfig();
      this.successMessage.set('Loja publicada com sucesso.');
      await this.load();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.publishing.set(false);
    }
  }

  protected openResetDraftModal(): void {
    if (!this.hasUnpublishedChanges()) {
      return;
    }
    this.resetDraftModalOpen.set(true);
  }

  protected closeResetDraftModal(): void {
    this.resetDraftModalOpen.set(false);
  }

  protected async confirmResetDraft(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.resettingDraft.set(true);

    try {
      await this.lojaService.resetDraftConfig();
      this.successMessage.set('Rascunho restaurado com sucesso.');
      this.resetDraftModalOpen.set(false);
      await this.load();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.resettingDraft.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.productsLoadError.set('');

    try {
      const config = await this.lojaService.getConfig();
      // #region debug-point C:after-get-config
      fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'menu-bg-persist', runId: 'pre-fix', hypothesisId: 'C', location: 'loja-layout.page.ts:load', msg: '[DEBUG] admin received config from GET /loja/configuracao', data: { menu_background_mode: config.menu_background_mode, content_width_mode: config.content_width_mode, updated_at: config.updated_at, draft_updated_at: config.draft_updated_at }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      this.form.reset({
        store_name: config.store_name || 'Aura',
        store_subtitle: config.store_subtitle || '',
        store_description: config.store_description || '',
        store_tags: config.store_tags || '',
        store_in_maintenance: config.store_in_maintenance || false,
        maintenance_title: config.maintenance_title || '',
        maintenance_message: config.maintenance_message || '',
        primary_color: config.primary_color || '#7C3AED',
        accent_color: config.accent_color || '#22C55E',
        secondary_color: config.secondary_color || '#A78BFA',
        background_color: config.background_color || '#020617',
        header_color: config.header_color || '#020617',
        menu_color: config.menu_color || '#0F172A',
        footer_color: config.footer_color || '#111827',
        header_text_color: config.header_text_color || '#F8FAFC',
        menu_text_color: config.menu_text_color || '#E2E8F0',
        footer_text_color: config.footer_text_color || '#CBD5E1',
        primary_text_color: config.primary_text_color || '#F8FAFC',
        highlight_color: config.highlight_color || '#F59E0B',
        discount_color: config.discount_color || '#EF4444',
        launch_badge_color: config.launch_badge_color || '#1D4ED8',
        featured_badge_color: config.featured_badge_color || '#166534',
        promotion_badge_color: config.promotion_badge_color || '#C2410C',
        button_color: config.button_color || '#7C3AED',
        button_text_color: config.button_text_color || '#F8FAFC',
        button_style: config.button_style || 'gradient',
        font_family: config.font_family || 'Segoe UI',
        font_secondary_family: config.font_menu_family || config.font_secondary_family || config.font_family || 'Segoe UI',
        font_menu_family: config.font_menu_family || config.font_secondary_family || config.font_family || 'Segoe UI',
        font_button_family: config.font_button_family || config.font_family || 'Segoe UI',
        font_highlight_family:
          config.font_highlight_family || config.font_secondary_family || config.font_family || 'Segoe UI',
        font_import_url: config.font_import_url || '',
        font_embed_code: config.font_embed_code || config.font_import_url || '',
        corner_style: config.corner_style || 'accentuated',
        content_width_mode: config.content_width_mode || 'contained',
        menu_background_mode: config.menu_background_mode || 'solid',
        banner_width_mode: config.banner_width_mode || 'contained',
        banner_effect_mode: config.banner_effect_mode || 'slider',
        banner_rotation_seconds: config.banner_rotation_seconds || 5,
        brand_display_mode: config.brand_display_mode || 'logo_and_name',
        brand_logo_size: config.brand_logo_size || 'small',
        products_per_row_desktop: String(config.products_per_row_desktop || 4) as '3' | '4' | '5',
        products_per_row_mobile: String(config.products_per_row_mobile || 1) as '1' | '2',
        hero_title: config.hero_title || '',
        hero_subtitle: config.hero_subtitle || '',
        custom_block_eyebrow: config.custom_block_eyebrow || '',
        custom_block_title: config.custom_block_title || '',
        custom_block_description: config.custom_block_description || '',
        custom_block_html: config.custom_block_html || '',
        custom_block_css: config.custom_block_css || '',
        custom_block_js: config.custom_block_js || '',
        institutional_section_display_mode:
          config.institutional_section?.display_mode === 'continuous' ? 'continuous' : 'cards',
        institutional_section_width_mode:
          config.institutional_section?.width_mode === 'full_width' ? 'full_width' : 'contained',
        institutional_section_background_color: config.institutional_section?.background_color || '#0F172A',
      });
      this.syncDesktopProductsPerRow(this.form.controls.content_width_mode.value);
      this.updatedAt.set(config.updated_at || '');
      this.draftUpdatedAt.set(config.draft_updated_at || config.updated_at || '');
      this.publishedAt.set(config.published_at || '');
      this.hasUnpublishedChanges.set(config.has_unpublished_changes || false);
      this.logoAsset.set(config.logo ?? null);
      this.faviconAsset.set(config.favicon ?? null);
      this.logoPreview.set(this.payloadToPreviewUrl(config.logo));
      this.faviconPreview.set(this.payloadToPreviewUrl(config.favicon));
      this.banners.set(this.mapResponseBanners(config));
      this.menuLinks.set(this.mapNavigationLinks(config.menu_links, config.cms_config));
      this.productSectionConfigs.set({
        launches: this.mapProductSectionConfig('launches', config.launches_section),
        featured: this.mapProductSectionConfig('featured', config.featured_section),
        promotions: this.mapProductSectionConfig('promotions', config.promotions_section),
      });
      this.sectionOrder.set(this.mapSectionOrder(config.section_order, config.visible_sections));
      this.footerLinks.set(this.mapFooterLinks(config.footer_links));
      this.featureHighlights.set(this.mapFeatureHighlights(config.feature_highlights));
      this.institutionalSectionConfig.set(this.mapInstitutionalSection(config.institutional_section));
      this.productListingConfig.set(this.mapProductListingConfig(config.product_listing_config));
      this.secondaryButtonColorControl.setValue(
        this.mapProductListingConfig(config.product_listing_config).secondary_button_color,
        { emitEvent: false }
      );
      this.secondaryButtonTextColorControl.setValue(
        this.mapProductListingConfig(config.product_listing_config).secondary_button_text_color,
        { emitEvent: false }
      );
      this.buttonShapeControl.setValue(this.mapProductListingConfig(config.product_listing_config).button_shape, {
        emitEvent: false,
      });
      this.refreshInstalledFontSets();
      this.syncFontConfiguration();
      this.syncPreviewFontAsset();

      try {
        this.products.set(await this.lojaService.listProducts());
      } catch (error) {
        this.products.set([]);
        this.productsLoadError.set(processApiError(error));
      }

      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.submitted.set(false);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected formatPrice(value: number): string {
    return this.priceFormatter.format(value || 0);
  }

  protected openInstallFontModal(): void {
    this.installFontUrl.set('');
    this.installFontErrorMessage.set('');
    this.installFontModalOpen.set(true);
  }

  protected closeInstallFontModal(): void {
    this.installFontModalOpen.set(false);
    this.installFontUrl.set('');
    this.installFontErrorMessage.set('');
  }

  protected openManageFontsModal(): void {
    this.manageFontsModalOpen.set(true);
  }

  protected closeManageFontsModal(): void {
    this.manageFontsModalOpen.set(false);
  }

  protected updateInstallFontUrl(event: Event): void {
    this.installFontUrl.set((event.target as HTMLInputElement).value || '');
    this.installFontErrorMessage.set('');
  }

  protected addInstalledFonts(): void {
    const importUrl = this.normalizeGoogleFontImportUrl(this.installFontUrl());

    if (!importUrl) {
      this.installFontErrorMessage.set('Informe a URL CSS do Google Fonts.');
      return;
    }

    const current = this.installedFontSets();
    const families = this.extractGoogleFontFamilies(importUrl);
    if (!families.length) {
      this.installFontErrorMessage.set('Nao foi possivel identificar nenhuma familia nessa URL CSS.');
      return;
    }

    const merged = [...current];
    const existingKeys = new Set(current.map((item) => `${item.family.toLowerCase()}|${item.importUrl}`));

    for (const family of families) {
      const key = `${family.toLowerCase()}|${importUrl}`;
      if (existingKeys.has(key)) {
        continue;
      }

      merged.push({
        id: this.createInstalledFontId(family, importUrl),
        family,
        importUrl,
      });
      existingKeys.add(key);
    }

    if (merged.length === current.length) {
      this.installFontErrorMessage.set('Todas as familias dessa URL ja estao instaladas.');
      return;
    }

    this.patchInstalledFontSets(merged);
    this.syncFontConfiguration();
    this.syncPreviewFontAsset();
    this.closeInstallFontModal();
  }

  protected removeInstalledFont(fontId: string): void {
    const remaining = this.installedFontSets().filter((item) => item.id !== fontId);
    this.patchInstalledFontSets(remaining);
    this.reconcileSelectedFontsWithAvailableOptions(remaining.map((item) => item.family));
    this.syncPreviewFontAsset();
  }

  private async processBannerImageSelection(
    index: number,
    event: Event,
    processor: (file: File) => Promise<ProcessedImageResult>,
    target: 'desktop' | 'mobile'
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = await processor(file);
      this.banners.update((items) =>
        items.map((item, currentIndex) =>
          currentIndex === index
            ? {
                ...item,
                [target]: result.payload,
                [target === 'desktop' ? 'desktopPreview' : 'mobilePreview']: result.previewUrl,
              }
            : item
        )
      );
      this.errorMessage.set('');
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      input.value = '';
    }
  }

  private syncPreviewFontAsset(): void {
    const importUrls = this.extractGoogleFontImportUrls(this.form.controls.font_import_url.value);
    const selector = 'link[data-store-preview-font-import="true"]';
    const currentLinks = Array.from(this.document.head.querySelectorAll<HTMLLinkElement>(selector));
    const currentByUrl = new Map(currentLinks.map((link) => [link.href, link]));

    for (const [href, link] of currentByUrl.entries()) {
      if (!importUrls.includes(href)) {
        link.remove();
        currentByUrl.delete(href);
      }
    }

    for (const importUrl of importUrls) {
      if (currentByUrl.has(importUrl)) {
        continue;
      }

      const link = this.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = importUrl;
      link.setAttribute('data-store-preview-font-import', 'true');
      this.document.head.appendChild(link);
    }
  }

  private syncFontConfiguration(): void {
    const detectedFamilies = this.detectedEmbedFamilies();
    const currentSite = this.form.controls.font_family.value.trim();
    const currentSecondary = this.form.controls.font_secondary_family.value.trim();
    const currentMenu = this.form.controls.font_menu_family.value.trim();
    const currentButton = this.form.controls.font_button_family.value.trim();
    const currentHighlight = this.form.controls.font_highlight_family.value.trim();
    const serializedImports = this.serializeInstalledFontSets(this.installedFontSets());

    const nextSite = this.resolveSelectedFontFamily(currentSite, detectedFamilies, 0, 'Segoe UI');
    const nextSecondary = this.resolveSelectedFontFamily(
      currentSecondary,
      detectedFamilies,
      detectedFamilies.length > 1 ? 1 : 0,
      nextSite
    );
    const nextMenu = this.resolveSelectedFontFamily(currentMenu, detectedFamilies, detectedFamilies.length > 1 ? 1 : 0, nextSecondary);
    const nextButton = this.resolveSelectedFontFamily(currentButton, detectedFamilies, 0, nextSite);
    const nextHighlight = this.resolveSelectedFontFamily(
      currentHighlight,
      detectedFamilies,
      detectedFamilies.length > 1 ? 1 : 0,
      nextMenu || nextSite
    );

    this.form.patchValue(
      {
        font_family: nextSite,
        font_secondary_family: nextSecondary,
        font_menu_family: nextMenu,
        font_button_family: nextButton,
        font_highlight_family: nextHighlight,
        font_import_url: serializedImports,
      },
      { emitEvent: false }
    );
  }

  private normalizeGoogleFontImportUrl(value: string): string {
    return this.extractGoogleFontImportUrls(value)[0] || '';
  }

  private extractGoogleFontImportUrls(value: string): string[] {
    const sanitized = this.sanitizeGoogleFontsValue(value);
    if (!sanitized) {
      return [];
    }

    const matches = Array.from(sanitized.matchAll(/https:\/\/fonts\.googleapis\.com\/[^\s"'<>`]+/gi))
      .map((match) => match[0].trim())
      .filter((url) => url.startsWith('https://fonts.googleapis.com/'));

    return Array.from(new Set(matches));
  }

  private extractGoogleFontFamilies(value: string): string[] {
    const importUrls = this.extractGoogleFontImportUrls(value);
    if (!importUrls.length) {
      return [];
    }

    const families = importUrls.flatMap((importUrl) =>
      Array.from(importUrl.matchAll(/[?&]family=([^&"'`\s<>]+)/gi))
        .map((match) => decodeURIComponent(match[1] || '').split(':')[0].replace(/\+/g, ' ').trim())
        .filter((family) => family.length > 0)
    );

    return Array.from(new Set(families));
  }

  private sanitizeGoogleFontsValue(value: string): string {
    return (value || '')
      .replace(/[`]/g, '')
      .replace(/&amp;/gi, '&')
      .replace(/\u00a0/g, ' ')
      .trim();
  }

  private resolveSelectedFontFamily(
    currentValue: string,
    availableFamilies: string[],
    preferredIndex: number,
    fallbackValue = ''
  ): string {
    if (currentValue) {
      return currentValue;
    }

    if (availableFamilies.length > 0) {
      return availableFamilies[Math.min(preferredIndex, availableFamilies.length - 1)];
    }

    return fallbackValue || currentValue || 'Segoe UI';
  }

  private toCssFontStack(value: string): string {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
    }

    if (trimmed.includes(',')) {
      return trimmed;
    }

    const escaped = trimmed.replace(/'/g, "\\'");
    return `'${escaped}', sans-serif`;
  }

  private parseInstalledFontSets(embedValue: string, importValue: string): InstalledFontSet[] {
    const parsed = this.parseInstalledFontSetsFromJson(embedValue);
    if (parsed.length) {
      return parsed;
    }

    const importUrls = this.extractGoogleFontImportUrls(importValue);
    return importUrls.flatMap((importUrl) =>
      this.extractGoogleFontFamilies(importUrl).map((family) => ({
        id: this.createInstalledFontId(family, importUrl),
        family,
        importUrl,
      }))
    );
  }

  private refreshInstalledFontSets(): void {
    this.installedFontSets.set(
      this.parseInstalledFontSets(this.form.controls.font_embed_code.value, this.form.controls.font_import_url.value)
    );
  }

  private serializeInstalledFontSets(items: InstalledFontSet[]): string {
    return items.map((item) => item.importUrl).join('\n');
  }

  private patchInstalledFontSets(items: InstalledFontSet[]): void {
    const serializedImports = this.serializeInstalledFontSets(items);
    const serializedJson = JSON.stringify(items);
    this.form.patchValue(
      {
        font_embed_code: serializedJson,
        font_import_url: serializedImports,
      },
      { emitEvent: false }
    );
    this.installedFontSets.set(items);
  }

  private reconcileSelectedFontsWithAvailableOptions(installedFamilies: string[]): void {
    const availableFamilies = new Set([...this.defaultFontFamilies, ...installedFamilies]);
    const site = availableFamilies.has(this.form.controls.font_family.value.trim()) ? this.form.controls.font_family.value.trim() : 'Segoe UI';
    const secondary = availableFamilies.has(this.form.controls.font_secondary_family.value.trim())
      ? this.form.controls.font_secondary_family.value.trim()
      : site;
    const menu = availableFamilies.has(this.form.controls.font_menu_family.value.trim())
      ? this.form.controls.font_menu_family.value.trim()
      : secondary;
    const button = availableFamilies.has(this.form.controls.font_button_family.value.trim())
      ? this.form.controls.font_button_family.value.trim()
      : site;
    const highlight = availableFamilies.has(this.form.controls.font_highlight_family.value.trim())
      ? this.form.controls.font_highlight_family.value.trim()
      : secondary;

    this.form.patchValue(
      {
        font_family: site,
        font_secondary_family: secondary,
        font_menu_family: menu,
        font_button_family: button,
        font_highlight_family: highlight,
      },
      { emitEvent: false }
    );
  }

  private parseInstalledFontSetsFromJson(value: string): InstalledFontSet[] {
    const trimmed = (value || '').trim();
    if (!trimmed.startsWith('[')) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => ({
          id: this.createInstalledFontId(String(item?.family || ''), String(item?.importUrl || '')),
          family: String(item?.family || '').trim(),
          importUrl: this.normalizeGoogleFontImportUrl(String(item?.importUrl || '')),
        }))
        .filter((item) => item.family && item.importUrl);
    } catch {
      return [];
    }
  }

  private createInstalledFontId(family: string, importUrl: string): string {
    return `${family}-${importUrl}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  }

  private async processImageSelection(
    event: Event,
    processor: (file: File) => Promise<ProcessedImageResult>,
    targetAsset: { set(value: StoreImagePayload | null): void },
    targetPreview: { set(value: string | null): void }
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = await processor(file);
      targetAsset.set(result.payload);
      targetPreview.set(result.previewUrl);
      this.errorMessage.set('');
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    }
  }

  private payloadToPreviewUrl(payload?: StoreImagePayload | null): string | null {
    if (!payload?.base64 || !payload.mime) {
      return null;
    }

    return `data:${payload.mime};base64,${payload.base64}`;
  }

  private handleCustomBlockFrameMessage = (event: MessageEvent): void => {
    if (event.data?.type !== 'store-custom-block-height') {
      return;
    }

    const height = Number(event.data.height);
    if (!Number.isFinite(height) || height <= 0) {
      return;
    }

    this.customBlockPreviewHeight.set(Math.max(0, Math.ceil(height)));
  };

  private syncDesktopProductsPerRow(mode: StoreContentWidthMode): void {
    const currentValue = this.form.controls.products_per_row_desktop.value;
    if (mode === 'contained' && currentValue === '5') {
      this.form.controls.products_per_row_desktop.setValue('4');
      return;
    }

    if (mode === 'full_width' && currentValue !== '3' && currentValue !== '4' && currentValue !== '5') {
      this.form.controls.products_per_row_desktop.setValue('5');
    }
  }

  private createEmptyBanner(order: number): EditableBanner {
    return {
      id: '',
      title: '',
      subtitle: '',
      link: '',
      order,
      active: true,
      show_content: true,
      link_mode: 'none',
      content_position: 'center',
      content_position_x: 'center',
      content_position_y: 'center',
      use_button: false,
      button_label: '',
      desktop: null,
      mobile: null,
      desktopPreview: null,
      mobilePreview: null,
    };
  }

  private createEmptyLink(): EditableLink {
    return {
      kind: 'custom',
      label: '',
      url: '',
      visible: true,
    };
  }

  private createEmptyHighlight(): EditableHighlight {
    return {
      title: '',
      text: '',
      icon: 'shield',
      text_align: 'left',
      icon_size: 'medium',
      font_family: '',
    };
  }

  private toProductSectionPayload(key: ConfigurableProductSectionKey): StoreProductSectionConfigPayload {
    const section = this.productSectionConfigs()[key];
    return {
      eyebrow: section.eyebrow.trim(),
      title: section.title.trim(),
      description: section.description.trim(),
      display_mode: section.display_mode,
    };
  }

  private toBannerPayload(item: EditableBanner, order: number): StoreBannerPayload {
    return {
      id: item.id,
      title: item.title.trim(),
      subtitle: item.subtitle.trim(),
      link: item.link.trim(),
      order,
      active: item.active,
      show_content: item.show_content,
      link_mode: item.link_mode,
      content_position: item.content_position_x === 'left' || item.content_position_x === 'right'
        ? item.content_position_x
        : item.content_position_y === 'top' || item.content_position_y === 'bottom'
          ? item.content_position_y
          : 'center',
      content_position_x: item.content_position_x,
      content_position_y: item.content_position_y,
      use_button: item.link_mode === 'button',
      button_label: item.button_label.trim(),
      desktop: item.desktop,
      mobile: item.mobile,
    };
  }

  private toNavigationLinkPayload(item: EditableLink): StoreNavigationLinkPayload {
    const normalized = this.normalizeMenuLink(item);
    return {
      label: normalized.label,
      url: normalized.url,
      visible: normalized.visible,
      kind: normalized.kind,
    };
  }

  private toFeatureHighlightPayload(item: EditableHighlight): StoreFeatureHighlightPayload {
    return {
      title: item.title.trim(),
      text: item.text.trim(),
      icon: item.icon.trim(),
      text_align: item.text_align,
      icon_size: item.icon_size,
      font_family: item.font_family.trim(),
    };
  }

  private toInstitutionalSectionPayload(): StoreInstitutionalSectionPayload {
    const section = this.institutionalSectionConfig();
    return {
      eyebrow: section.eyebrow.trim(),
      title: section.title.trim(),
      description: section.description.trim(),
      display_mode: this.form.controls.institutional_section_display_mode.value,
      width_mode: this.effectiveInstitutionalSectionWidthMode(),
      background_color: this.form.controls.institutional_section_background_color.value,
    };
  }

  private toProductListingConfigPayload() {
    const config = this.productListingConfig();
    return {
      show_buy_button: config.show_buy_button,
      buy_button_label: config.buy_button_label.trim(),
      buy_button_uppercase: config.buy_button_uppercase,
      show_add_to_cart_button: config.show_add_to_cart_button,
      add_to_cart_button_label: config.add_to_cart_button_label.trim(),
      add_to_cart_button_uppercase: config.add_to_cart_button_uppercase,
      show_price: config.show_price,
      show_compare_price: config.show_compare_price,
      show_tags: config.show_tags,
      card_background_color: config.card_background_color,
      show_border: config.show_border,
      border_color: config.border_color.trim(),
      border_width: Number(config.border_width) || 0,
      show_shadow: config.show_shadow,
      shadow_direction: config.shadow_direction,
      shadow_intensity: config.shadow_intensity,
      use_default_title_color: config.use_default_title_color,
      title_text_color: config.title_text_color,
      use_default_body_color: config.use_default_body_color,
      body_text_color: config.body_text_color,
      secondary_button_color: config.secondary_button_color,
      secondary_button_text_color: config.secondary_button_text_color,
      button_shape: this.buttonShapeControl.value,
      detail_description_background_color: config.detail_description_background_color,
      detail_description_title_color: config.detail_description_title_color,
      detail_description_text_color: config.detail_description_text_color,
      detail_description_font_family: config.detail_description_font_family.trim(),
      detail_strip_background_color: config.detail_strip_background_color,
      detail_strip_text_color: config.detail_strip_text_color,
      detail_strip_font_family: config.detail_strip_font_family.trim(),
      detail_strip_items: config.detail_strip_items.map((item) => ({
        key: item.key,
        label: item.label.trim(),
        icon: item.icon,
        visible: item.visible,
      })),
    };
  }

  private mapResponseBanners(config: {
    banners?: StoreBannerPayload[];
    banner_desktop?: StoreImagePayload | null;
    banner_mobile?: StoreImagePayload | null;
    hero_title?: string;
    hero_subtitle?: string;
  }): EditableBanner[] {
    if (config.banners?.length) {
      return config.banners.map((item, index) => ({
        id: item.id || '',
        title: item.title || '',
        subtitle: item.subtitle || '',
        link: item.link || '',
        order: item.order ?? index,
        active: item.active ?? true,
      show_content: item.show_content ?? true,
      link_mode: item.link_mode ?? (item.use_button ? 'button' : item.link ? 'banner' : 'none'),
        content_position: item.content_position ?? 'center',
      content_position_x: item.content_position_x ?? (item.content_position === 'left' || item.content_position === 'right' ? item.content_position : 'center'),
      content_position_y: item.content_position_y ?? (item.content_position === 'top' || item.content_position === 'bottom' ? item.content_position : 'center'),
      use_button: item.use_button ?? false,
      button_label: item.button_label ?? '',
        desktop: item.desktop ?? null,
        mobile: item.mobile ?? null,
        desktopPreview: this.payloadToPreviewUrl(item.desktop),
        mobilePreview: this.payloadToPreviewUrl(item.mobile),
      }));
    }

    if (config.banner_desktop || config.banner_mobile) {
      return [
        {
          id: '',
          title: config.hero_title || '',
          subtitle: config.hero_subtitle || '',
          link: '',
          order: 0,
          active: true,
          show_content: true,
          link_mode: 'none',
          content_position: 'center',
          content_position_x: 'center',
          content_position_y: 'center',
          use_button: false,
          button_label: '',
          desktop: config.banner_desktop ?? null,
          mobile: config.banner_mobile ?? null,
          desktopPreview: this.payloadToPreviewUrl(config.banner_desktop),
          mobilePreview: this.payloadToPreviewUrl(config.banner_mobile),
        },
      ];
    }

    return [];
  }

  private mapNavigationLinks(
    items?: StoreNavigationLinkPayload[],
    cmsConfig?: { contos?: boolean; artigos?: boolean; blog?: boolean }
  ): EditableLink[] {
    if (!items?.length) {
      return FIXED_MENU_LINKS.map((item) => ({ ...item, visible: this.fixedMenuLinkDefaultVisibility(item.kind, cmsConfig) }));
    }

    const normalized = items
      .map((item) => this.normalizeStoredMenuLink(item))
      .filter((item): item is EditableLink => !!item);

    const existingKinds = new Set(normalized.filter((item) => item.kind !== 'custom').map((item) => item.kind));
    const missingFixedItems = FIXED_MENU_LINKS
      .filter((item) => !existingKinds.has(item.kind))
      .map((item) => ({ ...item, visible: this.fixedMenuLinkDefaultVisibility(item.kind, cmsConfig) }));
    return [...normalized, ...missingFixedItems];
  }

  private mapFooterLinks(items?: StoreNavigationLinkPayload[]): EditableLink[] {
    if (items?.length) {
      return items.map((item) => ({
        kind: 'custom',
        label: item.label || '',
        url: item.url || '',
        visible: item.visible ?? true,
      }));
    }

    return [];
  }

  private normalizeMenuLink(item: EditableLink): EditableLink {
    if (item.kind === 'custom') {
      return {
        kind: 'custom',
        label: item.label.trim(),
        url: item.url.trim(),
        visible: item.visible,
      };
    }

    const fixed = FIXED_MENU_LINKS.find((candidate) => candidate.kind === item.kind);
    return {
      kind: item.kind,
      label: fixed?.label || item.label.trim(),
      url: fixed?.url || item.url.trim(),
      visible: item.visible,
    };
  }

  private normalizeStoredMenuLink(item: StoreNavigationLinkPayload): EditableLink | null {
    const label = (item.label || '').trim();
    const url = (item.url || '').trim();
    const kind = this.normalizeMenuLinkKind(item.kind, label, url);
    const visible = item.kind ? item.visible ?? true : true;

    if (kind === 'custom') {
      if (!label || !url) {
        return null;
      }

      return {
        kind,
        label,
        url,
        visible,
      };
    }

    const fixed = FIXED_MENU_LINKS.find((candidate) => candidate.kind === kind);
    if (!fixed) {
      return null;
    }

    return {
      ...fixed,
      visible,
    };
  }

  private normalizeMenuLinkKind(value: string | undefined, label?: string, url?: string): EditableMenuLinkKind {
    switch ((value || '').trim()) {
      case 'home':
        return 'home';
      case 'products':
        return 'products';
      case 'categories':
        return 'categories';
      case 'cms_contos':
        return 'cms_contos';
      case 'cms_artigos':
        return 'cms_artigos';
      case 'cms_blog':
        return 'cms_blog';
      case 'contact':
        return 'contact';
      default:
        return this.inferMenuLinkKind(label, url);
    }
  }

  private inferMenuLinkKind(label?: string, url?: string): EditableMenuLinkKind {
    const normalizedLabel = (label || '').trim().toLowerCase();
    const normalizedUrl = (url || '').trim().toLowerCase();
    if (normalizedLabel === 'início' || normalizedLabel === 'inicio' || normalizedUrl === '#topo') {
      return 'home';
    }
    if (normalizedLabel === 'produtos' || normalizedUrl === '/produtos') {
      return 'products';
    }
    if (normalizedLabel === 'categorias' || normalizedUrl === '__categories__') {
      return 'categories';
    }
    if (normalizedLabel === 'contos' || normalizedUrl === '/contos') {
      return 'cms_contos';
    }
    if (normalizedLabel === 'artigos' || normalizedUrl === '/artigos') {
      return 'cms_artigos';
    }
    if (normalizedLabel === 'blog' || normalizedUrl === '/blog') {
      return 'cms_blog';
    }
    if (normalizedLabel === 'contato' || normalizedUrl === '#rodape' || normalizedUrl === '/contato') {
      return 'contact';
    }
    return 'custom';
  }

  private fixedMenuLinkDefaultVisibility(
    kind: EditableMenuLinkKind,
    cmsConfig?: { contos?: boolean; artigos?: boolean; blog?: boolean }
  ): boolean {
    switch (kind) {
      case 'cms_contos':
        return cmsConfig?.contos ?? true;
      case 'cms_artigos':
        return cmsConfig?.artigos ?? true;
      case 'cms_blog':
        return cmsConfig?.blog ?? true;
      default:
        return true;
    }
  }

  private deriveCmsConfigFromMenuLinks(items: EditableLink[]): { contos: boolean; artigos: boolean; blog: boolean } {
    const byKind = new Map(items.map((item) => [item.kind, item.visible] as const));
    return {
      contos: byKind.get('cms_contos') ?? false,
      artigos: byKind.get('cms_artigos') ?? false,
      blog: byKind.get('cms_blog') ?? false,
    };
  }

  private mapFeatureHighlights(items?: StoreFeatureHighlightPayload[]): EditableHighlight[] {
    if (items?.length) {
      return items.map((item) => ({
        title: item.title || '',
        text: item.text || '',
        icon: item.icon || '',
        text_align: item.text_align === 'center' || item.text_align === 'right' ? item.text_align : 'left',
        icon_size: item.icon_size === 'small' || item.icon_size === 'large' ? item.icon_size : 'medium',
        font_family: item.font_family || '',
      }));
    }

    return [
      {
        title: 'Compra segura',
        text: 'Pagamento protegido e processo de compra confiável.',
        icon: 'shield',
        text_align: 'left',
        icon_size: 'medium',
        font_family: '',
      },
      {
        title: 'Atendimento próximo',
        text: 'Contato direto para dúvidas, pedidos e suporte editorial.',
        icon: 'headset',
        text_align: 'left',
        icon_size: 'medium',
        font_family: '',
      },
      {
        title: 'Envio nacional',
        text: 'Entrega para todo o Brasil com cálculo de frete no checkout.',
        icon: 'truck',
        text_align: 'left',
        icon_size: 'medium',
        font_family: '',
      },
    ];
  }

  private mapInstitutionalSection(value?: StoreInstitutionalSectionPayload): EditableInstitutionalSectionConfig {
    return {
      eyebrow: value?.eyebrow ?? 'Destaques padronizados',
      title: value?.title ?? 'Informacoes institucionais',
      description: value?.description ?? 'Cards fixos para beneficios, seguranca, atendimento e comunicacao da loja.',
      display_mode: value?.display_mode === 'continuous' ? 'continuous' : 'cards',
      width_mode: value?.width_mode === 'full_width' ? 'full_width' : 'contained',
      background_color: value?.background_color || '#0F172A',
    };
  }

  private mapProductListingConfig(value?: {
    show_buy_button?: boolean;
    buy_button_label?: string;
    buy_button_uppercase?: boolean;
    show_add_to_cart_button?: boolean;
    add_to_cart_button_label?: string;
    add_to_cart_button_uppercase?: boolean;
    show_price?: boolean;
    show_compare_price?: boolean;
    show_tags?: boolean;
    card_background_color?: string;
    show_border?: boolean;
    border_color?: string;
    border_width?: number;
    show_shadow?: boolean;
    shadow_direction?: 'top' | 'bottom' | 'left' | 'right' | 'bottom-left' | 'bottom-right';
    shadow_intensity?: 'soft' | 'medium' | 'strong';
    use_default_title_color?: boolean;
    title_text_color?: string;
    use_default_body_color?: boolean;
    body_text_color?: string;
    secondary_button_color?: string;
    secondary_button_text_color?: string;
    button_shape?: 'sharp' | 'soft' | 'rounded' | 'pill';
    detail_description_background_color?: string;
    detail_description_title_color?: string;
    detail_description_text_color?: string;
    detail_description_font_family?: string;
    detail_strip_background_color?: string;
    detail_strip_text_color?: string;
    detail_strip_font_family?: string;
    detail_strip_items?: EditableProductDetailStripItem[];
  }): EditableProductListingConfig {
    const defaults = this.createDefaultProductListingConfig();
    const normalizedDetailStripItems = value?.detail_strip_items?.filter((item) =>
      this.supportedProductDetailStripKeys.has(item.key)
    );

    return {
      show_buy_button: value?.show_buy_button ?? defaults.show_buy_button,
      buy_button_label: value?.buy_button_label ?? defaults.buy_button_label,
      buy_button_uppercase: value?.buy_button_uppercase ?? defaults.buy_button_uppercase,
      show_add_to_cart_button: value?.show_add_to_cart_button ?? defaults.show_add_to_cart_button,
      add_to_cart_button_label: value?.add_to_cart_button_label ?? defaults.add_to_cart_button_label,
      add_to_cart_button_uppercase: value?.add_to_cart_button_uppercase ?? defaults.add_to_cart_button_uppercase,
      show_price: value?.show_price ?? defaults.show_price,
      show_compare_price: value?.show_compare_price ?? defaults.show_compare_price,
      show_tags: value?.show_tags ?? defaults.show_tags,
      card_background_color: value?.card_background_color ?? defaults.card_background_color,
      show_border: value?.show_border ?? defaults.show_border,
      border_color: value?.border_color ?? defaults.border_color,
      border_width: value?.border_width ?? defaults.border_width,
      show_shadow: value?.show_shadow ?? defaults.show_shadow,
      shadow_direction: value?.shadow_direction ?? defaults.shadow_direction,
      shadow_intensity: value?.shadow_intensity ?? defaults.shadow_intensity,
      use_default_title_color: value?.use_default_title_color ?? defaults.use_default_title_color,
      title_text_color: value?.title_text_color ?? defaults.title_text_color,
      use_default_body_color: value?.use_default_body_color ?? defaults.use_default_body_color,
      body_text_color: value?.body_text_color ?? defaults.body_text_color,
      secondary_button_color: value?.secondary_button_color ?? defaults.secondary_button_color,
      secondary_button_text_color: value?.secondary_button_text_color ?? defaults.secondary_button_text_color,
      button_shape: value?.button_shape ?? defaults.button_shape,
      detail_description_background_color:
        value?.detail_description_background_color ?? defaults.detail_description_background_color,
      detail_description_title_color:
        value?.detail_description_title_color ?? defaults.detail_description_title_color,
      detail_description_text_color: value?.detail_description_text_color ?? defaults.detail_description_text_color,
      detail_description_font_family:
        value?.detail_description_font_family ?? defaults.detail_description_font_family,
      detail_strip_background_color: value?.detail_strip_background_color ?? defaults.detail_strip_background_color,
      detail_strip_text_color: value?.detail_strip_text_color ?? defaults.detail_strip_text_color,
      detail_strip_font_family: value?.detail_strip_font_family ?? defaults.detail_strip_font_family,
      detail_strip_items: normalizedDetailStripItems?.length ? normalizedDetailStripItems : defaults.detail_strip_items,
    };
  }

  private mapProductSectionConfig(
    key: ConfigurableProductSectionKey,
    value?: StoreProductSectionConfigPayload
  ): EditableProductSectionConfig {
    const defaults = this.createDefaultProductSectionConfig(key);
    return {
      eyebrow: value?.eyebrow ?? defaults.eyebrow,
      title: value?.title || defaults.title,
      description: value?.description ?? defaults.description,
      display_mode: value?.display_mode ?? defaults.display_mode,
    };
  }

  private firstInvalidProductSectionTitle(): ConfigurableProductSectionKey | null {
    const configs = this.productSectionConfigs();
    const keys: ConfigurableProductSectionKey[] = ['launches', 'featured', 'promotions'];

    for (const key of keys) {
      if (!configs[key].title.trim()) {
        return key;
      }
    }

    return null;
  }

  private mapSectionOrder(items?: StorefrontSectionKey[], visibleItems?: StorefrontSectionKey[]): EditableSectionOrderItem[] {
    const definitions = this.sectionDefinitions();
    const map = new Map(definitions.map((item) => [item.key, item] as const));
    const ordered: EditableSectionOrderItem[] = [];
    const used = new Set<StorefrontSectionKey>();
    const visibleSet = new Set<StorefrontSectionKey>(
      visibleItems && visibleItems.length ? visibleItems : definitions.map((item) => item.key)
    );

    for (const key of items ?? []) {
      const item = map.get(key);
      if (!item || used.has(key)) {
        continue;
      }
      used.add(key);
      ordered.push({ ...item, visible: visibleSet.has(key) });
    }

    for (const item of definitions) {
      if (used.has(item.key)) {
        continue;
      }
      ordered.push({ ...item, visible: visibleSet.has(item.key) });
    }

    return ordered;
  }

  private sectionDefinitions(): EditableSectionOrderItem[] {
    return [
      {
        key: 'banner',
        label: 'Banner Rotativo',
        description: 'Carrossel principal da home.',
        visible: true,
      },
      {
        key: 'custom_block',
        label: 'Bloco Customizado',
        description: 'HTML, CSS e JavaScript do cliente.',
        visible: true,
      },
      {
        key: 'launches',
        label: 'Produtos Lançamentos',
        description: 'Vitrine de produtos marcados como lançamento.',
        visible: true,
      },
      {
        key: 'featured',
        label: 'Produtos Destaque',
        description: 'Vitrine de produtos em destaque.',
        visible: true,
      },
      {
        key: 'institutional',
        label: 'Destaques Padronizados',
        description: 'Cards institucionais da loja.',
        visible: true,
      },
      {
        key: 'promotions',
        label: 'Produtos Promoção',
        description: 'Vitrine com ofertas e descontos.',
        visible: true,
      },
    ];
  }

  private createDefaultProductSectionConfig(key: ConfigurableProductSectionKey): EditableProductSectionConfig {
    switch (key) {
      case 'launches':
        return {
          eyebrow: '',
          title: 'Novidades da loja',
          description: '',
          display_mode: 'wrap',
        };
      case 'featured':
        return {
          eyebrow: '',
          title: 'Títulos em evidência',
          description: '',
          display_mode: 'wrap',
        };
      case 'promotions':
        return {
          eyebrow: '',
          title: 'Ofertas e descontos',
          description: '',
          display_mode: 'wrap',
        };
    }
  }

  private createDefaultProductListingConfig(): EditableProductListingConfig {
    return {
      show_buy_button: true,
      buy_button_label: 'Comprar',
      buy_button_uppercase: false,
      show_add_to_cart_button: true,
      add_to_cart_button_label: 'Add ao carrinho',
      add_to_cart_button_uppercase: false,
      show_price: true,
      show_compare_price: true,
      show_tags: true,
      card_background_color: '#07153A',
      show_border: true,
      border_color: 'rgba(99, 102, 241, 0.2)',
      border_width: 1,
      show_shadow: true,
      shadow_direction: 'bottom',
      shadow_intensity: 'medium',
      use_default_title_color: true,
      title_text_color: '#F8FAFC',
      use_default_body_color: true,
      body_text_color: '#B5C0DC',
      secondary_button_color: '#14224A',
      secondary_button_text_color: '#F8FAFC',
      button_shape: 'soft',
      detail_description_background_color: '',
      detail_description_title_color: '',
      detail_description_text_color: '',
      detail_description_font_family: 'Segoe UI',
      detail_strip_background_color: '#111111',
      detail_strip_text_color: '#F8FAFC',
      detail_strip_font_family: 'Segoe UI',
      detail_strip_items: [
        { key: 'categories', label: 'Categorias', icon: 'tags', visible: true },
        { key: 'pages', label: 'Paginas', icon: 'book-open', visible: true },
        { key: 'language', label: 'Idioma', icon: 'language', visible: true },
        { key: 'format', label: 'Formato do Livro', icon: 'ruler-combined', visible: true },
        { key: 'weight', label: 'Peso', icon: 'weight-hanging', visible: true },
        { key: 'finish', label: 'Acabamento', icon: 'book', visible: true },
      ],
    };
  }

  private normalizeFeatureHighlightIcon(icon: string | undefined): string {
    const normalized = (icon || '').trim().toLowerCase();
    const allowed = new Set(this.featureHighlightIconOptions.map((item) => item.value));
    return allowed.has(normalized) ? normalized : 'shield';
  }
}

function resolveFeatureHighlightIconClass(icon: string | undefined): string {
  const normalized = (icon || '').trim().toLowerCase();

  switch (normalized) {
    case 'badge-percent':
      return 'fa-solid fa-percent';
    case 'check-circle':
      return 'fa-solid fa-circle-check';
    case 'pix':
      return 'fa-brands fa-pix';
    default:
      return `fa-solid fa-${normalized || 'shield'}`;
  }
}
