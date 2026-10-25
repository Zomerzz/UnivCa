# Analisi matematica 05/10 – Limiti di funzioni

## <font color="#4bacc6">Definizione di limite finito</font>
sia f definita in $A \subseteq \mathbb{R}$ e $x_0$ punto di accumulazione per A. Si dice che f ha limite $l \in \mathbb{R}$ per $x \to x_{0}$ se
$$\forall \varepsilon > 0 \ \exists \delta_{\varepsilon} > 0 : |f(x) - l| < \varepsilon \quad \forall x \in I(x_{0}, \delta_{\varepsilon}) \setminus \{x_{0}\}$$
cioè
$$l - \varepsilon < f(x) < l + \varepsilon \quad \text{quando} \quad x_{0} - \delta < x < x_{0} + \delta$$
> per quanto stretta scelgo la fascia attorno a $l$ (larga $\varepsilon$), trovo sempre un intorno di $x_0$ (largo $\delta$) in cui la funzione resta dentro la fascia. Il limite si può "sostituire" con un valore poco più grande o poco più piccolo, es. $1^{-} = 0{,}999\ldots$
---
## <font color="#4bacc6">Limite destro e sinistro</font>
$$l_{1} = \lim_{x \to x_{0}^{+}} f(x) \ \text{(da destra)} \qquad l_{2} = \lim_{x \to x_{0}^{-}} f(x) \ \text{(da sinistra)}$$
il limite esiste solo se $l_{1} = l_{2}$
---
## <font color="#4bacc6">Teorema di unicità del limite</font>
se il limite esiste, è unico
> esempio: $y = \frac{|x|}{x}$ vale $+1$ per $x > 0$ e $-1$ per $x < 0$, quindi in 0 limite destro e sinistro sono diversi e il limite non esiste (dominio $x \ne 0$)
---
## <font color="#4bacc6">Limite infinito</font>
f ha limite $+\infty$ per $x \to x_{0}$ se
$$\forall M > 0 \ \exists \delta_{M} > 0 : \forall x \in I(x_{0}, \delta_{M}) \Rightarrow f(x) > M$$
$$\lim_{x \to 0} \frac{1}{x^{2}} = +\infty$$
esempio: $f(x) = \frac{1}{x^{2} - 1}$ con dominio $x \ne \pm 1$
$$\lim_{x \to 1^{+}} \frac{1}{x^{2}-1} = \frac{1}{0^{+}} = +\infty$$
> asintoto verticale: dove il denominatore si annulla
---
## <font color="#4bacc6">Limite all'infinito e asintoto orizzontale</font>
$$\lim_{x \to \pm\infty} \frac{2x-1}{x+2} = \lim_{x \to \pm\infty} \frac{x\left(2 - \frac{1}{x}\right)}{x\left(1 + \frac{2}{x}\right)} = \frac{2 - 0}{1 + 0} = 2$$
quindi $y = 2$ è **asintoto orizzontale**
> si raccoglie la x di grado massimo sopra e sotto, le frazioni con x al denominatore vanno a 0
---
## <font color="#4bacc6">Algebra dei limiti</font>
se $\lim f = l_{1}$ e $\lim g = l_{2}$:
$$\lim_{x \to x_{0}} [f(x) \pm g(x)] = l_{1} \pm l_{2}$$
$$a \pm \infty = \pm \infty \qquad +\infty + \infty = +\infty \qquad -\infty - \infty = -\infty$$
$$a > 0: \ a \cdot (\pm\infty) = \pm\infty \qquad b < 0: \ b \cdot (\pm\infty) = \mp\infty$$
$$(+\infty)(+\infty) = +\infty \qquad (+\infty)(-\infty) = -\infty \qquad \frac{a}{\infty} = 0 \qquad \frac{a}{0} = \infty \ (a \ne 0)$$
> attenzione: nella lavagna c'è $+\infty \cdot -\infty = +\infty$, il risultato giusto è $-\infty$ (regola dei segni)
---
## <font color="#4bacc6">Forme indeterminate</font>
$$\frac{0}{0}, \quad \frac{\infty}{\infty}, \quad 0 \cdot \infty, \quad +\infty - \infty, \quad 0^{0}, \quad 1^{\infty}, \quad \infty^{0}$$
> in questi casi il risultato non si può dire subito: bisogna manipolare il limite (raccogliere, scomporre, limiti notevoli)
