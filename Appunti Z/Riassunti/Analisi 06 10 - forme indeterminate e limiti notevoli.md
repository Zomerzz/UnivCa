# Analisi matematica 06/10 – Forme indeterminate e primi limiti notevoli

## <font color="#4bacc6">Metodo generale</font>
primo step: si sostituisce a x il valore a cui tende. Se si ottiene una forma indeterminata:
- **$\frac{0}{0}$ con polinomi**: si scompongono numeratore e denominatore, il fattore $(x - x_0)$ si semplifica
- **con le radici**: si moltiplica per il "coniugato" (stessa espressione con il segno opposto)
- **$\frac{\infty}{\infty}$**: si raccoglie la x di grado massimo sopra e sotto
---
## <font color="#4bacc6">Scomposizione (0/0)</font>
$$\lim_{x \to 2} \frac{x^{2} - 4}{x^{2} - 3x + 2} = \lim_{x \to 2} \frac{(x-2)(x+2)}{(x-2)(x-1)} = \frac{4}{1} = 4$$
> le radici del denominatore ($x = \frac{3 \pm 1}{2} = 2, \ 1$) diventano i fattori $(x-2)(x-1)$: nel caso 0/0 il fattore $(x - x_0)$ c'è sempre sia sopra che sotto
---
## <font color="#4bacc6">Razionalizzazione (coniugato)</font>
$$\lim_{x \to 0} \frac{\sqrt{x+1} - 1}{x} = \lim_{x \to 0} \frac{(\sqrt{x+1}-1)(\sqrt{x+1}+1)}{x(\sqrt{x+1}+1)} = \lim_{x \to 0} \frac{x}{x(\sqrt{x+1}+1)} = \frac{1}{2}$$
$$\lim_{x \to 0} \frac{\sqrt{x+4} - 2}{\sqrt{x+9} - 3} = \lim_{x \to 0} \frac{x}{\sqrt{x+4}+2} \cdot \frac{\sqrt{x+9}+3}{x} = \frac{6}{4} = \frac{3}{2}$$
$$\lim_{x \to +\infty} \left(\sqrt{x^{2}+1} - x\right) = \lim_{x \to +\infty} \frac{1}{\sqrt{x^{2}+1} + x} = 0$$
> $(a - b)(a + b) = a^{2} - b^{2}$: il coniugato serve a far sparire la radice
---
## <font color="#4bacc6">Raccoglimento (∞/∞)</font>
$$\lim_{x \to +\infty} \frac{x^{2} - 2x + 3}{x^{2} + 2} = \lim_{x \to +\infty} \frac{x^{2}\left(1 - \frac{2}{x} + \frac{3}{x^{2}}\right)}{x^{2}\left(1 + \frac{2}{x^{2}}\right)} = 1$$
$$\lim_{x \to +\infty} \frac{x^{2} - 2x + 3}{2x + 2} = \frac{\infty}{2} = +\infty \qquad \lim_{x \to +\infty} \frac{x - 2}{2x^{2} + 2} = 0$$
$$\lim_{x \to +\infty} \frac{\sqrt{4x^{2}+1}}{x - 3} = \frac{\sqrt{4x^{2}}}{x} = \frac{|2x|}{x} = 2$$
$$\lim_{x \to +\infty} (x^{3} - 5x^{2} + 1) = \lim x^{3}\left(1 - \frac{5}{x} + \frac{1}{x^{3}}\right) = +\infty$$
> regola veloce SOLO per $x \to \infty$: stesso grado → rapporto dei coefficienti di grado massimo; grado sopra maggiore → $\infty$; grado sotto maggiore → $0$
---
## <font color="#4bacc6">Teorema del confronto (dei carabinieri)</font>
se $f_{1}(x) \le f(x) \le f_{2}(x)$ per ogni $x \in I \setminus \{x_0\}$ e $f_1$, $f_2$ hanno lo stesso limite $l$, allora anche $\lim f(x) = l$
---
## <font color="#4bacc6">Limite di funzioni composte</font>
siano $g : A \to B$ e $f : B \to \mathbb{R}$, con
$$\lim_{x \to x_{0}} g(x) = y_{0} \quad \text{e} \quad \lim_{y \to y_{0}} f(y) = l \ \Rightarrow \ \lim_{x \to x_{0}} f(g(x)) = l$$
---
## <font color="#4bacc6">Limiti notevoli</font>
$$\lim_{x \to 0} \frac{\sin x}{x} = 1 \qquad \lim_{x \to 0} \frac{\tan x}{x} = 1 \qquad \lim_{x \to \infty} \left(1 + \frac{1}{x}\right)^{x} = e$$
> il primo si dimostra con le aree sulla circonferenza goniometrica: $\frac{\sin x}{2} < \frac{x}{2} < \frac{\tan x}{2}$, poi si applica il confronto
---
> attenzione: nella lavagna c'è $1^{\pm\infty} = 1$, ma $1^{\infty}$ è una **forma indeterminata** (proprio il limite di $e$ lo dimostra: $(1 + \frac{1}{x})^{x} \to e$, non 1)
