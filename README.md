# Conversor de Moedas para Viagem

Aplicação web responsiva em HTML, CSS e JavaScript puro para converter valores de **BRL** para:

- Argentina (`ARS`)
- Estados Unidos (`USD`)
- Canadá (`CAD`)
- Reino Unido (`GBP`)
- Espanha (`EUR`)

As cotações são obtidas em tempo real pela **AwesomeAPI**:
`https://economia.awesomeapi.com.br/json/last/BRL-ARS,BRL-USD,BRL-CAD,BRL-GBP,BRL-EUR`

## Estrutura dos arquivos

```text
GuiaBolsoViagens/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Funcionalidades

- Conversão automática ao digitar o valor em BRL
- Seleção de destino por bandeiras clicáveis
- Visual futurista com azul, preto e branco
- Botão para alternar entre tema escuro e claro
- Interface pensada primeiro para uso no celular
- Cotação usada na conversão
- Data e hora da última atualização
- Mensagem de carregamento
- Tratamento de erro caso a API falhe
- Atualização automática da cotação a cada 60 segundos

## Como executar

### Opção 1: abrir direto no navegador

Abra o arquivo `index.html` no navegador.

### Opção 2: rodar com servidor local

No terminal, dentro da pasta do projeto:

```bash
python -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
```

## Como a aplicação funciona

### HTML

- Estrutura a interface principal.
- Exibe o campo de BRL, a grade de bandeiras, a área de resultado e os estados da aplicação.

### CSS

- Usa layout mobile-first.
- Aplica o tema futurista com superfícies translúcidas, brilhos azuis e contraste forte.
- Inclui variações para tema escuro e claro com `data-theme`.

### JavaScript

- Busca as cotações com `fetch`.
- Atualiza a conversão quando o usuário digita ou toca em uma bandeira.
- Persiste o tema escolhido com `localStorage`.
- Exibe feedback de carregamento, erro e data de atualização.

## Sobre chave de API

Esta versão usa uma API pública sem chave obrigatória.

Se você optar por uma API com chave, não coloque essa chave no JavaScript do front-end. O ideal é:

1. Criar um back-end.
2. Guardar a chave em variável de ambiente no servidor.
3. Fazer o front-end chamar apenas o seu back-end.
4. Deixar o back-end consultar a API externa e devolver só os dados necessários.

Fluxo recomendado:

```text
Frontend -> Seu backend -> API de câmbio com chave
```

## Fonte da cotação

- AwesomeAPI Docs: https://docs.awesomeapi.com.br/api-de-moedas
