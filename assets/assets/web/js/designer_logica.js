// "Funções": blocos ligados por fios (estilo Blueprint) que viram código Python de verdade.
//
// D.logica = {
//   vars: [{ nome: 'pontos', tipo: 'numero', inicial: '0', global: false }],
//   nos:  [{ id: 'f1', fn: 'mudarTexto', x, y, valores: { alvo: 'e3', texto: 'Olá, {nome}!' } }],
//   fios: [{ de: 'e2:aoClicar', para: 'f1:entrada' }, { de: 'e1:texto', para: 'f1:texto' }],
//   pos:  { e2: { x, y }, tela: { x, y } },
// }
// Portas: "<no>:<porta>". Nó de elemento = id do elemento (e3). Nó da janela = "tela".
// Nos campos de texto, {nome} põe o valor de uma variável (ou de um elemento) no meio do texto.
import { nomeOk } from './designer_modelo.js';
import { ANIMACOES } from './designer_animacao.js';

export const TIPOS_PORTA = {
  exec: { nome: 'ação', cor: '#E9ECF2' },
  texto: { nome: 'texto', cor: '#F2A65A' },
  numero: { nome: 'número', cor: '#5BC8AF' },
  bool: { nome: 'sim/não', cor: '#E2657A' },
  lista: { nome: 'lista', cor: '#6FA8FF' },
  qualquer: { nome: 'qualquer valor', cor: '#A88BFA' },
};
export const TIPOS_VAR = [['texto', 'Texto'], ['numero', 'Número'], ['bool', 'Sim/Não'], ['lista', 'Lista']];

// Saídas de cada tipo de elemento: eventos (exec) e valores.
export const PORTAS_ELEMENTO = {
  botao: [['aoClicar', 'exec', 'Ao clicar']],
  campo: [['aoMudar', 'exec', 'Ao digitar'], ['aoEnter', 'exec', 'Ao apertar Enter'], ['texto', 'texto', 'Texto digitado']],
  area: [['texto', 'texto', 'Texto digitado']],
  numero: [['aoMudar', 'exec', 'Ao mudar'], ['valor', 'numero', 'Número']],
  caixa: [['aoMudar', 'exec', 'Ao marcar/desmarcar'], ['marcado', 'bool', 'Está marcada?']],
  opcao: [['aoMudar', 'exec', 'Ao marcar'], ['marcado', 'bool', 'Está marcada?']],
  combo: [['aoMudar', 'exec', 'Ao escolher'], ['escolhido', 'texto', 'Opção escolhida'], ['itens', 'lista', 'Todas as opções']],
  slider: [['aoMudar', 'exec', 'Ao mover'], ['valor', 'numero', 'Valor']],
  lista: [['aoMudar', 'exec', 'Ao escolher'], ['item', 'texto', 'Item escolhido'], ['itens', 'lista', 'Todos os itens']],
  texto: [['texto', 'texto', 'Texto atual']],
};
export const PORTAS_TELA = [['aoAbrir', 'exec', 'Ao abrir a janela'], ['aoFechar', 'exec', 'Ao fechar a janela']];

// Que elementos cada tipo de parâmetro "elemento" aceita.
export const ALVOS = {
  'elemento:texto': ['texto', 'botao', 'campo', 'area', 'caixa', 'opcao'],
  'elemento:qualquer': null, // todos
  'elemento:campo': ['campo', 'area'],
  'elemento:valor': ['progresso', 'slider', 'numero'],
  'elemento:lista': ['lista', 'combo'],
  'elemento:listaSo': ['lista'],
  'elemento:caixa': ['caixa'],
  'elemento:foco': ['botao', 'campo', 'area', 'numero', 'caixa', 'opcao', 'combo', 'slider', 'lista', 'tabela'],
  'elemento:cor': ['texto', 'botao', 'campo', 'area', 'retangulo'],
  'elemento:imagem': ['imagem'],
  'elemento:ativavel': ['botao', 'campo', 'area', 'numero', 'caixa', 'opcao', 'combo', 'slider', 'lista', 'tabela'],
};

export const OPERADORES = [['igual', 'é igual a'], ['diferente', 'é diferente de'], ['maior', 'é maior que'], ['menor', 'é menor que'], ['maiorIgual', 'é maior ou igual a'], ['menorIgual', 'é menor ou igual a'],
  ['contem', 'contém'], ['comeca', 'começa com'], ['termina', 'termina com'], ['vazio', 'está vazio'], ['naoVazio', 'não está vazio'], ['verdadeiro', 'é sim (verdadeiro)'], ['falso', 'é não (falso)']];
const SEM_B = new Set(['vazio', 'naoVazio', 'verdadeiro', 'falso']);

const C = { basico: '#8A63D2', telas: '#C2569B', elementos: '#3A6AE0', logica: '#E0892F', tempo: '#D4A017', vars: '#2F9E6E', listas: '#3E8ED0', texto: '#1F8FA8', mat: '#16A085', perg: '#B05A3C' };

// Catálogo. entradas: [chave, tipo, rótulo, padrão, opções]. Só dá para usar o que está aqui.
// Tipos de entrada com bolinha: texto, numero, bool, qualquer, lista, cor, porVar:<campo> (o tipo da variável escolhida).
// Tipos só de escolha: elemento:*, var, var:<tipo>, escolha, tela, repeticao.
export const FUNCOES = {
  // ---------------------------------------------------------------- Básico
  print: { nome: 'Mostrar no console', grupo: 'Básico', desc: 'Escreve um valor na saída (print). Use {variavel} no texto.', cor: C.basico, exec: true, entradas: [['valor', 'qualquer', 'Valor', 'Olá!']] },
  mensagem: { nome: 'Caixa de mensagem', grupo: 'Básico', desc: 'Abre uma janelinha com um aviso.', cor: C.basico, exec: true, entradas: [['tipo', 'escolha', 'Tipo', 'info', [['info', 'ℹ Informação'], ['aviso', '⚠ Aviso'], ['erro', '✖ Erro']]], ['titulo', 'texto', 'Título', 'Aviso'], ['texto', 'qualquer', 'Mensagem', 'Deu certo!']] },
  som: { nome: 'Tocar um bipe', grupo: 'Básico', desc: 'Faz o som de aviso do sistema.', cor: C.basico, exec: true, entradas: [] },
  copiar: { nome: 'Copiar texto', grupo: 'Básico', desc: 'Põe um texto na área de transferência (Ctrl+V cola).', cor: C.basico, exec: true, entradas: [['texto', 'texto', 'Texto', '']] },
  abrirSite: { nome: 'Abrir site', grupo: 'Básico', desc: 'Abre um endereço no navegador.', cor: C.basico, exec: true, entradas: [['url', 'texto', 'Endereço', 'https://www.python.org']] },
  // ---------------------------------------------------------------- Telas
  abrirTela: { nome: 'Abrir outra tela', grupo: 'Telas', desc: 'Abre uma telinha do projeto. Clique na miniatura para ligar os botões dela.', cor: C.telas, exec: true, entradas: [['tela', 'tela', 'Tela', ''], ['jeito', 'escolha', 'Jeito', 'janela', [['janela', 'Janela separada'], ['travar', 'Na frente, travando esta']]]] },
  fechar: { nome: 'Fechar esta tela', grupo: 'Telas', desc: 'Fecha a janela onde o botão está.', cor: C.telas, exec: true, entradas: [] },
  sair: { nome: 'Fechar o programa', grupo: 'Telas', desc: 'Fecha todas as janelas e termina o programa.', cor: C.telas, exec: true, entradas: [] },
  mudarTitulo: { nome: 'Mudar título da janela', grupo: 'Telas', desc: 'Troca o texto da barra de título.', cor: C.telas, exec: true, entradas: [['texto', 'texto', 'Título', 'Minha janela']] },
  // ---------------------------------------------------------------- Elementos
  mudarTexto: { nome: 'Mudar o texto', grupo: 'Elementos', desc: 'Troca o texto de um rótulo, botão ou campo.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:texto', 'Elemento', ''], ['texto', 'qualquer', 'Novo texto', '']] },
  limpar: { nome: 'Limpar campo', grupo: 'Elementos', desc: 'Apaga o que foi digitado num campo.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:campo', 'Campo', '']] },
  esconder: { nome: 'Esconder elemento', grupo: 'Elementos', desc: 'Faz um elemento sumir da tela.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:qualquer', 'Elemento', '']] },
  mostrar: { nome: 'Mostrar elemento', grupo: 'Elementos', desc: 'Faz um elemento escondido aparecer.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:qualquer', 'Elemento', '']] },
  animar: { nome: 'Animar elemento', grupo: 'Elementos', desc: 'Faz o elemento se mexer: aparecer, sumir, pulsar, tremer, piscar…', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:qualquer', 'Elemento', ''], ['efeito', 'escolha', 'Efeito', 'pulsar', ANIMACOES], ['ms', 'numero', 'Duração (ms)', '400']] },
  alternar: { nome: 'Mostrar/esconder (alternar)', grupo: 'Elementos', desc: 'Se está aparecendo, esconde; se está escondido, mostra.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:qualquer', 'Elemento', '']] },
  habilitar: { nome: 'Habilitar elemento', grupo: 'Elementos', desc: 'Deixa clicar/digitar de novo.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:ativavel', 'Elemento', '']] },
  desabilitar: { nome: 'Desabilitar elemento', grupo: 'Elementos', desc: 'Deixa o elemento cinza, sem poder usar.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:ativavel', 'Elemento', '']] },
  focar: { nome: 'Pôr o cursor em', grupo: 'Elementos', desc: 'Deixa o elemento pronto para digitar (foco).', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:foco', 'Elemento', '']] },
  mudarCor: { nome: 'Mudar a cor', grupo: 'Elementos', desc: 'Troca a cor do fundo ou das letras.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:cor', 'Elemento', ''], ['parte', 'escolha', 'Parte', 'fundo', [['fundo', 'Fundo'], ['texto', 'Letras']]], ['cor', 'cor', 'Cor', '#E2657A']] },
  definirValor: { nome: 'Mudar o valor', grupo: 'Elementos', desc: 'Muda o número de uma barra de progresso, slider ou campo de número.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:valor', 'Elemento', ''], ['valor', 'numero', 'Valor', '50']] },
  marcar: { nome: 'Marcar caixa', grupo: 'Elementos', desc: 'Marca, desmarca ou inverte uma caixa de seleção.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:caixa', 'Caixa', ''], ['acao', 'escolha', 'Fazer', 'marcar', [['marcar', 'Marcar'], ['desmarcar', 'Desmarcar'], ['inverter', 'Inverter']]]] },
  adicionarItem: { nome: 'Adicionar item', grupo: 'Elementos', desc: 'Põe um item novo numa lista ou lista suspensa.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:lista', 'Lista', ''], ['texto', 'qualquer', 'Item', 'Novo item']] },
  removerSelecionado: { nome: 'Tirar item escolhido', grupo: 'Elementos', desc: 'Remove da lista o item que está selecionado.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:listaSo', 'Lista', '']] },
  limparLista: { nome: 'Esvaziar lista', grupo: 'Elementos', desc: 'Tira todos os itens de uma lista ou lista suspensa.', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:lista', 'Lista', '']] },
  mudarImagem: { nome: 'Trocar imagem', grupo: 'Elementos', desc: 'Mostra outro arquivo de imagem (da pasta assets).', cor: C.elementos, exec: true, entradas: [['alvo', 'elemento:imagem', 'Imagem', ''], ['arquivo', 'texto', 'Arquivo', 'assets/imagem.png']] },
  // ---------------------------------------------------------------- Lógica
  se: { nome: 'Se… senão', grupo: 'Lógica', desc: 'Faz uma coisa ou outra dependendo de uma comparação.', cor: C.logica, exec: true, saidas: [['entao', 'exec', 'Então'], ['senao', 'exec', 'Senão']], entradas: [['a', 'qualquer', 'Valor', ''], ['op', 'escolha', 'Comparação', 'igual', OPERADORES], ['b', 'qualquer', 'Com', '']] },
  seSim: { nome: 'Se for sim', grupo: 'Lógica', desc: 'Segue por “Sim” ou “Não” conforme um valor sim/não (ex.: caixa marcada).', cor: C.logica, exec: true, saidas: [['entao', 'exec', 'Sim'], ['senao', 'exec', 'Não']], entradas: [['cond', 'bool', 'Condição', 'sim']] },
  parar: { nome: 'Parar aqui', grupo: 'Lógica', desc: 'Não faz mais nada desta sequência. Em “Ao fechar”, cancela o fechamento.', cor: C.logica, exec: true, saidas: [], entradas: [] },
  comparar: { nome: 'Comparar', grupo: 'Lógica', desc: 'Dá sim/não comparando dois valores.', cor: C.logica, dados: true, saida: ['resultado', 'bool', 'Resultado'], entradas: [['a', 'qualquer', 'Valor', ''], ['op', 'escolha', 'Comparação', 'igual', OPERADORES], ['b', 'qualquer', 'Com', '']] },
  eOu: { nome: 'E / Ou', grupo: 'Lógica', desc: '“E”: os dois precisam ser sim. “Ou”: basta um.', cor: C.logica, dados: true, saida: ['resultado', 'bool', 'Resultado'], entradas: [['a', 'bool', 'Condição 1', 'sim'], ['op', 'escolha', 'Jeito', 'e', [['e', 'E (os dois)'], ['ou', 'Ou (pelo menos um)']]], ['b', 'bool', 'Condição 2', 'sim']] },
  nao: { nome: 'Não (inverter)', grupo: 'Lógica', desc: 'Sim vira não e não vira sim.', cor: C.logica, dados: true, saida: ['resultado', 'bool', 'Invertido'], entradas: [['a', 'bool', 'Condição', 'sim']] },
  // ---------------------------------------------------------------- Repetir e tempo
  repetir: { nome: 'Repetir N vezes', grupo: 'Repetir e tempo', desc: 'Faz a sequência “Cada volta” várias vezes, depois segue.', cor: C.tempo, exec: true, saidas: [['cada', 'exec', 'Cada volta'], ['depois', 'exec', 'Depois']], saidasDados: [['volta', 'numero', 'Número da volta']], entradas: [['vezes', 'numero', 'Vezes', '3']] },
  paraCada: { nome: 'Para cada item', grupo: 'Repetir e tempo', desc: 'Faz “Cada item” uma vez para cada item de uma lista.', cor: C.tempo, exec: true, saidas: [['cada', 'exec', 'Cada item'], ['depois', 'exec', 'Depois']], saidasDados: [['item', 'qualquer', 'Item']], entradas: [['lista', 'lista', 'Lista', '']] },
  esperar: { nome: 'Esperar segundos', grupo: 'Repetir e tempo', desc: 'Espera um pouco (sem travar a janela) e depois segue.', cor: C.tempo, exec: true, entradas: [['segundos', 'numero', 'Segundos', '1']] },
  aCada: { nome: 'Repetir a cada X segundos', grupo: 'Repetir e tempo', desc: 'Liga um cronômetro: roda “A cada vez” sem parar (bom para relógios e jogos).', cor: C.tempo, exec: true, saidas: [['cada', 'exec', 'A cada vez'], ['depois', 'exec', 'Depois de ligar']], entradas: [['segundos', 'numero', 'Segundos', '1']] },
  pararRepeticao: { nome: 'Parar repetição', grupo: 'Repetir e tempo', desc: 'Desliga um cronômetro “Repetir a cada X segundos”.', cor: C.tempo, exec: true, entradas: [['qual', 'repeticao', 'Qual', '']] },
  agora: { nome: 'Data e hora agora', grupo: 'Repetir e tempo', desc: 'Dá a hora, a data ou o dia da semana de agora.', cor: C.tempo, dados: true, saida: ['texto', 'texto', 'Texto'], entradas: [['formato', 'escolha', 'Formato', 'hora', [['hora', 'Hora (14:05)'], ['horaSeg', 'Hora com segundos'], ['data', 'Data (09/11/2026)'], ['dataHora', 'Data e hora'], ['diaSemana', 'Dia da semana']]]] },
  // ---------------------------------------------------------------- Variáveis
  definirVar: { nome: 'Mudar variável', grupo: 'Variáveis', desc: 'Guarda um valor na variável.', cor: C.vars, exec: true, entradas: [['nome', 'var', 'Variável', ''], ['valor', 'porVar:nome', 'Valor', '']] },
  somarVar: { nome: 'Somar na variável', grupo: 'Variáveis', desc: 'Soma um número na variável (ótimo para contar cliques). Use -1 para diminuir.', cor: C.vars, exec: true, entradas: [['nome', 'var:numero', 'Variável', ''], ['valor', 'numero', 'Quanto', '1']] },
  alternarVar: { nome: 'Inverter sim/não', grupo: 'Variáveis', desc: 'Se a variável é sim, vira não (e o contrário).', cor: C.vars, exec: true, entradas: [['nome', 'var:bool', 'Variável', '']] },
  lerVar: { nome: 'Valor da variável', grupo: 'Variáveis', desc: 'Pega o que está guardado numa variável.', cor: C.vars, dados: true, saida: ['valor', 'porVar:nome', 'Valor'], entradas: [['nome', 'var', 'Variável', '']] },
  // ---------------------------------------------------------------- Listas
  adicionarNaLista: { nome: 'Pôr na lista', grupo: 'Listas', desc: 'Põe um item no fim de uma variável do tipo lista.', cor: C.listas, exec: true, entradas: [['nome', 'var:lista', 'Lista', ''], ['valor', 'qualquer', 'Item', '']] },
  removerDaLista: { nome: 'Tirar da lista', grupo: 'Listas', desc: 'Tira um item de uma variável do tipo lista.', cor: C.listas, exec: true, entradas: [['nome', 'var:lista', 'Lista', ''], ['valor', 'qualquer', 'Item', '']] },
  esvaziarVarLista: { nome: 'Esvaziar variável lista', grupo: 'Listas', desc: 'Deixa a lista sem nenhum item.', cor: C.listas, exec: true, entradas: [['nome', 'var:lista', 'Lista', '']] },
  tamanhoLista: { nome: 'Quantos itens', grupo: 'Listas', desc: 'Conta os itens de uma lista.', cor: C.listas, dados: true, saida: ['n', 'numero', 'Quantidade'], entradas: [['lista', 'lista', 'Lista', '']] },
  itemDaLista: { nome: 'Item número…', grupo: 'Listas', desc: 'Pega o item de uma posição (1 = primeiro).', cor: C.listas, dados: true, saida: ['item', 'qualquer', 'Item'], entradas: [['lista', 'lista', 'Lista', ''], ['n', 'numero', 'Posição', '1']] },
  itemAleatorio: { nome: 'Item sorteado', grupo: 'Listas', desc: 'Sorteia um item da lista.', cor: C.listas, dados: true, saida: ['item', 'qualquer', 'Item'], entradas: [['lista', 'lista', 'Lista', '']] },
  listaTem: { nome: 'Lista tem o item?', grupo: 'Listas', desc: 'Sim se o item está na lista.', cor: C.listas, dados: true, saida: ['r', 'bool', 'Tem?'], entradas: [['lista', 'lista', 'Lista', ''], ['valor', 'qualquer', 'Item', '']] },
  juntarLista: { nome: 'Lista em texto', grupo: 'Listas', desc: 'Junta os itens num texto só (ex.: “a, b, c”).', cor: C.listas, dados: true, saida: ['texto', 'texto', 'Texto'], entradas: [['lista', 'lista', 'Lista', ''], ['sep', 'texto', 'Separador', ', ']] },
  // ---------------------------------------------------------------- Texto
  formatar: { nome: 'Texto com variáveis', grupo: 'Texto', desc: 'Monta um texto com {variaveis} no meio. Ex.: “Olá, {nome}!”', cor: C.texto, dados: true, saida: ['resultado', 'texto', 'Texto'], entradas: [['modelo', 'texto', 'Modelo', 'Olá, {nome}!']] },
  juntar: { nome: 'Juntar textos', grupo: 'Texto', desc: 'Cola dois textos (ex.: "Olá, " + nome).', cor: C.texto, dados: true, saida: ['resultado', 'texto', 'Resultado'], entradas: [['a', 'qualquer', 'Texto 1', 'Olá, '], ['b', 'qualquer', 'Texto 2', '']] },
  transformar: { nome: 'Mudar letras', grupo: 'Texto', desc: 'MAIÚSCULAS, minúsculas, Primeira Maiúscula ou tirar espaços das pontas.', cor: C.texto, dados: true, saida: ['resultado', 'texto', 'Resultado'], entradas: [['texto', 'texto', 'Texto', ''], ['modo', 'escolha', 'Jeito', 'maiusculas', [['maiusculas', 'MAIÚSCULAS'], ['minusculas', 'minúsculas'], ['titulo', 'Primeira Maiúscula'], ['aparar', 'Tirar espaços das pontas']]]] },
  substituir: { nome: 'Trocar pedaço do texto', grupo: 'Texto', desc: 'Troca todo pedaço igual por outro.', cor: C.texto, dados: true, saida: ['resultado', 'texto', 'Resultado'], entradas: [['texto', 'texto', 'Texto', ''], ['de', 'texto', 'Trocar', 'a'], ['para', 'texto', 'Por', 'b']] },
  tamanhoTexto: { nome: 'Tamanho do texto', grupo: 'Texto', desc: 'Quantas letras o texto tem.', cor: C.texto, dados: true, saida: ['n', 'numero', 'Letras'], entradas: [['texto', 'texto', 'Texto', '']] },
  paraNumero: { nome: 'Texto para número', grupo: 'Texto', desc: 'Transforma "12,5" em 12.5 (texto inválido vira 0).', cor: C.texto, dados: true, saida: ['n', 'numero', 'Número'], entradas: [['texto', 'texto', 'Texto', '0']] },
  formatarNumero: { nome: 'Número bonito', grupo: 'Texto', desc: 'Escreve o número com casas decimais (ex.: 3,50).', cor: C.texto, dados: true, saida: ['texto', 'texto', 'Texto'], entradas: [['valor', 'numero', 'Número', '0'], ['casas', 'escolha', 'Casas', '2', [['0', '0 casas'], ['1', '1 casa'], ['2', '2 casas'], ['3', '3 casas']]], ['sep', 'escolha', 'Separador', 'virgula', [['virgula', 'Vírgula (3,50)'], ['ponto', 'Ponto (3.50)']]]] },
  // ---------------------------------------------------------------- Matemática
  conta: { nome: 'Conta', grupo: 'Matemática', desc: 'Soma, subtrai, multiplica, divide, resto ou potência.', cor: C.mat, dados: true, saida: ['resultado', 'numero', 'Resultado'], entradas: [['a', 'numero', 'Número 1', '0'], ['op', 'escolha', 'Conta', '+', [['+', '+ somar'], ['-', '− subtrair'], ['*', '× multiplicar'], ['/', '÷ dividir'], ['%', 'resto da divisão'], ['**', 'potência']]], ['b', 'numero', 'Número 2', '0']] },
  somar: { nome: 'Somar números', grupo: 'Matemática', desc: 'Soma dois números.', cor: C.mat, dados: true, saida: ['resultado', 'numero', 'Soma'], entradas: [['a', 'numero', 'Número 1', '0'], ['b', 'numero', 'Número 2', '0']] },
  arredondar: { nome: 'Arredondar', grupo: 'Matemática', desc: 'Arredonda, para cima ou para baixo.', cor: C.mat, dados: true, saida: ['resultado', 'numero', 'Resultado'], entradas: [['valor', 'numero', 'Número', '0'], ['modo', 'escolha', 'Jeito', 'perto', [['perto', 'Mais perto'], ['cima', 'Para cima'], ['baixo', 'Para baixo']]]] },
  aleatorio: { nome: 'Número sorteado', grupo: 'Matemática', desc: 'Sorteia um número inteiro entre dois números.', cor: C.mat, dados: true, saida: ['n', 'numero', 'Sorteado'], entradas: [['de', 'numero', 'De', '1'], ['ate', 'numero', 'Até', '6']] },
  maiorMenor: { nome: 'Maior / menor', grupo: 'Matemática', desc: 'Dá o maior ou o menor de dois números.', cor: C.mat, dados: true, saida: ['n', 'numero', 'Resultado'], entradas: [['a', 'numero', 'Número 1', '0'], ['op', 'escolha', 'Qual', 'max', [['max', 'O maior'], ['min', 'O menor']]], ['b', 'numero', 'Número 2', '0']] },
  matematica: { nome: 'Matemática', grupo: 'Matemática', desc: 'Raiz quadrada, valor absoluto (sem sinal) ou porcentagem.', cor: C.mat, dados: true, saida: ['n', 'numero', 'Resultado'], entradas: [['valor', 'numero', 'Número', '0'], ['op', 'escolha', 'Conta', 'raiz', [['raiz', 'Raiz quadrada'], ['abs', 'Sem sinal (absoluto)'], ['dobro', 'Dobro'], ['metade', 'Metade']]]] },
  // ---------------------------------------------------------------- Perguntas e arquivos
  perguntar: { nome: 'Perguntar sim ou não', grupo: 'Perguntas e arquivos', desc: 'Abre uma pergunta com botões Sim e Não.', cor: C.perg, exec: true, saidas: [['sim', 'exec', 'Sim'], ['nao', 'exec', 'Não']], entradas: [['titulo', 'texto', 'Título', 'Pergunta'], ['texto', 'texto', 'Pergunta', 'Tem certeza?']] },
  pedirTexto: { nome: 'Pedir um texto', grupo: 'Perguntas e arquivos', desc: 'Abre uma caixinha para digitar e guarda a resposta numa variável.', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Respondeu'], ['cancelou', 'exec', 'Cancelou']], entradas: [['titulo', 'texto', 'Título', 'Pergunta'], ['texto', 'texto', 'Pergunta', 'Qual é o seu nome?'], ['nome', 'var', 'Guardar em', '']] },
  pedirNumero: { nome: 'Pedir um número', grupo: 'Perguntas e arquivos', desc: 'Abre uma caixinha para digitar um número e guarda na variável.', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Respondeu'], ['cancelou', 'exec', 'Cancelou']], entradas: [['titulo', 'texto', 'Título', 'Pergunta'], ['texto', 'texto', 'Pergunta', 'Quantos anos você tem?'], ['nome', 'var:numero', 'Guardar em', '']] },
  escolherArquivo: { nome: 'Escolher arquivo', grupo: 'Perguntas e arquivos', desc: 'Abre a janela do Windows para escolher um arquivo e guarda o caminho.', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Escolheu'], ['cancelou', 'exec', 'Cancelou']], entradas: [['modo', 'escolha', 'Para', 'abrir', [['abrir', 'Abrir'], ['salvar', 'Salvar como']]], ['titulo', 'texto', 'Título', 'Escolha um arquivo'], ['nome', 'var', 'Guardar em', '']] },
  escolherCor: { nome: 'Escolher cor', grupo: 'Perguntas e arquivos', desc: 'Abre a paleta de cores e guarda a cor escolhida (ex.: #FF0000).', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Escolheu'], ['cancelou', 'exec', 'Cancelou']], entradas: [['nome', 'var', 'Guardar em', '']] },
  salvarArquivo: { nome: 'Salvar em arquivo', grupo: 'Perguntas e arquivos', desc: 'Escreve um texto num arquivo (substitui ou acrescenta no fim).', cor: C.perg, exec: true, entradas: [['arquivo', 'texto', 'Arquivo', 'dados.txt'], ['texto', 'texto', 'Texto', ''], ['modo', 'escolha', 'Jeito', 'fim', [['fim', 'Acrescentar uma linha no fim'], ['substituir', 'Substituir tudo']]]] },
  lerArquivo: { nome: 'Ler arquivo', grupo: 'Perguntas e arquivos', desc: 'Lê um arquivo de texto e guarda o conteúdo (ou as linhas, se a variável for lista).', cor: C.perg, exec: true, saidas: [['depois', 'exec', 'Leu'], ['erro', 'exec', 'Não achou']], entradas: [['arquivo', 'texto', 'Arquivo', 'dados.txt'], ['nome', 'var', 'Guardar em', '']] },
};

export const GRUPOS_FUNCAO = ['Básico', 'Telas', 'Elementos', 'Lógica', 'Repetir e tempo', 'Variáveis', 'Listas', 'Texto', 'Matemática', 'Perguntas e arquivos'];

// ====================================================================== projeto (as outras telas)
let PROJ = { telas: [] };
/** Avisa quais telas o projeto tem (os designs salvos). Usado para "Abrir outra tela" e variáveis compartilhadas. */
export function definirProjeto(telas) { PROJ = { telas: (telas || []).filter((t) => t && t.nome) }; }
export const telasDoProjeto = () => PROJ.telas;

/** Variáveis compartilhadas que vêm de outras telas. */
function globaisDeFora(D) {
  const out = [];
  for (const t of PROJ.telas) {
    if (t.nome === D.nome) continue;
    for (const v of (t.logica && t.logica.vars) || []) if (v && v.global && nomeOk(v.nome) && !out.some((x) => x.nome === v.nome)) out.push({ ...v, tela: t.nome });
  }
  return out;
}
/** Todas as variáveis que esta tela enxerga: as dela + as compartilhadas das outras. */
export function variaveisVisiveis(D) {
  const proprias = (D.logica && D.logica.vars) || [];
  return [...proprias, ...globaisDeFora(D).filter((g) => !proprias.some((v) => v.nome === g.nome))];
}
export const acharVar = (nome, D) => variaveisVisiveis(D).find((v) => v.nome === nome) || null;

// ====================================================================== portas
const PORTAVEIS = new Set(['texto', 'numero', 'bool', 'qualquer', 'lista', 'cor']);
export const ehPorta = (tipo) => PORTAVEIS.has(tipo) || tipo.startsWith('porVar:');
/** Tipo real de uma entrada/saída (resolve "cor" e "porVar:"). */
export function resolverTipo(tipo, no, D) {
  if (tipo === 'cor') return 'texto';
  if (tipo.startsWith('porVar:')) { const v = acharVar(no.valores[tipo.slice(7)], D); return v ? v.tipo : 'qualquer'; }
  return tipo;
}

/** Lista as portas de um nó: [{chave, tipo, rotulo, dir: 'in'|'out'}] */
export function portasDoNo(no, D) {
  if (no === 'tela') return PORTAS_TELA.map(([chave, tipo, rotulo]) => ({ chave, tipo, rotulo, dir: 'out' }));
  const e = D.elementos.find((x) => x.id === no);
  if (e) return (PORTAS_ELEMENTO[e.tipo] || []).map(([chave, tipo, rotulo]) => ({ chave, tipo, rotulo, dir: 'out' }));
  const n = ((D.logica && D.logica.nos) || []).find((x) => x.id === no);
  if (!n) return [];
  const F = FUNCOES[n.fn];
  const out = [];
  if (F.exec) out.push({ chave: 'entrada', tipo: 'exec', rotulo: '', dir: 'in' });
  for (const [chave, tipo, rotulo] of F.entradas) if (ehPorta(tipo)) out.push({ chave, tipo: resolverTipo(tipo, n, D), rotulo, dir: 'in' });
  if (F.exec) for (const [chave, tipo, rotulo] of F.saidas || [['depois', 'exec', 'Depois']]) out.push({ chave, tipo, rotulo, dir: 'out' });
  for (const [chave, tipo, rotulo] of F.saidasDados || []) out.push({ chave, tipo, rotulo, dir: 'out' });
  if (F.dados) out.push({ chave: F.saida[0], tipo: resolverTipo(F.saida[1], n, D), rotulo: F.saida[2], dir: 'out' });
  return out;
}

/** O fio de uma porta de saída (tipo de) pode ir para a porta de entrada (tipo para)? */
export function compativel(de, para) {
  if (de === 'exec' || para === 'exec') return de === para;
  if (para === 'qualquer' || de === 'qualquer') return true;
  if (para === 'texto') return true; // número, sim/não e lista viram texto
  if (para === 'numero') return de === 'numero' || de === 'texto';
  if (para === 'bool') return de === 'bool';
  if (para === 'lista') return de === 'lista';
  return de === para;
}

export function logicaVazia() { return { vars: [], nos: [], fios: [], pos: {} }; }

const ehVarCampo = (tipo) => tipo === 'var' || tipo.startsWith('var:');

/** Limpa a lógica: tira blocos desconhecidos e fios que apontam para coisas que não existem. */
export function normalizarLogica(bruta, D) {
  const L = logicaVazia();
  if (!bruta || typeof bruta !== 'object') return L;
  // variáveis
  for (const v of Array.isArray(bruta.vars) ? bruta.vars : []) {
    if (!v || !nomeOk(v.nome) || L.vars.some((x) => x.nome === v.nome)) continue;
    const tipo = TIPOS_VAR.some(([k]) => k === v.tipo) ? v.tipo : 'texto';
    L.vars.push({ nome: v.nome, tipo, inicial: String(v.inicial ?? '').slice(0, 500), global: !!v.global });
  }
  const conhecida = (nome) => L.vars.some((v) => v.nome === nome) || globaisDeFora(D).some((v) => v.nome === nome);
  // blocos
  const ids = new Set();
  for (const n of Array.isArray(bruta.nos) ? bruta.nos : []) {
    if (!n || !FUNCOES[n.fn] || !/^f\d{1,5}$/.test(n.id || '') || ids.has(n.id)) continue;
    ids.add(n.id);
    const valores = {};
    for (const [chave, tipo, , padrao, opcoes] of FUNCOES[n.fn].entradas) {
      let v = n.valores && n.valores[chave] !== undefined && n.valores[chave] !== null ? String(n.valores[chave]).slice(0, 2000) : padrao;
      if (ehVarCampo(tipo)) {
        if (v && !nomeOk(v)) v = '';
        // blocos antigos (variável digitada à mão): cria a variável sozinho
        if (v && !conhecida(v)) L.vars.push({ nome: v, tipo: tipo.startsWith('var:') ? tipo.slice(4) : 'numero', inicial: tipo === 'var:lista' || tipo === 'var:bool' ? '' : '0', global: false });
      }
      if (tipo === 'escolha' && !opcoes.some(([k]) => k === v)) v = padrao;
      if (tipo === 'bool' && v !== 'sim' && v !== 'nao') v = 'sim';
      if (tipo === 'tela' && v && !nomeOk(v)) v = '';
      if (tipo === 'cor' && !/^#[0-9a-fA-F]{6}$/.test(v) && !/\{/.test(v)) v = padrao;
      valores[chave] = v;
    }
    // compatível com a versão 0.4 (o "Se" usava o tipo "op")
    L.nos.push({ id: n.id, fn: n.fn, x: Math.round(+n.x || 0), y: Math.round(+n.y || 0), valores });
  }
  for (const n of L.nos) for (const [chave, tipo] of FUNCOES[n.fn].entradas) if (tipo === 'repeticao' && !L.nos.some((x) => x.id === n.valores[chave] && x.fn === 'aCada')) n.valores[chave] = '';
  const temp = { ...D, logica: L };
  const valida = (ref, dir) => {
    const [no, porta] = String(ref || '').split(':');
    const p = portasDoNo(no, temp).find((x) => x.chave === porta && x.dir === dir);
    return p ? p.tipo : null;
  };
  const ocupadas = new Set();
  for (const f of Array.isArray(bruta.fios) ? bruta.fios : []) {
    const td = valida(f && f.de, 'out');
    const tp = valida(f && f.para, 'in');
    if (!td || !tp || !compativel(td, tp)) continue;
    // exec: cada saída liga em um só lugar; dados: cada entrada recebe um só fio
    const chave = td === 'exec' ? 'o:' + f.de : 'i:' + f.para;
    if (ocupadas.has(chave)) continue;
    ocupadas.add(chave);
    L.fios.push({ de: f.de, para: f.para });
  }
  if (bruta.pos && typeof bruta.pos === 'object') {
    for (const [k, v] of Object.entries(bruta.pos)) {
      if ((k === 'tela' || D.elementos.some((e) => e.id === k)) && v) L.pos[k] = { x: Math.round(+v.x || 0), y: Math.round(+v.y || 0) };
    }
  }
  // alvo apontando para elemento apagado vira vazio
  for (const n of L.nos) for (const [chave, tipo] of FUNCOES[n.fn].entradas) if (tipo.startsWith('elemento') && n.valores[chave] && !D.elementos.some((e) => e.id === n.valores[chave])) n.valores[chave] = '';
  return L;
}

/** Valores que dá para pôr dentro de um texto com {nome}: variáveis e elementos que têm valor. */
export function referenciasTexto(D) {
  const out = variaveisVisiveis(D).map((v) => ({ nome: v.nome, tipo: v.tipo, de: v.tela ? `variável da tela ${v.tela}` : 'variável' }));
  for (const e of D.elementos) {
    const p = (PORTAS_ELEMENTO[e.tipo] || []).find((x) => x[1] !== 'exec' && x[1] !== 'lista');
    if (p && !out.some((x) => x.nome === e.nome)) out.push({ nome: e.nome, tipo: p[1], de: p[2].toLowerCase(), elemento: true });
  }
  return out;
}

/** Valor inicial de uma variável em Python. */
export function inicialPython(v) {
  const s = String(v.inicial ?? '');
  if (v.tipo === 'numero') { const n = Number(s.replace(',', '.')); return Number.isFinite(n) && s.trim() ? String(n) : '0'; }
  if (v.tipo === 'bool') return s === 'sim' ? 'True' : 'False';
  if (v.tipo === 'lista') return `[${s.split(',').map((x) => x.trim()).filter(Boolean).map(py).join(', ')}]`;
  return py(s);
}

/** Conteúdo do ui/estado.py (variáveis compartilhadas entre as telas). */
export function gerarEstado(telas) {
  const vistos = new Map();
  for (const t of telas) for (const v of (t.logica && t.logica.vars) || []) if (v.global && nomeOk(v.nome) && !vistos.has(v.nome)) vistos.set(v.nome, { ...v, tela: t.nome });
  if (!vistos.size) return null;
  return [
    '"""Variáveis compartilhadas entre as telas (feitas no editor de Funções do Designer).',
    '',
    'Gerado pelo Designer do PyForge: é recriado sempre que você salva uma tela.',
    'No seu código, use:  from ui import estado  e depois  estado.nome_da_variavel',
    '"""',
    '',
    ...[...vistos.values()].sort((a, b) => a.nome.localeCompare(b.nome)).map((v) => `${v.nome} = ${inicialPython(v)}  # da tela ${v.tela}`),
    '',
  ].join('\n');
}

// ====================================================================== geração de código
const py = (s) => JSON.stringify(String(s ?? ''));
const ehLiteralTexto = (x) => /^"(?:[^"\\]|\\.)*"$/.test(x);
const ehLiteralNumero = (x) => /^-?\d+(\.\d+)?$/.test(x);
const simples = (x) => /^[\w.]+(\(\))?$/.test(x) || ehLiteralTexto(x) || ehLiteralNumero(x);
const par = (x) => (simples(x) || /^[\w.]+\([^()]*\)$/.test(x) ? x : `(${x})`);
// deixa o código gerado limpo: só converte quando precisa
const txt = (x) => (ehLiteralTexto(x) || x.startsWith('str(') || /^"(?:[^"\\]|\\.)*" \+ /.test(x) || (/ \+ str\(/.test(x) && !x.includes('numero(')) ? x : `str(${x})`);
const num = (x) => {
  const m = /^"(-?\d+(?:[.,]\d+)?)"$/.exec(x);
  if (m) return String(Number(m[1].replace(',', '.')));
  return ehLiteralNumero(x) || x.startsWith('numero(') || x.startsWith('len(') || x.startsWith('random.randint(') ? x : `numero(${x})`;
};
// versões que sabem o tipo de onde o valor veio (não converte o que já é texto/número)
const comoTexto = (T) => (T.tipo === 'texto' ? T.ex : txt(T.ex));
const comoNumero = (T) => (T.tipo === 'numero' ? T.ex : num(T.ex));
const comoInteiro = (T) => (ehLiteralNumero(T.ex) ? String(Math.round(+T.ex)) : `int(${comoNumero(T)})`);
/** if/else que evita "if x: pass". */
function ramificar(ind, cond, sim, nao) {
  if (sim.length) return [`${ind}if ${cond}:`, ...sim, ...(nao.length ? [`${ind}else:`, ...nao] : [])];
  if (!nao.length) return [`${ind}if ${cond}:`, `${ind}    pass`];
  const m = /^(.+?) == (.+)$/.exec(cond);
  const neg = m && !/ == | and | or /.test(m[2]) ? `${m[1]} != ${m[2]}` : `not ${par(cond)}`;
  return [`${ind}if ${neg}:`, ...nao];
}
const inteiro = (x) => (ehLiteralNumero(x) ? String(Math.round(+x)) : `int(${num(x)})`);
const ms = (x) => (ehLiteralNumero(x) ? String(Math.max(1, Math.round(+x * 1000))) : `max(1, round(${par(num(x))} * 1000))`);
const classe = (nome) => nome.split('_').filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join('') || 'Tela';

/**
 * Gera os métodos dos fios. Devolve:
 * { metodos: linhas da classe, conexoes: Map("eId:evento" -> método), aoAbrir, aoFechar (Tk), fechaQt (bool),
 *   iniciar: linhas que criam as variáveis da tela, importa: Set, usaNumero, avisos }
 */
export function gerarFluxos(D, tk) {
  const L = D.logica || logicaVazia();
  const porId = (id) => D.elementos.find((e) => e.id === id);
  const noPorId = (id) => L.nos.find((n) => n.id === id);
  const fioDe = (ref) => L.fios.find((f) => f.de === ref);
  const fioPara = (ref) => L.fios.find((f) => f.para === ref);
  const importa = new Set();
  const avisos = [];
  const extras = [];
  const criados = new Set();

  // ---------------------------------------------------------------- variáveis
  function varExpr(nome) {
    const v = acharVar(nome, D);
    if (!v) return null;
    if (v.global || v.tela) { importa.add('estado'); return `estado.${nome}`; }
    return `self.var_${nome}`;
  }

  // ---------------------------------------------------------------- {nome} dentro dos textos
  function refExpr(nome, cx) {
    const ve = varExpr(nome);
    if (ve) return { ex: ve, tipo: acharVar(nome, D).tipo };
    const e = D.elementos.find((x) => x.nome === nome);
    const p = e && (PORTAS_ELEMENTO[e.tipo] || []).find((x) => x[1] !== 'exec' && x[1] !== 'lista');
    if (p) return { ex: expressaoElemento(e, p[0], 'qualquer'), tipo: p[1] };
    return null;
  }
  function interpolar(s, tipo, cx) {
    const partes = [];
    let ultimo = 0;
    const re = /\{([a-z_][a-z0-9_]{0,40})\}/g;
    let m;
    while ((m = re.exec(s))) {
      const r = refExpr(m[1], cx);
      if (!r) continue;
      if (m.index > ultimo) partes.push({ lit: s.slice(ultimo, m.index) });
      partes.push(r);
      ultimo = m.index + m[0].length;
    }
    if (!partes.some((p) => p.ex)) return null;
    if (ultimo < s.length) partes.push({ lit: s.slice(ultimo) });
    if (partes.length === 1) {
      const r = partes[0];
      if (tipo === 'numero') return num(r.ex);
      if (tipo === 'texto') return r.tipo === 'texto' && !r.ex.includes('(') ? `str(${r.ex})` : txt(r.ex);
      return r.ex;
    }
    const ex = partes.map((p) => (p.lit !== undefined ? py(p.lit) : p.tipo === 'texto' && !p.ex.includes(' ') ? p.ex : `str(${p.ex})`)).join(' + ');
    return tipo === 'numero' ? `numero(${ex})` : ex;
  }

  // ---------------------------------------------------------------- valores (entradas de dados)
  function literal(tipo, padrao, cx) {
    const s = String(padrao ?? '');
    if (tipo === 'bool') return s === 'nao' ? 'False' : 'True';
    if (tipo === 'lista') return `[${s.split(',').map((x) => x.trim()).filter(Boolean).map(py).join(', ')}]`;
    if (s.includes('{')) { const i = interpolar(s, tipo, cx); if (i) return i; }
    if (tipo === 'numero') { const n = Number(s.replace(',', '.')); return Number.isFinite(n) && s.trim() ? String(n) : '0'; }
    return py(s);
  }

  /** {ex, tipo} de uma entrada de um bloco. */
  function entradaTipada(no, chave, cx, visitados = new Set()) {
    const ent = FUNCOES[no.fn].entradas.find((x) => x[0] === chave);
    const tipo = resolverTipo(ent[1], no, D);
    const f = fioPara(`${no.id}:${chave}`);
    if (!f) {
      const so = /^\{([a-z_][a-z0-9_]{0,40})\}$/.exec(String(no.valores[chave] ?? '').trim());
      const r = so && tipo !== 'lista' && tipo !== 'bool' && refExpr(so[1], cx);
      if (r) return { ex: tipo === 'numero' && r.tipo !== 'numero' ? num(r.ex) : r.ex, tipo: tipo === 'numero' ? 'numero' : r.tipo };
      const ex = literal(tipo, no.valores[chave], cx);
      return { ex, tipo: ehLiteralNumero(ex) ? 'numero' : tipo };
    }
    const [orig, porta] = f.de.split(':');
    const el = porId(orig);
    if (el) {
      const p = (PORTAS_ELEMENTO[el.tipo] || []).find((x) => x[0] === porta);
      return { ex: expressaoElemento(el, porta, tipo), tipo: p ? p[1] : 'qualquer' };
    }
    const src = noPorId(orig);
    if (!src || visitados.has(src.id)) return { ex: '""', tipo: 'texto' };
    const pt = portasDoNo(src.id, D).find((x) => x.chave === porta && x.dir === 'out');
    const ex = expressaoNo(src, porta, cx, new Set([...visitados, src.id]));
    return { ex: tipo === 'numero' && pt && pt.tipo !== 'numero' ? num(ex) : ex, tipo: pt ? pt.tipo : 'qualquer' };
  }
  const valor = (no, chave, cx, vis) => entradaTipada(no, chave, cx, vis).ex;

  function comparacao(no, cx, vis) {
    const A = entradaTipada(no, 'a', cx, vis);
    const op = no.valores.op;
    if (op === 'verdadeiro') return `${par(A.ex)}`;
    if (op === 'falso') return `not ${par(A.ex)}`;
    if (op === 'vazio') return `not ${par(txt(A.ex))}.strip()`;
    if (op === 'naoVazio') return `${par(txt(A.ex))}.strip() != ""`;
    const B = entradaTipada(no, 'b', cx, vis);
    const pareceNumero = (T) => T.tipo === 'numero' || ehLiteralNumero(T.ex) || /^"-?\d+([.,]\d+)?"$/.test(T.ex);
    const n = pareceNumero(A) && pareceNumero(B) && (A.tipo === 'numero' || B.tipo === 'numero');
    const bools = A.tipo === 'bool' && B.tipo === 'bool';
    const a = bools ? A.ex : n ? comoNumero(A) : comoTexto(A);
    const b = bools ? B.ex : n ? comoNumero(B) : comoTexto(B);
    switch (op) {
      case 'igual': return `${a} == ${b}`;
      case 'diferente': return `${a} != ${b}`;
      case 'maior': return `${comoNumero(A)} > ${comoNumero(B)}`;
      case 'menor': return `${comoNumero(A)} < ${comoNumero(B)}`;
      case 'maiorIgual': return `${comoNumero(A)} >= ${comoNumero(B)}`;
      case 'menorIgual': return `${comoNumero(A)} <= ${comoNumero(B)}`;
      case 'contem': return `${txt(B.ex)} in ${txt(A.ex)}`;
      case 'comeca': return `${par(txt(A.ex))}.startswith(${txt(B.ex)})`;
      case 'termina': return `${par(txt(A.ex))}.endswith(${txt(B.ex)})`;
    }
    return 'True';
  }

  // expressão da saída de um bloco de valores
  function expressaoNo(no, porta, cx, vis) {
    const v = (k) => valor(no, k, cx, vis);
    const tv = (k) => comoTexto(entradaTipada(no, k, cx, vis));
    const nv = (k) => comoNumero(entradaTipada(no, k, cx, vis));
    const iv = (k) => comoInteiro(entradaTipada(no, k, cx, vis));
    switch (no.fn) {
      case 'repetir': if (cx.lacos.has(no.id)) return cx.lacos.get(no.id); avisos.push('“Número da volta” só funciona dentro da sequência “Cada volta”.'); return '0';
      case 'paraCada': if (cx.lacos.has(no.id)) return cx.lacos.get(no.id); avisos.push('“Item” só funciona dentro da sequência “Cada item”.'); return '""';
      case 'lerVar': { const e = varExpr(no.valores.nome); if (!e) avisos.push('Um bloco “Valor da variável” está sem variável escolhida.'); return e || '""'; }
      case 'juntar': return `${tv('a')} + ${tv('b')}`;
      case 'formatar': return tv('modelo');
      case 'somar': return `${nv('a')} + ${nv('b')}`;
      case 'conta': {
        const a = par(nv('a')), b = par(nv('b'));
        if (no.valores.op === '/') return `(${a} / ${b} if ${b} else 0)`;
        if (no.valores.op === '%') return `(${a} % ${b} if ${b} else 0)`;
        return `${a} ${no.valores.op} ${b}`;
      }
      case 'arredondar': { importa.add('math'); const x = nv('valor'); return { perto: `round(${x})`, cima: `math.ceil(${x})`, baixo: `math.floor(${x})` }[no.valores.modo]; }
      case 'aleatorio': importa.add('random'); return `random.randint(*sorted((${iv('de')}, ${iv('ate')})))`;
      case 'maiorMenor': return `${no.valores.op}(${nv('a')}, ${nv('b')})`;
      case 'matematica': {
        const x = nv('valor');
        if (no.valores.op === 'raiz') { importa.add('math'); return `math.sqrt(max(0, ${x}))`; }
        return { abs: `abs(${x})`, dobro: `${par(x)} * 2`, metade: `${par(x)} / 2` }[no.valores.op];
      }
      case 'comparar': return comparacao(no, cx, vis);
      case 'eOu': return `${par(v('a'))} ${no.valores.op === 'ou' ? 'or' : 'and'} ${par(v('b'))}`;
      case 'nao': return `not ${par(v('a'))}`;
      case 'transformar': { const t = par(tv('texto')); return { maiusculas: `${t}.upper()`, minusculas: `${t}.lower()`, titulo: `${t}.title()`, aparar: `${t}.strip()` }[no.valores.modo]; }
      case 'substituir': return `${par(tv('texto'))}.replace(${tv('de')}, ${tv('para')})`;
      case 'tamanhoTexto': return `len(${tv('texto')})`;
      case 'paraNumero': return `numero(${v('texto')})`;
      case 'formatarNumero': { const f = `format(${nv('valor')}, ${py('.' + no.valores.casas + 'f')})`; return no.valores.sep === 'virgula' ? `${f}.replace(".", ",")` : f; }
      case 'agora': {
        importa.add('datetime');
        if (no.valores.formato === 'diaSemana') return '("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")[datetime.now().weekday()]';
        const fmt = { hora: '%H:%M', horaSeg: '%H:%M:%S', data: '%d/%m/%Y', dataHora: '%d/%m/%Y %H:%M' }[no.valores.formato];
        return `datetime.now().strftime(${py(fmt)})`;
      }
      case 'tamanhoLista': return `len(${v('lista')})`;
      case 'itemDaLista': { const l = v('lista'), n = iv('n'); return `(${l}[${n} - 1] if 0 < ${n} <= len(${l}) else "")`; }
      case 'itemAleatorio': { importa.add('random'); const l = v('lista'); return `(random.choice(${l}) if ${l} else "")`; }
      case 'listaTem': return `${v('valor')} in ${v('lista')}`;
      case 'juntarLista': return `${par(tv('sep'))}.join(str(x) for x in ${v('lista')})`;
    }
    return '""';
  }

  function expressaoElemento(e, porta, tipo) {
    const n = `self.${e.nome}`;
    let ex;
    if (!tk) {
      ex = {
        'campo:texto': `${n}.text()`, 'area:texto': `${n}.toPlainText()`, 'texto:texto': `${n}.text()`,
        'numero:valor': `${n}.value()`, 'slider:valor': `${n}.value()`, 'caixa:marcado': `${n}.isChecked()`, 'opcao:marcado': `${n}.isChecked()`,
        'combo:escolhido': `${n}.currentText()`, 'lista:item': `(${n}.currentItem().text() if ${n}.currentItem() else "")`,
        'combo:itens': `[${n}.itemText(i) for i in range(${n}.count())]`, 'lista:itens': `[${n}.item(i).text() for i in range(${n}.count())]`,
      }[`${e.tipo}:${porta}`];
    } else {
      ex = {
        'campo:texto': `self.${e.nome}_texto.get()`, 'area:texto': `${n}.get("1.0", "end-1c")`, 'texto:texto': `${n}.cget("text")`,
        'numero:valor': `self.${e.nome}_valor.get()`, 'slider:valor': `round(float(${n}.get()))`, 'caixa:marcado': `self.${e.nome}_marcado.get()`,
        'opcao:marcado': `(self.grupo_${e.grupoOpcao}.get() == ${py(e.nome)})`, 'combo:escolhido': `${n}.get()`,
        'lista:item': `(${n}.get(${n}.curselection()[0]) if ${n}.curselection() else "")`,
        'combo:itens': `list(${n}["values"])`, 'lista:itens': `list(${n}.get(0, "end"))`,
      }[`${e.tipo}:${porta}`];
    }
    ex = ex || '""';
    return tipo === 'numero' && !['valor'].includes(porta) ? num(ex) : ex;
  }

  // ---------------------------------------------------------------- ações
  const PRECISA_ALVO = new Set(['mudarTexto', 'limpar', 'esconder', 'mostrar', 'animar', 'alternar', 'habilitar', 'desabilitar', 'focar', 'mudarCor', 'definirValor', 'marcar', 'adicionarItem', 'removerSelecionado', 'limparLista', 'mudarImagem']);
  const PRECISA_VAR = new Set(['definirVar', 'somarVar', 'alternarVar', 'adicionarNaLista', 'removerDaLista', 'esvaziarVarLista']);

  function instrucao(no, ind, cx) {
    const F = FUNCOES[no.fn];
    const v = (k) => valor(no, k, cx);
    const tv = (k) => comoTexto(entradaTipada(no, k, cx));
    const nv = (k) => comoNumero(entradaTipada(no, k, cx));
    const iv = (k) => comoInteiro(entradaTipada(no, k, cx));
    const alvo = porId(no.valores.alvo);
    const n = alvo ? `self.${alvo.nome}` : null;
    const L1 = (...s) => s.map((x) => ind + x);
    if (PRECISA_ALVO.has(no.fn) && !alvo) {
      avisos.push(`O bloco “${F.nome}” está sem elemento escolhido.`);
      return L1(`pass  # “${F.nome}”: escolha o elemento no editor de Funções`);
    }
    const ve = varExpr(no.valores.nome);
    if (PRECISA_VAR.has(no.fn) && !ve) {
      avisos.push(`O bloco “${F.nome}” está sem variável escolhida.`);
      return L1(`pass  # “${F.nome}”: escolha a variável no editor de Funções`);
    }
    switch (no.fn) {
      case 'print': return L1(`print(${v('valor')})`);
      case 'mensagem': {
        importa.add('mensagem');
        const t = no.valores.tipo;
        if (tk) return L1(`messagebox.${{ info: 'showinfo', aviso: 'showwarning', erro: 'showerror' }[t]}(${tv('titulo')}, ${tv('texto')}, parent=self)`);
        return L1(`QMessageBox.${{ info: 'information', aviso: 'warning', erro: 'critical' }[t]}(self, ${tv('titulo')}, ${tv('texto')})`);
      }
      case 'som': return L1(tk ? 'self.bell()' : 'QApplication.beep()');
      case 'copiar': return tk ? L1('self.clipboard_clear()', `self.clipboard_append(${tv('texto')})`) : L1(`QApplication.clipboard().setText(${tv('texto')})`);
      case 'abrirSite': importa.add('webbrowser'); return L1(`webbrowser.open(${tv('url')})`);
      case 'abrirTela': {
        const t = no.valores.tela;
        if (!t || !(t === D.nome || PROJ.telas.some((x) => x.nome === t))) {
          avisos.push('O bloco “Abrir outra tela” está sem tela escolhida.');
          return L1('pass  # “Abrir outra tela”: escolha a tela no editor de Funções');
        }
        importa.add('telas');
        const C = classe(t);
        return L1(`from ${t} import ${C}`, `self.abrir_tela(${C}${no.valores.jeito === 'travar' ? ', travar=True' : ''})`);
      }
      case 'fechar': return L1(tk ? 'self.destroy()' : 'self.close()');
      case 'sair': return L1(tk ? 'self.nametowidget(".").destroy()' : 'QApplication.quit()');
      case 'mudarTitulo': return L1(tk ? `self.title(${tv('texto')})` : `self.setWindowTitle(${tv('texto')})`);
      case 'esconder': return L1(`self.esconder(${n})`);
      case 'animar': importa.add('animar'); return L1(`self.animar(${n}, ${py(no.valores.efeito || 'pulsar')}, ${iv('ms')})`);
      case 'mostrar': return L1(`self.mostrar(${n})`);
      case 'alternar':
        if (!tk) return L1(`${n}.setVisible(not ${n}.isVisible())`);
        return L1(`if ${n}.winfo_ismapped():`, `    self.esconder(${n})`, 'else:', `    self.mostrar(${n})`);
      case 'habilitar':
      case 'desabilitar': {
        const ligar = no.fn === 'habilitar';
        if (!tk) return L1(`${n}.setEnabled(${ligar ? 'True' : 'False'})`);
        if (['combo', 'slider', 'tabela'].includes(alvo.tipo)) return L1(`${n}.state([${py(ligar ? '!disabled' : 'disabled')}])`);
        return L1(`${n}.configure(state=${py(ligar ? 'normal' : 'disabled')})`);
      }
      case 'focar': return L1(tk ? `${n}.focus_set()` : `${n}.setFocus()`);
      case 'mudarCor': {
        const c = tv('cor');
        const fundo = no.valores.parte === 'fundo';
        if (!tk) return L1(`${n}.setStyleSheet(${n}.styleSheet() + ${py(fundo ? 'background: ' : 'color: ')} + ${c} + ";")`);
        if (alvo.tipo === 'retangulo' && !fundo) return L1('pass  # retângulo não tem letras');
        return L1(`${n}.configure(${fundo ? 'bg' : 'fg'}=${c})`);
      }
      case 'mudarTexto': {
        const t = tv('texto');
        if (!tk) return L1(alvo.tipo === 'area' ? `${n}.setPlainText(${t})` : `${n}.setText(${t})`);
        if (alvo.tipo === 'campo') return L1(`self.${alvo.nome}_texto.set(${t})`);
        if (alvo.tipo === 'area') return L1(`${n}.delete("1.0", "end")`, `${n}.insert("1.0", ${t})`);
        return L1(`${n}.config(text=${t})`);
      }
      case 'limpar':
        if (!tk) return L1(`${n}.clear()`);
        return L1(alvo.tipo === 'area' ? `${n}.delete("1.0", "end")` : `self.${alvo.nome}_texto.set("")`);
      case 'definirValor': {
        const x = iv('valor');
        if (!tk) return L1(`${n}.setValue(${x})`);
        if (alvo.tipo === 'progresso') return L1(`${n}["value"] = ${x}`);
        if (alvo.tipo === 'numero') return L1(`self.${alvo.nome}_valor.set(${x})`);
        return L1(`${n}.set(${x})`);
      }
      case 'marcar': {
        const a = no.valores.acao;
        if (!tk) return L1(`${n}.setChecked(${a === 'marcar' ? 'True' : a === 'desmarcar' ? 'False' : `not ${n}.isChecked()`})`);
        const vr = `self.${alvo.nome}_marcado`;
        return L1(`${vr}.set(${a === 'marcar' ? 'True' : a === 'desmarcar' ? 'False' : `not ${vr}.get()`})`);
      }
      case 'adicionarItem': {
        const t = tv('texto');
        if (!tk) return L1(`${n}.addItem(${t})`);
        if (alvo.tipo === 'combo') return L1(`${n}["values"] = (*${n}["values"], ${t})`);
        return L1(`${n}.insert("end", ${t})`);
      }
      case 'removerSelecionado':
        if (!tk) return L1(`${n}.takeItem(${n}.currentRow())`);
        return L1(`for i in reversed(${n}.curselection()):`, `    ${n}.delete(i)`);
      case 'limparLista':
        if (!tk) return L1(`${n}.clear()`);
        if (alvo.tipo === 'combo') return L1(`${n}["values"] = ()`, `${n}.set("")`);
        return L1(`${n}.delete(0, "end")`);
      case 'mudarImagem': {
        importa.add('imagem');
        const a = tv('arquivo');
        if (tk) return L1(`self.mostrar_imagem(${n}, ${a}, ${py(alvo.ajuste || 'conter')})`);
        const modo = { conter: 'KeepAspectRatio', cobrir: 'KeepAspectRatioByExpanding', esticar: 'IgnoreAspectRatio' }[alvo.ajuste] || 'KeepAspectRatio';
        return L1(`${n}.setText("")`, `${n}.imagem_original = QPixmap(caminho(${a}))`, `${n}.ajuste_imagem = Qt.AspectRatioMode.${modo}`, 'posicionar(self, self._posicoes)');
      }
      case 'definirVar': {
        const tv = (acharVar(no.valores.nome, D) || {}).tipo;
        let x = v('valor');
        if (tv === 'numero') x = num(x); else if (tv === 'texto') x = txt(x);
        return L1(`${ve} = ${x}`);
      }
      case 'somarVar': return L1(`${ve} += ${nv('valor')}`);
      case 'alternarVar': return L1(`${ve} = not ${ve}`);
      case 'adicionarNaLista': return L1(`${ve}.append(${v('valor')})`);
      case 'removerDaLista': { const x = v('valor'); return L1(`if ${x} in ${ve}:`, `    ${ve}.remove(${x})`); }
      case 'esvaziarVarLista': return L1(`${ve}.clear()`);
      case 'pararRepeticao': {
        const q = no.valores.qual;
        if (!q) { avisos.push('O bloco “Parar repetição” está sem repetição escolhida.'); return L1('pass  # “Parar repetição”: escolha qual no editor de Funções'); }
        importa.add('repetir');
        return L1(`self.parar_repeticao(${py(q)})`);
      }
      case 'salvarArquivo': {
        const a = tv('arquivo'), t = tv('texto');
        if (no.valores.modo === 'substituir') return L1(`Path(${a}).write_text(${t}, encoding="utf-8")`);
        return L1(`with open(${a}, "a", encoding="utf-8") as arquivo:`, `    arquivo.write(${t} + "\\n")`);
      }
    }
    return L1('pass');
  }

  // ---------------------------------------------------------------- blocos que dividem o caminho
  function ramos(no, chaves, ind, vis, cx) {
    return chaves.map((k) => cadeia(`${no.id}:${k}`, ind + '    ', new Set(vis), cx));
  }
  const ou = (linhas, ind) => (linhas.length ? linhas : [ind + '    pass']);

  function criarMetodo(nome, ref, doc) {
    if (criados.has(nome)) return;
    criados.add(nome);
    const corpo = cadeia(ref, '        ', new Set(), { lacos: new Map(), fechar: false });
    extras.push('', `    def ${nome}(self, *args):`, `        """${doc}"""`, ...(corpo.length ? corpo : ['        pass']));
  }

  function cadeia(ref, ind, visitados, cx) {
    const linhas = [];
    let f = fioDe(ref);
    while (f) {
      const [alvoId] = f.para.split(':');
      const no = noPorId(alvoId);
      if (!no || visitados.has(no.id)) break;
      visitados.add(no.id);
      const id = no.id;
      if (no.fn === 'se' || no.fn === 'seSim') {
        const cond = no.fn === 'se' ? comparacao(no, cx) : valor(no, 'cond', cx);
        const [entao, senao] = ramos(no, ['entao', 'senao'], ind, visitados, cx);
        linhas.push(...ramificar(ind, cond, entao, senao));
        break;
      }
      if (no.fn === 'perguntar') {
        importa.add('mensagem');
        const t = comoTexto(entradaTipada(no, 'titulo', cx)), p = comoTexto(entradaTipada(no, 'texto', cx));
        const cond = tk ? `messagebox.askyesno(${t}, ${p}, parent=self)` : `QMessageBox.question(self, ${t}, ${p}) == QMessageBox.StandardButton.Yes`;
        const [sim, nao] = ramos(no, ['sim', 'nao'], ind, visitados, cx);
        linhas.push(...ramificar(ind, cond, sim, nao));
        break;
      }
      if (['pedirTexto', 'pedirNumero', 'escolherArquivo', 'escolherCor', 'lerArquivo'].includes(no.fn)) {
        const ve = varExpr(no.valores.nome);
        const tv = (acharVar(no.valores.nome, D) || {}).tipo;
        if (!ve) { avisos.push(`O bloco “${FUNCOES[no.fn].nome}” está sem variável para guardar.`); linhas.push(`${ind}pass  # “${FUNCOES[no.fn].nome}”: escolha a variável no editor de Funções`); break; }
        const [ok, nao] = ramos(no, [no.fn === 'lerArquivo' ? 'depois' : 'depois', no.fn === 'lerArquivo' ? 'erro' : 'cancelou'], ind, visitados, cx);
        const i2 = ind + '    ';
        if (no.fn === 'lerArquivo') {
          const a = comoTexto(entradaTipada(no, 'arquivo', cx));
          const leitura = tv === 'lista' ? `Path(${a}).read_text(encoding="utf-8").splitlines()` : `Path(${a}).read_text(encoding="utf-8")`;
          linhas.push(`${ind}try:`, `${i2}${ve} = ${leitura}`, `${ind}except OSError:`, ...ou(nao, ind));
          if (ok.length) linhas.push(`${ind}else:`, ...ok);
          break;
        }
        let pre, cond, guardar;
        if (no.fn === 'pedirTexto' || no.fn === 'pedirNumero') {
          const t = comoTexto(entradaTipada(no, 'titulo', cx)), p = comoTexto(entradaTipada(no, 'texto', cx));
          const numero = no.fn === 'pedirNumero';
          if (tk) { importa.add('simpledialog'); pre = `resposta = simpledialog.${numero ? 'askfloat' : 'askstring'}(${t}, ${p}, parent=self)`; cond = 'resposta is not None'; }
          else { importa.add('QInputDialog'); pre = numero ? `resposta, ok = QInputDialog.getDouble(self, ${t}, ${p}, 0, -1e9, 1e9, 2)` : `resposta, ok = QInputDialog.getText(self, ${t}, ${p})`; cond = 'ok'; }
          guardar = numero || tv === 'numero' ? 'numero(resposta)' : 'resposta';
        } else if (no.fn === 'escolherArquivo') {
          const t = comoTexto(entradaTipada(no, 'titulo', cx));
          const salvar = no.valores.modo === 'salvar';
          if (tk) { importa.add('filedialog'); pre = `resposta = filedialog.${salvar ? 'asksaveasfilename' : 'askopenfilename'}(parent=self, title=${t})`; }
          else { importa.add('QFileDialog'); pre = `resposta, _ = QFileDialog.${salvar ? 'getSaveFileName' : 'getOpenFileName'}(self, ${t})`; }
          cond = 'resposta'; guardar = 'resposta';
        } else {
          if (tk) { importa.add('colorchooser'); pre = 'resposta = colorchooser.askcolor(parent=self)[1]'; cond = 'resposta'; guardar = 'resposta'; }
          else { importa.add('QColorDialog'); pre = 'resposta = QColorDialog.getColor(parent=self)'; cond = 'resposta.isValid()'; guardar = 'resposta.name()'; }
        }
        linhas.push(`${ind}${pre}`, `${ind}if ${cond}:`, `${i2}${ve} = ${guardar}`, ...ok);
        if (nao.length) linhas.push(`${ind}else:`, ...nao);
        break;
      }
      if (no.fn === 'repetir' || no.fn === 'paraCada') {
        const base = no.fn === 'repetir' ? 'volta' : 'item';
        const qtd = [...cx.lacos.values()].filter((x) => x.startsWith(base)).length;
        const nomeVar = base + (qtd ? qtd + 1 : '');
        const cx2 = { ...cx, lacos: new Map(cx.lacos).set(id, nomeVar) };
        const corpo = cadeia(`${id}:cada`, ind + '    ', new Set(visitados), cx2);
        linhas.push(no.fn === 'repetir' ? `${ind}for ${nomeVar} in range(1, ${comoInteiro(entradaTipada(no, 'vezes', cx))} + 1):` : `${ind}for ${nomeVar} in ${valor(no, 'lista', cx)}:`, ...ou(corpo, ind));
        f = fioDe(`${id}:depois`);
        continue;
      }
      if (no.fn === 'esperar') {
        const nome = `_fluxo_espera_${id}`;
        if (tk) linhas.push(`${ind}self.after(${ms(valor(no, 'segundos', cx))}, self.${nome})`);
        else { importa.add('timer'); linhas.push(`${ind}QTimer.singleShot(${ms(valor(no, 'segundos', cx))}, self.${nome})`); }
        criarMetodo(nome, `${id}:depois`, `Continua depois de “Esperar segundos” (editor de Funções).`);
        break;
      }
      if (no.fn === 'aCada') {
        const nome = `_fluxo_repete_${id}`;
        importa.add('repetir');
        if (!tk) importa.add('timer');
        const s = valor(no, 'segundos', cx);
        linhas.push(`${ind}self.repetir(${py(id)}, ${ehLiteralNumero(s) ? s : num(s)}, self.${nome})`);
        criarMetodo(nome, `${id}:cada`, `Roda a cada ${ehLiteralNumero(s) ? s : 'X'} segundo(s) (editor de Funções).`);
        f = fioDe(`${id}:depois`);
        continue;
      }
      if (no.fn === 'parar') {
        if (cx.fechar && !tk) linhas.push(`${ind}evento.ignore()`);
        linhas.push(`${ind}return`);
        break;
      }
      linhas.push(...instrucao(no, ind, cx));
      f = fioDe(`${id}:depois`);
    }
    return linhas;
  }

  // ---------------------------------------------------------------- métodos dos eventos
  const metodos = [];
  const conexoes = new Map();
  let aoAbrir = null, aoFechar = null, fechaQt = false;
  const fontes = [['tela', 'aoAbrir'], ['tela', 'aoFechar']];
  for (const e of D.elementos) for (const [porta, tipo] of PORTAS_ELEMENTO[e.tipo] || []) if (tipo === 'exec') fontes.push([e.id, porta]);
  for (const [id, porta] of fontes) {
    const fechar = id === 'tela' && porta === 'aoFechar';
    const corpo = cadeia(`${id}:${porta}`, '        ', new Set(), { lacos: new Map(), fechar });
    if (!corpo.length) continue;
    const e = porId(id);
    if (fechar) {
      if (tk) {
        aoFechar = '_fluxo_ao_fechar';
        metodos.push('', '    def _fluxo_ao_fechar(self):', '        """Ao fechar a janela: feito no editor de Funções (“Parar aqui” cancela o fechamento)."""', ...corpo, '        self.destroy()');
      } else {
        fechaQt = true;
        metodos.push('', '    def closeEvent(self, evento):', '        """Ao fechar a janela: feito no editor de Funções (“Parar aqui” cancela o fechamento)."""', ...corpo, '        super().closeEvent(evento)');
      }
      continue;
    }
    const nome = id === 'tela' ? '_fluxo_ao_abrir' : `_fluxo_${e.nome}_${porta}`;
    const usuario = e && e[porta];
    const chamada = !usuario ? [] : ['aoClicar', 'aoEnter'].includes(porta) ? [`        self.${usuario}()`] : [`        self.${usuario}(*args)`];
    metodos.push('', `    def ${nome}(self, *args):`, `        """Feito no editor de Funções do Designer (refeito ao salvar)."""`, ...corpo, ...chamada);
    if (id === 'tela') aoAbrir = nome; else conexoes.set(`${id}:${porta}`, nome);
  }
  metodos.push(...extras);

  // ---------------------------------------------------------------- ajudantes que os blocos usam
  if (importa.has('telas')) {
    metodos.push('', '    def abrir_tela(self, classe, travar=False):', '        """Abre outra tela do projeto (editor de Funções)."""', '        tela = classe()');
    if (tk) metodos.push('        if travar:', '            tela.transient(self)', '            tela.grab_set()', '        return tela');
    else metodos.push('        if travar:', '            tela.setWindowModality(Qt.WindowModality.ApplicationModal)', '        if not hasattr(self, "_telas_abertas"):', '            self._telas_abertas = []', '        self._telas_abertas.append(tela)  # guarda para o Python não apagar a janela', '        tela.show()', '        return tela');
  }
  if (importa.has('repetir')) {
    metodos.push('', '    def repetir(self, nome, segundos, funcao):', '        """Roda a funcao a cada X segundos até parar_repeticao(nome)."""', '        self.parar_repeticao(nome)');
    if (tk) {
      metodos.push('        espera = max(1, round(segundos * 1000))', '', '        def passo():', '            self._repeticoes[nome] = self.after(espera, passo)', '            funcao()', '', '        self._repeticoes[nome] = self.after(espera, passo)',
        '', '    def parar_repeticao(self, nome):', '        if not hasattr(self, "_repeticoes"):', '            self._repeticoes = {}', '        marcador = self._repeticoes.pop(nome, None)', '        if marcador:', '            self.after_cancel(marcador)');
    } else {
      metodos.push('        cronometro = QTimer(self)', '        cronometro.timeout.connect(funcao)', '        cronometro.start(max(1, round(segundos * 1000)))', '        self._repeticoes[nome] = cronometro',
        '', '    def parar_repeticao(self, nome):', '        if not hasattr(self, "_repeticoes"):', '            self._repeticoes = {}', '        cronometro = self._repeticoes.pop(nome, None)', '        if cronometro:', '            cronometro.stop()');
    }
  }

  // variáveis desta tela (as compartilhadas ficam em ui/estado.py)
  const iniciar = (L.vars || []).filter((x) => !x.global).map((x) => `        self.var_${x.nome} = ${inicialPython(x)}`);
  if ((L.vars || []).some((x) => x.global)) importa.add('estado');
  const tudo = metodos.join('\n');
  const usaNumero = /\bnumero\(/.test(tudo);
  return { metodos, conexoes, aoAbrir, aoFechar, fechaQt, iniciar, importa, usaNumero, avisos };
}

export const FUNCAO_NUMERO = [
  'def numero(valor):',
  '    """Converte em número (aceita vírgula). Se não for número, vira 0."""',
  '    if isinstance(valor, bool):',
  '        return int(valor)',
  '    try:',
  '        n = float(str(valor).replace(",", "."))',
  '    except ValueError:',
  '        return 0',
  '    return int(n) if n.is_integer() else n',
];
