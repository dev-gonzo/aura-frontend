# AGENTS.md

## Objetivo

Este frontend do Aura deve seguir uma base modular, reaproveitável e consistente.
Nada de repetir blocos de campo, validação, modal ou botão dentro das páginas.

# Visão Geral do Sistema

O Sitema é um sistema de gerenciamento para Editoras, o objetivo é que ela possa fazer o gerenciamento de seus editais, manuscrito, produtos e autores.

O backend é feito em GO.lang e temos um projeto de migrations para criação das evoluções de banco que se encontra em `../database/migrations`.

Temos 2 frontends que consomem a aplicação, sendo uma o front da editora  `../editora-frontend` (este projeto - roda por padrão em localhost na porta 4201 ) e outro a da loja `..\loja-frontend` (roda por padrão na porta 4202).

Possuimos também um banco em PostgreSQL

## Princípios obrigatórios

- Tema sempre Dark.
- Abordagem sempre Mobile First.
- Estrutura de layout e grid deve sempre usar Bootstrap.
- Componentes Angular sempre `standalone`.
- Todo componente, página e layout Angular deve obrigatoriamente ter 3 arquivos: `.ts`, `.html` e `.css`.
- É proibido manter `template` inline ou `styles` inline em decorators.
- Reaproveitamento antes de duplicação.
- Texto de interface sempre humano e em português.
- Nunca expor nomes técnicos do backend na UI.
- Toda validação visual deve seguir o mesmo padrão do sistema.

## Estrutura de pastas

### Shared

Componentes visuais e reutilizáveis devem ficar em `src/app/shared/components`, agrupados por tipo:

```text
shared/components/
  actions/
    button/
  feedback/
    modal/
  forms/
    checkbox/
    input/
    textarea/
  layout/
    page-header/
```

### Core

Helpers, validators e utilitários sem responsabilidade visual devem ficar em `src/app/core`:

```text
core/
  utils/
    masks.ts
    process-api-error.ts
  validators/
    max-word-count.validator.ts
    password-confirmation.validator.ts
```

### Feature

Componentes com regra de negócio específica da feature devem ficar dentro da própria feature:

```text
features/auth/components/
features/usuarios/components/
```

Exemplo: um formulário de troca de senha específico de autenticação deve ficar em `features/auth/components`.

## Regras de criação de componentes

- Se um bloco visual aparece em mais de uma tela, ele deve virar componente.
- Se um campo repete `label + input + erro + helper`, ele não deve ficar inline na página.
- O arquivo `.ts` deve ficar apenas com lógica, imports e metadata apontando para `templateUrl` e `styleUrl`.
- O arquivo `.html` deve concentrar toda a marcação da tela ou componente.
- Deve sempre priorizar o uso do Bootstrap (style)
- O arquivo `.css` deve concentrar todo o estilo local do componente.
- Componentes base não podem conhecer regra de negócio do backend.
- Componentes base recebem estado por `@Input` e emitem eventos quando necessário.
- Páginas devem orquestrar dados, navegação e integração com services.
- Components de `shared` não devem depender de arquivos de uma feature.
- Components de `feature` podem depender de `shared` e `core`.

## Regras para formulários

- Todo campo visual deve usar componente do grupo `forms`.
- Inputs simples usam `forms/input`.
- Textareas usam `forms/textarea`.
- Checkboxes usam `forms/checkbox`.
- Máscaras não ficam dentro do componente visual.
- Máscaras devem ser centralizadas em `core/utils/masks.ts`.
- Validators reutilizáveis devem ficar em `core/validators`.
- Mapeamento de erro de API deve acontecer na página ou em helper de feature, nunca dentro do input base.

## Regras de erro e validação

Estas regras são obrigatórias:

- O erro deve aparecer no campo.
- O label do campo deve ficar vermelho quando houver erro.
- A borda do campo deve ficar vermelha quando houver erro.
- O helper de erro deve ficar abaixo do campo.
- Campos só devem exibir erro visual após tentativa de envio do formulário (submit).
- Não exibir erro visual baseado em `touched`/`blur` (o usuário pode navegar pelos campos sem “tomar vermelho” antes de tentar salvar).
- Não usar banner genérico para erro de validação de formulário.
- Mensagens técnicas do backend devem ser traduzidas para texto humano.
- Nunca mostrar nomes como `endereco_principal`, `nome_completo`, `data_nascimento` ou qualquer outro `snake_case`.

## Regras para textos da UI

- A UI deve usar linguagem humana.
- Labels devem ser escritos como o usuário lê, por exemplo:
  - `Endereço Principal`
  - `Nome completo`
  - `Data de nascimento`
- Não expor nome de service, nome de endpoint, nome de payload ou nome interno de banco.
- Evitar textos de regra de negócio na interface quando isso não ajuda a tarefa do usuário.

## Regras para modais

- Todo modal novo deve usar `shared/components/feedback/modal`.
- Cabeçalho, corpo e rodapé devem seguir o mesmo visual dark.
- Formulários dentro de modal devem reutilizar os componentes de `forms`.
- Modal não deve reimplementar estilos de campo localmente.

## Regras para botões

- Botões visuais reutilizáveis devem usar `shared/components/actions/button`.
- Evitar criar uma classe nova de botão em cada página.
- Variantes devem ser resolvidas por input do componente, não por duplicação de marcação.

## Regras para helpers

- Qualquer máscara reutilizável deve ir para `core/utils/masks.ts`.
- Qualquer parser de erro reutilizável deve ir para `core/utils/process-api-error.ts`.
- Qualquer validator compartilhado deve ir para `core/validators`.
- Não duplicar helper igual em duas páginas.

## Regras para páginas

- Página não deve concentrar marcação repetitiva de campo.
- Página deve usar componentes de `shared`.
- Página pode conter lógica de montagem de payload, busca e integração.
- Página deve ficar responsável por traduzir erro de backend para o campo certo.
- Quando um módulo administrativo já possui backend disponível, não usar `localStorage`, cache local ou fallback fake para simular persistência ou listagem.
- Toda estrutura de página deve partir de `container`, `container-fluid`, `row` e `col-*` do Bootstrap.
- Não criar estrutura principal de layout baseada em grid autoral quando o Bootstrap resolver a composição.

## Regras de estilo

- Priorizar consistência visual sobre criatividade local.
- Bootstrap é obrigatório para composição estrutural de layout, grid e responsividade.
- Não redefinir estilo de label/erro/input em cada página se já existir componente base.
- Manter bordas, foco, erro, espaçamento e contraste coerentes em todo o sistema.

## Checklist antes de finalizar qualquer alteração

- Cada componente/página/layout Angular possui `.ts`, `.html` e `.css`.
- Não existe `template` inline nem `styles` inline no decorator.
- O componente novo foi colocado na pasta correta por tipo.
- A tela reutiliza componentes existentes antes de criar novos.
- As máscaras ficaram em helper compartilhado.
- Os validators ficaram em `core/validators`.
- O erro aparece no campo correto.
- O texto exibido ao usuário está humano e em português.
- Não existe `snake_case` visível na interface.
- A estrutura principal da tela usa Bootstrap (`container`/`row`/`col`) como base.
- O arquivo está sem diagnóstico.
- O frontend compila com `npm run build`.


## Resumo rapido para agentes

Se voce acabou de chegar neste projeto, assuma o seguinte:

- e um monorepo com backend Go, admin Angular e storefront Angular
- a loja e altamente configuravel e depende de contratos entre admin, backend e frontend publico
- livro e produto
- bootstrap, dark theme e mobile first sao obrigatorios
- no admin nao pode haver inline template/style
- componentes devem ser reaproveitados antes de duplicar
- tipografia, cores, banners, cards e integracoes da loja sao areas sensiveis
- salvar integracoes nao deve publicar o resto do rascunho da loja
