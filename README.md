# BetterPaste 📋✨

Utilitário desktop estilo **PowerToys** para Windows com design moderno inspirado no **Funil Comercial** e recursos avançados de **"Colar Especial"** com regras configuráveis, atalhos customizáveis e suporte a scripts em **JavaScript (Node.js)**, **Python** e **VBScript**.

---

## 🌟 O Que Há de Novo

1. **Colagem Direta Instantânea (Native Windows API)**:
   - Integração com um micro-helper nativo (`paste-helper.exe`, compilado em C# para Win32 API) que restaura o foco da janela original (`SetForegroundWindow`) e envia o `Ctrl+V` em **menos de 15ms** de forma 100% confiável.
2. **Ícone Oficial do App**:
   - Ícone personalizado em alta resolução (`assets/icon.ico`, `assets/icon.png`, `assets/icon.svg`) configurado para o instalador Windows, para a janela e para a bandeja do sistema (System Tray).
3. **Novo Design Inspirado no Funil Comercial**:
   - Tema luxuoso em Dark Navy e Índigo (`#0f1021`, `#171936`, `#6366f1`).
   - Glassmorphism com backdrop blur, bordas com glow sutil, tipografia nítida e preview lado a lado com tags "Original" e "Resultado".
4. **Atalhos Globais Totalmente Configuráveis**:
   - Gravador interativo de atalhos nas Configurações: clique e aperte a combinação desejada (ex: `Ctrl+Shift+V`, `Ctrl+Alt+V`, `Alt+V`, `F9`, etc.).
   - Atualização em tempo real do hook global e da dica no System Tray.

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado (versão 18+).
- Python (opcional, apenas para regras em Python).

### Instalação e Execução
```bash
cd c:\projs\BetterPaste
npm install
npm start
```

O aplicativo roda silenciosamente no **System Tray** (ao lado do relógio do Windows).

---

## ⌨️ Como Usar

1. Copie qualquer texto (`Ctrl+C`).
2. Pressione o atalho configurado (padrão: **`Ctrl + Shift + V`**).
3. A janela flutuante do **BetterPaste** surge imediatamente na posição do seu cursor:
   - **Busca em tempo real**: digite para filtrar regras instantaneamente.
   - **Navegação rápida**: setas `↑` e `↓`, tecla `Enter` para aplicar e colar direto, ou teclas numéricas de `1` a `9`.
   - **Preview ao vivo**: veja o "Antes" e o "Depois" do texto antes de confirmar.
4. Ao pressionar `Enter` ou clicar na regra, o BetterPaste fecha o popup, restaura o foco da janela em que você estava trabalhando e cola o valor transformado diretamente!

---

## 🛠️ Regras Nativas Incluídas (31 Regras)

- **Formatação**: Texto Puro, Remover Acentos, Só Alfanuméricos, Inverter Texto.
- **Espaços**: Remover Espaços Extras (trim e colapso de espaços), Remover Linhas em Branco.
- **Caixa de Texto**: MAIÚSCULAS, minúsculas, Primeira Maiúscula (Title Case), camelCase, snake_case, kebab-case.
- **Substituição de Delimitadores**: Vírgula ↔ Ponto-e-vírgula, Tab ↔ Vírgula, Vírgula ↔ Tab.
- **Números**: **Somente Números** (extração de dígitos para CPF/CNPJ/Telefone/CEP), Números BR → US (`1.000,50` → `1,000.50`), Números US → BR.
- **Linhas**: Adicionar Prefixo, Adicionar Sufixo, Dividir por Delimitador, Juntar Linhas, Ordenar Linhas A→Z / Z→A, Remover Duplicados.
- **Codificação**: URL Encode/Decode, Base64 Encode/Decode.
- **Avançado**: Regex Find & Replace configurável.

---

## 🧩 Scripts Customizados (JS, Python, VBScript)

Você pode criar regras customizadas digitando o código diretamente no editor integrado ou selecionando um arquivo existente no seu computador:
- **JavaScript**: A variável `text` está disponível e basta retornar o texto final:
  ```javascript
  return text.split('\n').map(l => l.trim()).join('\n');
  ```
- **Python**: Lê de `sys.stdin` e imprime em `sys.stdout`:
  ```python
  import sys
  text = sys.stdin.read()
  sys.stdout.write(text.upper())
  ```
- **VBScript**: Lê de `WScript.StdIn` e escreve em `WScript.StdOut`.

---

## 📦 Gerar o Instalador (.exe)

```bash
npm run build
```
O instalador `.exe` autônomo será gerado na pasta `dist/`.
