# Guia de Bolso Viagens

Aplicação web responsiva para organizar viagens, desenvolvida em HTML, CSS e JavaScript puro. Não exige instalação de dependências nem etapa de compilação.

## Funcionalidades

### Conversor e histórico

- Conversão entre reais e a moeda do destino, nos dois sentidos, com teclado numérico.
- Destinos: Argentina (ARS), Estados Unidos (USD), Canadá (CAD), Reino Unido (GBP) e Espanha (EUR).
- Cotações pela AwesomeAPI, com atualização manual e automática a cada 60 segundos.
- Salvamento de conversões, histórico por dia e exclusão de registros.
- Uso da última cotação salva quando disponível, com indicação de operação offline.

### Gastos

- Lançamentos com descrição, valor na moeda do destino, data e categoria.
- Prévia do equivalente em reais, valor convertido à direita do lançamento e total diário em BRL.
- A cotação fica registrada ao salvar. Atualizações posteriores não alteram os valores salvos; editar o valor usa a cotação disponível para sua moeda.
- Gastos antigos cadastrados em reais mantêm seus valores e moeda.
- Inclusão pelo botão **+**, edição, exclusão e opção de expandir ou recolher lançamentos.
- Uma cotação disponível é necessária para salvar novos gastos em moeda estrangeira.

### Explorar

- Busca de lugares em até 3 km da localização, usando OpenStreetMap e Overpass.
- Categorias: pontos turísticos, restaurantes, bares, cafés, parques, farmácias, hospital e mercados.
- Distância em linha reta e link de rota. A cobertura depende dos locais cadastrados no OpenStreetMap.

### Checklist

- Roteiro por dia com atividade, data, horário, categoria, prioridade e endereço opcional.
- Inclusão pelo botão **+**, edição, exclusão, marcação de conclusão e progresso diário.
- Link de rota e opção de expandir ou recolher atividades.

### Tradutor

- Português, espanhol, inglês, francês, italiano e alemão, com inversão de idiomas.
- Tradução online pelo MyMemory, limitada a 500 bytes por consulta. Caracteres acentuados podem ocupar mais de um byte.
- Campos de texto com duas linhas, ditado por voz, leitura do texto original e da tradução e opção de parar o áudio.
- A disponibilidade de voz depende do navegador, das permissões e das vozes instaladas no dispositivo.

### Clima

- Consulta por localização ou busca de cidade, com seleção entre resultados.
- Temperatura atual, sensação térmica, umidade e vento pela Open-Meteo.
- Previsão de cinco dias: **amanhã e os quatro dias seguintes**, no fuso do local consultado.
- Temperaturas mínima e máxima, condição e probabilidade de chuva.
- Cards ilustrados e animados conforme sol, chuva, frio ou céu nublado. As animações da previsão respeitam a preferência por movimento reduzido.
- Atualização manual e indicadores de carregamento e erro.

### SOS e aparência

- Botão **SOS** ao lado do seletor de tema, com contatos de emergência do destino selecionado.
- Números clicáveis para abrir o discador e links para fontes oficiais. Confirme o país em que você está antes de ligar.
- Temas claro e escuro e layout adaptado ao celular.

## Como executar

Na pasta do projeto, execute:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Abra **http://127.0.0.1:5500** no navegador do computador. Para encerrar o servidor, pressione `Ctrl + C` no terminal.

Para acessar pelo celular na mesma rede:

```powershell
python -m http.server 5500 --bind 0.0.0.0
```

No celular, abra `http://IP-DO-COMPUTADOR:5500`. A conexão depende da rede e do firewall.

**Localização e microfone:** utilize HTTPS para testar esses recursos no celular. Um endereço HTTP da rede local não equivale a localhost no próprio dispositivo. Abrir diretamente o arquivo `index.html` permite visualizar a interface, mas não é recomendado para testar todos os recursos.

Para hospedar o aplicativo, disponibilize os arquivos estáticos e a pasta `imagens` em um servidor HTTPS. Não há processo de build.

## Voz no Safari

Abra diretamente no Safari, permita o microfone e confira se a Siri está ativada. O ditado no Safari utiliza o serviço da Siri, conforme a [documentação do WebKit](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/).

Para ouvir, preencha o texto ou gere uma tradução e toque no botão correspondente. Confira o volume e as vozes disponíveis para o idioma no dispositivo. O aplicativo mostra mensagens quando o serviço não responde ou a permissão é negada. Como alternativa ao ditado do site, use o microfone do teclado do celular no campo de texto.

## Armazenamento dos dados

Checklist, histórico, gastos, tema e últimas cotações usam o `localStorage` do navegador. Fechar ou recarregar a página normalmente mantém os registros.

- Use o mesmo navegador, perfil e endereço para acessar seus dados.
- `localhost:5500`, `127.0.0.1:5500`, um IP de rede e um domínio publicado possuem armazenamentos separados. Alterar protocolo ou porta também muda o armazenamento utilizado.
- Limpar os dados do site, usar navegação privada ou trocar de dispositivo pode fazer os registros deixarem de estar disponíveis.
- Não há conta, sincronização entre dispositivos nem exportação ou restauração de backup implementadas.
- O service worker guarda arquivos para reabertura offline após uma primeira visita bem-sucedida em ambiente compatível. Esse cache não é um backup dos registros.
- Novas traduções, buscas de lugares, consultas de clima e atualizações de cotação precisam de conexão. Os contatos SOS estão incluídos no aplicativo.

## Estrutura do projeto

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Interface, abas e janela SOS |
| `style.css` | Layout responsivo, temas e animações |
| `script.js` | Conversor, teclado, cotações e tema |
| `conversion-history.js` | Histórico de conversões |
| `expenses.js` | Gastos diários e conversão para reais |
| `explore.js` | Navegação entre abas e lugares próximos |
| `tasks.js` | Checklist e roteiro |
| `translator.js` | Tradução, ditado e leitura em voz alta |
| `weather.js` | Busca de cidade e previsão do tempo |
| `sos.js` | Contatos de emergência por destino |
| `sw.js` | Cache dos arquivos para reabertura offline |
| `imagens/` | Bandeiras e logotipo |

## Serviços e fontes

- [AwesomeAPI](https://docs.awesomeapi.com.br/api-de-moedas): cotações.
- [OpenStreetMap](https://www.openstreetmap.org/copyright) e [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API): lugares próximos.
- [MyMemory](https://mymemory.translated.net/): traduções, sujeitas aos limites do serviço.
- [Open-Meteo](https://open-meteo.com/en/docs) e [geocodificação](https://open-meteo.com/en/docs/geocoding-api): clima e cidades.
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API): ditado e leitura em voz alta.
- SOS: [Argentina](https://www.argentina.gob.ar/tema/emergencias), [Estados Unidos](https://www.911.gov/calling-911/), [Canadá](https://parks.canada.ca/voyage-travel/securite-safety/urgence-emergency), [Reino Unido](https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers) e [Espanha](https://administracion.gob.es/en/tu-espacio-europeo/derechos-obligaciones/ciudadanos/asistencia-sanitaria/numeros-urgencia). Contatos verificados em 13/10/2026.

As integrações atuais fazem consultas diretamente pelo navegador. Credenciais privadas de serviços futuros devem ficar em um backend, fora dos arquivos públicos.

## Verificações básicas

Com Node.js instalado, verifique a sintaxe dos scripts:

```powershell
Get-ChildItem -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Confira também navegação, formulários, salvamento após recarregar, estados de erro e layout no celular. Microfone, áudio e localização precisam de validação em dispositivos reais.
