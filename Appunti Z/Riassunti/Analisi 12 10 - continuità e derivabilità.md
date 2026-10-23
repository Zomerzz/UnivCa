# Analisi matematica 12/10 – Continuità, teoremi e derivabilità

> **la dimostrazione di $\frac{\sin x}{x}$ sarà presente all'esame**
---
## <font color="#4bacc6">Funzione continua</font>
f è continua in $x_0$ se limite destro, limite sinistro e valore nel punto coincidono
$$\lim_{x \to x_{0}^{-}} f(x) = \lim_{x \to x_{0}^{+}} f(x) = f(x_{0})$$
$$\forall \varepsilon > 0 \ \exists \delta_{\varepsilon} > 0 : |f(x) - f(x_{0})| < \varepsilon \quad \forall x \in I(x_{0}, \delta_{\varepsilon})$$
> "non ci sono punti in cui la funzione non ha un valore o non esiste": si disegna senza staccare la penna
---
## <font color="#4bacc6">Punti di discontinuità</font>
**1ª specie (salto)**: limiti destro e sinistro finiti ma diversi
$$f(x) = \frac{|x|}{x} = \begin{cases} \frac{x}{x} = 1 & x > 0 \\ \frac{-x}{x} = -1 & x < 0 \end{cases}$$
**2ª specie**: almeno uno dei due limiti non esiste o è infinito
**3ª specie (eliminabile)**: i limiti esistono e sono uguali, ma diversi dal valore nel punto (o la funzione lì non è definita). Si "ripara" con una nuova funzione:
$$f(x) = \frac{\sin x}{x}, \ x \ne 0 \quad \longrightarrow \quad \tilde{f}(x) = \begin{cases} \frac{\sin x}{x} & x \ne 0 \\ 1 & x = 0 \end{cases}$$
> attenzione: nella lavagna per $x < 0$ c'è $\frac{-x}{x} = 1$, il risultato giusto è $-1$ (è proprio per questo che c'è il salto)
---
## <font color="#4bacc6">Esercizi: trovare k per la continuità</font>
$$f(x) = \begin{cases} 1 - x^{2} & x > 0 \\ x + 2k & x \le 0 \end{cases} \qquad f(0) = 2k, \quad \lim_{x \to 0^{+}} (1 - x^{2}) = 1 \ \Rightarrow \ 2k = 1, \ k = \frac{1}{2}$$
$$f(x) = \begin{cases} \frac{2\ln x}{x - 1} & x \ne 1 \\ k & x = 1 \end{cases} \qquad x - 1 = t: \ \lim_{t \to 0} \frac{2\ln(1+t)}{t} = 2 \ \Rightarrow \ k = 2$$
> si sostituisce dove si può, dove non si può si fa il limite: il valore nel punto deve essere uguale al limite
---
## <font color="#4bacc6">Proprietà delle funzioni continue</font>
- le funzioni elementari sono continue nel loro dominio
- somma, prodotto, quoziente (denominatore $\ne 0$) di continue sono continue
- la composizione di funzioni continue è continua: se g è continua in $x_0$ e f in $y_0 = g(x_0)$, allora $f(g(x))$ è continua in $x_0$
---
## <font color="#4bacc6">Teoremi</font>
**permanenza del segno**: se f è continua in $x_0$ e $f(x_0) \ne 0$, in un intorno di $x_0$ ha lo stesso segno di $f(x_0)$

**teorema degli zeri**: se f è continua in $[a,b]$ e $f(a) \cdot f(b) < 0$, esiste almeno un $c \in (a,b)$ con $f(c) = 0$
$$f(x) = x^{2} - 2x \ \text{in} \ [1,3]: \quad f(1) = -1, \quad f(3) = 9 - 6 = 3, \quad f(1) \cdot f(3) = -3 < 0$$
> NOTA BENE: dice solo "c'è uno zero?", non dove. Per trovarlo si risolve $f(x) = 0$

**valori intermedi**: f continua in $[a,b]$ assume tutti i valori tra $f(a)$ e $f(b)$

**Weierstrass**: f continua in $[a,b]$ chiuso e limitato ha massimo M e minimo m assoluti (e per i valori intermedi assume tutti i valori tra m e M)
$$f(x) = e^{x-1} = \frac{1}{e} \cdot e^{x} \ \text{in} \ [0,1]: \quad m = f(0) = \frac{1}{e}, \quad M = f(1) = 1$$
> attenzione: nella lavagna c'è $m = 0$, ma l'esponenziale non vale mai 0: essendo crescente, il minimo è nel primo estremo, $e^{-1}$

**criterio di invertibilità**: f continua e strettamente monotona in $[a,b]$ è invertibile in quell'intervallo
---
## <font color="#4bacc6">Rapporto incrementale</font>
coefficiente angolare della retta secante che passa per $(x_0, f(x_0))$ e $(x_0 + h, f(x_0 + h))$
$$\frac{\Delta f}{\Delta x} = \frac{f(x_{0} + h) - f(x_{0})}{(x_{0} + h) - x_{0}} = \tan \beta$$
> nel triangolo rettangolo: cateto verticale = cateto orizzontale $\cdot \tan \beta$
---
## <font color="#4bacc6">Derivabilità e punti di non derivabilità</font>
per essere derivabile una funzione DEVE essere continua, ma la continuità non basta
- **punto angoloso**: derivata destra e sinistra finite ma diverse (forma un angolo)
- **cuspide**: derivate destra e sinistra infinite di segno opposto (punta)
- **flesso a tangente verticale**: derivate destra e sinistra infinite dello stesso segno; ascendente se vanno a $+\infty$, discendente se a $-\infty$
> attenzione: nella lavagna cuspide e flesso hanno le definizioni scambiate ("stesso infinito" per la cuspide, "segno opposto" per il flesso). È il contrario: cuspide = segni opposti, flesso = stesso segno
