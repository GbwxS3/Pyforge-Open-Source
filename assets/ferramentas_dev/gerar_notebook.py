"""Gera assets/kit/treinar_pyforge_ia.ipynb (notebook para o Google Colab)."""
import json
from pathlib import Path

SAIDA = Path(__file__).resolve().parent.parent / "assets" / "kit" / "treinar_pyforge_ia.ipynb"
celulas = []


def md(texto):
    celulas.append({"cell_type": "markdown", "metadata": {}, "source": texto.strip("\n").splitlines(keepends=True)})


def code(texto):
    celulas.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": texto.strip("\n").splitlines(keepends=True)})


md("""
# 🔥 Treinar a PyForge IA

Este caderno ensina a PyForge IA com os exemplos do kit (os que já vêm prontos **e** os seus 👍).
No fim sai um arquivo `.gguf` que você coloca no PyForge.

**Antes de começar:** menu **Ambiente de execução › Alterar o tipo de ambiente de execução › GPU (T4)** e salve.

Depois é só clicar em ▶ em cada célula, **uma de cada vez, de cima para baixo**.
Leva uns 20 a 40 minutos no modelo pequeno.
""")

md("## 1. Instalar as ferramentas (uns 3 minutos)")
code("""
%%capture
!pip install -q unsloth
""")

md("## 2. Enviar o kit\nClique em ▶ e escolha o arquivo **`pyforge-kit-dados.zip`** que o PyForge criou.")
code("""
import zipfile
from google.colab import files

enviados = files.upload()
nome_zip = next(iter(enviados))
zipfile.ZipFile(nome_zip).extractall("kit")
print("Kit aberto:", sorted(__import__("os").listdir("kit")))
""")

md("""
## 3. Escolher o modelo base
- `unsloth/Qwen2.5-Coder-1.5B-Instruct`: **pequeno e rápido** (recomendado para começar; vira o modelo \"Leve\").
- `unsloth/Qwen2.5-Coder-7B-Instruct`: mais esperto, mas o treino demora bem mais.
- Também dá para tentar o Qwen3.5 4B (procure o nome exato em huggingface.co/unsloth).

`EPOCAS` é quantas vezes ela estuda os exemplos. 2 ou 3 é um bom número.
""")
code("""
MODELO_BASE = "unsloth/Qwen2.5-Coder-1.5B-Instruct"
EPOCAS = 2
TAMANHO_MAXIMO = 4096
NOME_FINAL = "PyForge-IA-treinada"
""")

md("## 4. Carregar o modelo")
code("""
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODELO_BASE,
    max_seq_length=TAMANHO_MAXIMO,
    load_in_4bit=True,
)
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)
print("Modelo carregado!")
""")

md("## 5. Preparar os exemplos")
code("""
import json
from pathlib import Path
from datasets import Dataset

prompt = Path("kit/prompt_sistema.md").read_text(encoding="utf-8")
conversas = []
for arquivo in ["kit/dataset_base.jsonl", "kit/meus_exemplos.jsonl"]:
    if not Path(arquivo).exists():
        continue
    for linha in Path(arquivo).read_text(encoding="utf-8").splitlines():
        if not linha.strip():
            continue
        msgs = json.loads(linha)["messages"]
        if msgs[0]["role"] == "system":
            msgs = [{"role": "system", "content": prompt + "\\n\\n" + msgs[0]["content"]}] + msgs[1:]
        else:
            msgs = [{"role": "system", "content": prompt}] + msgs
        conversas.append({"messages": msgs})

print(len(conversas), "conversas para treinar")
textos = [tokenizer.apply_chat_template(c["messages"], tokenize=False, add_generation_prompt=False) for c in conversas]
dados = Dataset.from_dict({"text": textos})
print(textos[0][:600])
""")

md("## 6. Treinar ☕\nEsta é a parte demorada. A linha `loss` deve ir diminuindo.")
code("""
import inspect
from trl import SFTConfig, SFTTrainer

opcoes = dict(
    dataset_text_field="text",
    max_seq_length=TAMANHO_MAXIMO,
    max_length=TAMANHO_MAXIMO,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    num_train_epochs=EPOCAS,
    learning_rate=2e-4,
    warmup_steps=5,
    logging_steps=5,
    optim="adamw_8bit",
    weight_decay=0.01,
    lr_scheduler_type="linear",
    seed=3407,
    output_dir="saida",
    report_to="none",
)
aceitos = inspect.signature(SFTConfig.__init__).parameters
config = SFTConfig(**{k: v for k, v in opcoes.items() if k in aceitos})

extra = {"processing_class": tokenizer} if "processing_class" in inspect.signature(SFTTrainer.__init__).parameters else {"tokenizer": tokenizer}
treinador = SFTTrainer(model=model, train_dataset=dados, args=config, **extra)

# Aprende só com as respostas (não com as perguntas). Se der erro, treina com tudo.
try:
    from unsloth.chat_templates import train_on_responses_only
    treinador = train_on_responses_only(treinador, instruction_part="<|im_start|>user\\n", response_part="<|im_start|>assistant\\n")
except Exception as erro:
    print("Treinando com o texto inteiro:", erro)

treinador.train()
""")

md("## 7. Testar")
code("""
FastLanguageModel.for_inference(model)
pergunta = "deu TypeError: can only concatenate str (not \\"int\\") to str"
mensagens = [{"role": "system", "content": prompt}, {"role": "user", "content": pergunta}]
entrada = tokenizer.apply_chat_template(mensagens, add_generation_prompt=True, return_tensors="pt").to("cuda")
saida = model.generate(input_ids=entrada, max_new_tokens=400, temperature=0.4, do_sample=True)
print(tokenizer.decode(saida[0][entrada.shape[1]:], skip_special_tokens=True))
""")

md("## 8. Gerar o arquivo `.gguf` e baixar (uns 5 a 10 minutos)")
code("""
import glob
import shutil

model.save_pretrained_gguf("gguf_saida", tokenizer, quantization_method="q4_k_m")
candidatos = [p for p in glob.glob("**/*.gguf", recursive=True) if "mmproj" not in p.lower()]
candidatos.sort(key=lambda p: Path(p).stat().st_mtime, reverse=True)
final = f"{NOME_FINAL}-Q4_K_M.gguf"
shutil.copy(candidatos[0], final)
print("Pronto:", final, round(Path(final).stat().st_size / 1e9, 2), "GB")
files.download(final)
""")

md("""
## 9. Colocar no PyForge
1. No PyForge, vá em **Configurações › IA** e clique em **Pasta dos modelos**.
2. Coloque ali o arquivo `.gguf` que baixou.
3. Volte em Configurações › IA: ele aparece em **Seus modelos**. Clique em **Usar este**.

Pronto! Continue dando 👍 e 👎 e, de tempos em tempos, treine de novo: cada rodada deixa ela um pouco melhor. 🚀
""")

nb = {"cells": celulas, "metadata": {"accelerator": "GPU", "colab": {"provenance": [], "gpuType": "T4"}, "kernelspec": {"display_name": "Python 3", "name": "python3"}, "language_info": {"name": "python"}}, "nbformat": 4, "nbformat_minor": 0}
SAIDA.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
print("notebook:", SAIDA)
