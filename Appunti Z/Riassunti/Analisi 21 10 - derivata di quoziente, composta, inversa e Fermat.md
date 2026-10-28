# Analisi matematica 21/10 – Dimostrazioni sulle derivate, retta tangente, Fermat

## <font color="#4bacc6">Dim. derivata del quoziente</font>
$$D\left[\frac{f(x)}{g(x)}\right] = \frac{f'(x)g(x) - f(x)g'(x)}{[g(x)]^{2}}$$
$$\lim_{h \to 0} \frac{\frac{f(x+h)}{g(x+h)} - \frac{f(x)}{g(x)}}{h} = \lim_{h \to 0} \frac{f(x+h)g(x) - f(x)g(x+h)}{g(x+h)\,g(x)\,h}$$
si aggiunge e toglie $f(x)g(x)$ al numeratore:
$$= \lim_{h \to 0} \frac{\frac{f(x+h) - f(x)}{h}\,g(x) - f(x)\,\frac{g(x+h) - g(x)}{h}}{g(x+h)\,g(x)} = \frac{f'(x)g(x) - f(x)g'(x)}{g(x)^{2}}$$
> il trucco "aggiungo e tolgo la stessa cosa" fa comparire i due rapporti incrementali
---
## <font color="#4bacc6">Teorema: derivata della funzione composta</font>
$$[f(g(x))]' = f'(g(x)) \cdot g'(x)$$
**dim.** si moltiplica e divide per $g(x+h) - g(x)$ e si pone $k = g(x+h) - g(x)$ (se $h \to 0$ anche $k \to 0$):
$$\lim_{h \to 0} \frac{f(g(x+h)) - f(g(x))}{g(x+h) - g(x)} \cdot \frac{g(x+h) - g(x)}{h} = \lim_{k \to 0} \frac{f(g(x)+k) - f(g(x))}{k} \cdot \lim_{h \to 0} \frac{g(x+h) - g(x)}{h} = f'(g(x)) \cdot g'(x)$$
---
## <font color="#4bacc6">Teorema: derivata della funzione inversa</font>
$$[f^{-1}]'(y_{0}) = \frac{1}{f'(x_{0})} \qquad y_{0} = f(x_{0})$$
> il rapporto incrementale dell'inversa è il reciproco di quello di f: si scambiano i ruoli di $h$ e $k$ sui due assi
**arcoseno** ($x \in [-\frac{\pi}{2}, \frac{\pi}{2}]$, dove $\cos x \ge 0$)
$$x = \arcsin y \iff y = \sin x \qquad D[\arcsin y] = \frac{1}{\cos x} = \frac{1}{\sqrt{1 - \sin^{2} x}} = \frac{1}{\sqrt{1 - y^{2}}}$$
> il segno è + perché nell'intervallo scelto il coseno è positivo
**esponenziale** (inversa del logaritmo)
$$x = e^{y} \iff y = \ln x \qquad D[e^{y}] = \frac{1}{(\ln x)'} = \frac{1}{\frac{1}{x}} = x = e^{y}$$
**arcotangente**
$$x = \arctan y \iff y = \tan x \qquad D[\arctan y] = \frac{1}{(\tan x)'} = \frac{1}{1 + \tan^{2} x} = \frac{1}{1 + y^{2}}$$
> attenzione: in cima alla lavagna c'è $D[\arctan y] = \frac{1}{1 - y^{2}}$, il risultato giusto (quello che hai ricavato sotto) è $\frac{1}{1 + y^{2}}$
---
## <font color="#4bacc6">Equazione della retta tangente</font>
$$y - y_{0} = m(x - x_{0}) \qquad m = f'(x_{0}) = \tan \alpha$$
esempio: $f(x) = x^{2} - 2x + 3$ in $x_{0} = 0$
$$y_{0} = f(0) = 3 \qquad m = f'(0) = 2 \cdot 0 - 2 = -2 \qquad \Rightarrow \quad y = -2x + 3$$
---
## <font color="#4bacc6">Esercizio: continuità e derivabilità con parametri</font>
$$f(x) = \begin{cases} ax^{2} + 2ax + 2b & x \le 1 \\ 2x + a & x > 1 \end{cases}$$
**continuità** in 1: $a + 2a + 2b = 2 + a \Rightarrow 2a + 2b = 2 \Rightarrow a + b = 1$
**derivabilità** in 1: $f'(1^{-}) = 2a \cdot 1 + 2a = 4a$, $f'(1^{+}) = 2$
$$4a = 2 \Rightarrow a = \frac{1}{2}, \quad b = \frac{1}{2}$$
> prima si impone che i due pezzi si "attacchino" (continuità), poi che abbiano la stessa pendenza (derivabilità)
---
## <font color="#4bacc6">Massimi e minimi</font>
- **massimo assoluto**: il valore più grande di f su tutto l'intervallo
- **massimo relativo**: il valore più grande in un intorno del punto
- $f'(x_{0}) = 0$ → **punto stazionario**
---
## <font color="#4bacc6">Teorema di Fermat</font>
sia f definita in $[a,b]$ e derivabile in $x_0$ interno. Se $x_0$ è un punto di estremo locale, allora $f'(x_{0}) = 0$
**dim. (caso massimo)**: $f(x_{0} \pm h) \le f(x_{0})$, quindi
$$\frac{f(x_{0}+h) - f(x_{0})}{h} \le 0 \ (h > 0) \qquad \frac{f(x_{0}-h) - f(x_{0})}{-h} \ge 0$$
derivata destra $\le 0$ e sinistra $\ge 0$, ma sono uguali → $f'(x_0) = 0$
> Fermat = un massimo interno ha derivata 0 (tangente orizzontale)
