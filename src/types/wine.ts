export type Wine = {
  codigo_produto?: string | number | null
  ean?: string | number | null
  gtin?: string | number | null
  codigo_ean?: string | number | null
  codigo_barras?: string | number | null
  codigo_de_barras?: string | number | null
  nome_produto?: string | null
  link_produto?: string | null
  imagem_principal?: string | null
  imagens_extras?: string[] | null
  variedade_da_uva?: string | null
  pais_de_origem?: string | null
  tipo?: string | null
  regiao?: string | null
  produtor?: string | null
  teor_alcoolico?: string | null
  marca?: string | null
  cor_do_vinho?: string | null
  ingredientes?: string | null
  harmonizacao?: string | null
  tipo_de_uva?: string | null
  tipo_de_armazenagem?: string | null
  tipo_de_armazenagem_apos_aberto?: string | null
  informacoes_de_conservacao?: string | null
  safra?: string | number | null
  opiniao_do_sommelier?: string | null
}
