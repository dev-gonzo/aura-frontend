import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface StoreImagePayload {
  base64: string;
  mime: string;
  largura: number;
  altura: number;
  tamanho_bytes: number;
  hash_sha256: string;
}

export interface StoreBannerPayload {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  order: number;
  active: boolean;
  show_content?: boolean;
  link_mode?: StoreBannerLinkMode;
  content_position?: StoreBannerContentPosition;
  content_position_x?: StoreBannerContentHorizontalPosition;
  content_position_y?: StoreBannerContentVerticalPosition;
  use_button?: boolean;
  button_label?: string;
  desktop?: StoreImagePayload | null;
  mobile?: StoreImagePayload | null;
}

export interface StoreNavigationLinkPayload {
  label: string;
  url: string;
  visible?: boolean;
  kind?: StoreNavigationLinkKind;
}

export type StoreNavigationLinkKind =
  | 'home'
  | 'products'
  | 'categories'
  | 'contact'
  | 'cms_contos'
  | 'cms_artigos'
  | 'cms_blog'
  | 'custom';

export interface StoreFeatureHighlightPayload {
  title: string;
  text: string;
  icon: string;
  text_align?: 'left' | 'center' | 'right';
  icon_size?: 'small' | 'medium' | 'large';
  font_family?: string;
}

export interface StoreInstitutionalSectionPayload {
  eyebrow: string;
  title: string;
  description: string;
  display_mode?: 'cards' | 'continuous';
  width_mode?: StoreBannerWidthMode;
  background_color?: string;
}

export interface StoreProductListingConfigPayload {
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
  detail_strip_items?: StoreProductDetailStripItemPayload[];
}

export interface StoreProductDetailStripItemPayload {
  key: 'categories' | 'pages' | 'language' | 'format' | 'weight' | 'finish';
  label: string;
  icon: string;
  visible: boolean;
}

export type StoreProductSectionDisplayMode = 'wrap' | 'horizontal_scroll';
export type StoreBannerContentPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type StoreBannerContentHorizontalPosition = 'left' | 'center' | 'right';
export type StoreBannerContentVerticalPosition = 'top' | 'center' | 'bottom';
export type StoreBannerLinkMode = 'none' | 'banner' | 'button';

export interface StoreProductSectionConfigPayload {
  eyebrow: string;
  title: string;
  description: string;
  display_mode: StoreProductSectionDisplayMode;
}

export interface StoreProductPhotoPayload {
  id: string;
  order: number;
  is_primary: boolean;
  image?: StoreImagePayload | null;
}

export interface StoreProductAuthorPayload {
  id?: string;
  nome: string;
}

export interface StoreCategoryPayload {
  nome: string;
  slug: string;
  descricao?: string;
  ordem: number;
  ativa: boolean;
}

export interface StoreCategoryListItem extends StoreCategoryPayload {
  id: string;
  produtos_count: number;
  criado_em: string;
  atualizado_em: string;
}

export type StoreCornerStyle = 'sharp' | 'soft' | 'accentuated';
export type StoreContentWidthMode = 'contained' | 'full_width';
export type StoreBrandDisplayMode = 'logo_only' | 'logo_and_name';
export type StoreBrandLogoSize = 'small' | 'medium' | 'large';
export type StoreMenuBackgroundMode = 'solid' | 'transparent';
export type StoreButtonStyle = 'gradient' | 'solid';
export type StoreBannerWidthMode = 'contained' | 'full_width';
export type StoreBannerEffectMode = 'none' | 'slider' | 'fade' | 'zoom';
export type StoreProductsPerRowDesktop = 3 | 4 | 5;
export type StoreProductsPerRowMobile = 1 | 2;

export type StorefrontSectionKey =
  | 'banner'
  | 'custom_block'
  | 'launches'
  | 'featured'
  | 'institutional'
  | 'promotions';

export interface StoreIntegrationsPayload {
  facebook_pixel_id?: string;
  google_ads_id?: string;
  google_ads_conversion_label?: string;
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  microsoft_clarity_id?: string;
  tiktok_pixel_id?: string;
}

export interface StoreCmsConfigPayload {
  contos: boolean;
  artigos: boolean;
  blog: boolean;
}

export interface StoreSettingsPayload {
  store_name: string;
  store_subtitle?: string;
  store_description?: string;
  store_tags?: string;
  cms_config?: StoreCmsConfigPayload;
  store_in_maintenance?: boolean;
  maintenance_title?: string;
  maintenance_message?: string;
  primary_color: string;
  accent_color: string;
  secondary_color: string;
  background_color: string;
  header_color: string;
  menu_color: string;
  footer_color: string;
  header_text_color: string;
  menu_text_color: string;
  footer_text_color: string;
  primary_text_color: string;
  highlight_color: string;
  discount_color: string;
  launch_badge_color?: string;
  featured_badge_color?: string;
  promotion_badge_color?: string;
  button_color?: string;
  button_text_color?: string;
  button_style?: StoreButtonStyle;
  font_family?: string;
  font_secondary_family?: string;
  font_menu_family?: string;
  font_button_family?: string;
  font_highlight_family?: string;
  font_import_url?: string;
  font_embed_code?: string;
  integrations?: StoreIntegrationsPayload;
  corner_style?: StoreCornerStyle;
  content_width_mode?: StoreContentWidthMode;
  menu_background_mode?: StoreMenuBackgroundMode;
  banner_width_mode?: StoreBannerWidthMode;
  banner_effect_mode?: StoreBannerEffectMode;
  banner_rotation_seconds?: number;
  brand_display_mode?: StoreBrandDisplayMode;
  brand_logo_size?: StoreBrandLogoSize;
  products_per_row_desktop?: StoreProductsPerRowDesktop;
  products_per_row_mobile?: StoreProductsPerRowMobile;
  hero_title?: string;
  hero_subtitle?: string;
  logo?: StoreImagePayload | null;
  favicon?: StoreImagePayload | null;
  banner_desktop?: StoreImagePayload | null;
  banner_mobile?: StoreImagePayload | null;
  banners?: StoreBannerPayload[];
  menu_links?: StoreNavigationLinkPayload[];
  section_order?: StorefrontSectionKey[];
  visible_sections?: StorefrontSectionKey[];
  custom_block_eyebrow?: string;
  custom_block_title?: string;
  custom_block_description?: string;
  custom_block_html?: string;
  custom_block_css?: string;
  custom_block_js?: string;
  feature_highlights?: StoreFeatureHighlightPayload[];
  institutional_section?: StoreInstitutionalSectionPayload;
  product_listing_config?: StoreProductListingConfigPayload;
  footer_links?: StoreNavigationLinkPayload[];
  footer_contact_title?: string;
  footer_contact_text?: string;
  contact_store_name?: string;
  contact_cnpj?: string;
  contact_phone?: string;
  contact_whatsapp?: string;
  contact_email?: string;
  contact_hours?: string;
  contact_address?: string;
  contact_map_embed_url?: string;
  launches_section?: StoreProductSectionConfigPayload;
  featured_section?: StoreProductSectionConfigPayload;
  promotions_section?: StoreProductSectionConfigPayload;
}

export interface StoreSettingsResponse extends StoreSettingsPayload {
  created_at: string;
  updated_at: string;
  draft_updated_at: string;
  published_at: string;
  has_unpublished_changes: boolean;
}

export interface StoreContactSettingsPayload {
  footer_contact_title?: string;
  footer_contact_text?: string;
  contact_store_name?: string;
  contact_cnpj?: string;
  contact_phone?: string;
  contact_whatsapp?: string;
  contact_email?: string;
  contact_hours?: string;
  contact_address?: string;
  contact_map_embed_url?: string;
}

export interface StoreProductPayload {
  livro_id?: string;
  is_book: boolean;
  authors?: StoreProductAuthorPayload[];
  autor_nome?: string | null;
  marca?: string | null;
  editora?: string | null;
  subtitulo?: string | null;
  sinopse?: string | null;
  isbn?: string | null;
  codigo_barra?: string | null;
  edicao?: string | null;
  idioma?: string | null;
  numero_paginas?: number | null;
  genero?: string | null;
  data_publicacao?: string | null;
  tipo_capa?: string | null;
  peso_gramas?: number | null;
  largura_cm?: number | null;
  altura_cm?: number | null;
  profundidade_cm?: number | null;
  slug: string;
  nome_exibicao: string;
  descricao_curta?: string;
  categoria?: string;
  categorias?: string[];
  preco_venda: number;
  em_promocao: boolean;
  preco_promocional: number;
  destaque: boolean;
  lancamento: boolean;
  ativo: boolean;
  ordem: number;
  fotos?: StoreProductPhotoPayload[];
}

export interface StoreProductListItem extends StoreProductPayload {
  id: string;
  livro_titulo: string;
  livro_subtitulo?: string | null;
  autor_nome?: string | null;
  marca?: string | null;
  editora?: string | null;
  subtitulo?: string | null;
  sinopse?: string | null;
  isbn?: string | null;
  codigo_barra?: string | null;
  edicao?: string | null;
  idioma?: string | null;
  numero_paginas?: number | null;
  genero?: string | null;
  data_publicacao?: string | null;
  tipo_capa?: string | null;
  peso_gramas?: number | null;
  largura_cm?: number | null;
  altura_cm?: number | null;
  profundidade_cm?: number | null;
  capa?: StoreImagePayload | null;
  fotos?: StoreProductPhotoPayload[];
  criado_em: string;
  atualizado_em: string;
}

interface StoreProductListResponse {
  items: StoreProductListItem[];
}

interface StoreCategoryListResponse {
  items: StoreCategoryListItem[];
}

@Injectable({ providedIn: 'root' })
export class LojaService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async getConfig(): Promise<StoreSettingsResponse> {
    return firstValueFrom(this.http.get<StoreSettingsResponse>(`${this.apiBaseUrl}/loja/configuracao`));
  }

  async updateConfig(payload: StoreSettingsPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/loja/configuracao`, payload));
  }

  async updateIntegrations(payload: StoreIntegrationsPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/loja/configuracao/integracoes`, payload));
  }

  async updateContact(payload: StoreContactSettingsPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/loja/configuracao/contato`, payload));
  }

  async publishConfig(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/loja/configuracao/publicar`, {}));
  }

  async resetDraftConfig(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/loja/configuracao/rascunho/reset`, {}));
  }

  async listProducts(): Promise<StoreProductListItem[]> {
    return firstValueFrom(this.http.get<StoreProductListResponse>(`${this.apiBaseUrl}/loja/produtos`)).then(
      (response) => response.items
    );
  }

  async listCategories(): Promise<StoreCategoryListItem[]> {
    return firstValueFrom(this.http.get<StoreCategoryListResponse>(`${this.apiBaseUrl}/loja/categorias`)).then(
      (response) => response.items
    );
  }

  async createCategory(payload: StoreCategoryPayload): Promise<string> {
    return firstValueFrom(this.http.post<{ id: string }>(`${this.apiBaseUrl}/loja/categorias`, payload)).then(
      (response) => response.id
    );
  }

  async updateCategory(id: string, payload: StoreCategoryPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/loja/categorias/${id}`, payload));
  }

  async deleteCategory(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/loja/categorias/${id}`));
  }

  async findProductById(id: string): Promise<StoreProductListItem> {
    return firstValueFrom(this.http.get<StoreProductListItem>(`${this.apiBaseUrl}/loja/produtos/${id}`));
  }

  async createProduct(payload: StoreProductPayload): Promise<string> {
    return firstValueFrom(this.http.post<{ id: string }>(`${this.apiBaseUrl}/loja/produtos`, payload)).then(
      (response) => response.id
    );
  }

  async updateProduct(id: string, payload: StoreProductPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/loja/produtos/${id}`, payload));
  }
}
