# Kit de treino da PyForge IA

Com este kit você ensina a PyForge IA usando um computador com placa de vídeo emprestado pelo Google (o **Google Colab**). Não precisa instalar nada no seu PC.

## O que tem aqui
- **pyforge-kit-dados.zip**: os exemplos para ela estudar.
  - `dataset_base.jsonl`: centenas de exemplos prontos (conceitos, erros, uso do PyForge, pedidos de código).
  - `meus_exemplos.jsonl`: as respostas que **você** marcou com 👍 no PyForge.
  - `prompt_sistema.md`: a "personalidade" da PyForge IA.
- **treinar_pyforge_ia.ipynb**: o caderno do Colab que faz o treino.

## Passo a passo
1. Entre em **colab.research.google.com** com sua conta Google.
2. Clique em **Arquivo › Fazer upload de notebook** e escolha `treinar_pyforge_ia.ipynb`.
3. No menu, **Ambiente de execução › Alterar o tipo de ambiente de execução › GPU (T4)** › Salvar.
4. Clique em ▶ em cada célula, de cima para baixo. Na célula 2, envie o `pyforge-kit-dados.zip`.
5. No fim, o Colab baixa um arquivo como `PyForge-IA-treinada-Q4_K_M.gguf`.
6. No PyForge: **Configurações › IA › Pasta dos modelos**, coloque o arquivo lá e clique em **Usar este** em "Seus modelos".

## Dicas
- O Colab grátis tem limite de uso por dia. Se cair no meio, é só rodar de novo.
- Comece com o modelo pequeno (1.5B). Quando estiver tudo certo, tente o maior.
- Quanto mais 👍 você der em respostas boas (de qualquer IA, inclusive do Claude), melhor fica o próximo treino.
- Treinar melhora o **jeito** dela (português, calma, formato do PyForge). A inteligência geral depende do tamanho do modelo base.
- Os exemplos ficam só no seu computador e nesta pasta. Só vão para o Google quando você mesmo envia o .zip no Colab.
